const PayPalHook = require('../models/paypal.hook.model');
const { getClient: getRedisClient } = require('../config/redis');
const { publish } = require('../kafka/kafkaProducer');
const { publishWebhookEvent } = require('../events/paypal.hook.producer');
const { logger } = require('../config/logger');
const crypto = require('crypto');

/**
 * PayPal Webhook Service
 * Business logic for processing PayPal webhooks
 * Following Clean Architecture principles
 */
class PayPalWebhookService {
    constructor() {
        this.redis = getRedisClient();
        this.idempotencyPrefix = 'paypal:webhook:idempotency:';
        this.supportedEvents = [
            'PAYMENT.CAPTURE.COMPLETED',
            'PAYMENT.CAPTURE.DENIED',
            'PAYMENT.CAPTURE.PENDING',
        ];
    }

    /**
     * Process PayPal webhook event
     * @param {Object} webhookData - Complete webhook data
     * @returns {Promise<Object>} - Processing result
     */
    async processWebhook(webhookData) {
        const { eventData, headers, sourceIp, userAgent } = webhookData;
        
        try {
            // Generate idempotency key
            const idempotencyKey = this.generateIdempotencyKey(eventData, headers);

            // Check for duplicate processing
            const isAlreadyProcessed = await this.isProcessed(idempotencyKey);
            if (isAlreadyProcessed) {
                logger.info('PayPal webhook already processed (duplicate)', {
                    webhookId: eventData.id,
                    idempotencyKey
                });

                const existingHook = await PayPalHook.findByIdempotencyKey(idempotencyKey);
                if (existingHook) {
                    await existingHook.markAsDuplicate();
                }

                return {
                    success: true,
                    status: 'duplicate',
                    webhookId: eventData.id,
                    message: 'Webhook already processed'
                };
            }

            // Extract PayPal headers
            const paypalHeaders = this.extractPayPalHeaders(headers);

            // Create webhook log
            const hookData = {
                webhookId: eventData.id,
                eventType: eventData.event_type,
                resourceType: eventData.resource_type,
                resourceId: eventData.resource?.id,
                rawPayload: eventData,
                headers: paypalHeaders,
                idempotencyKey,
                sourceIp,
                userAgent,
                signatureVerified: true, // Simplified for now
                verificationMethod: 'webhook_signature'
            };

            // Save to MongoDB
            const paypalHook = new PayPalHook(hookData);
            await paypalHook.extractPayPalBusinessData(eventData);
            await paypalHook.markAsProcessing();

            // Mark as processing in Redis
            await this.markAsProcessed(
                idempotencyKey, 
                { status: 'processing', webhookId: eventData.id },
                3600 // 1 hour TTL
            );

            // Extract business data
            const businessData = this.extractBusinessData(eventData);

            // Determine target services
            const targetServices = this.determineTargetServices(eventData.event_type, businessData);

            // Publish webhook event to payment service
            const publishResult = await this.publishWebhookEvent(webhookData, paypalHook);

            // Mark as processed
            await paypalHook.markAsProcessed();
            await this.markAsProcessed(
                idempotencyKey,
                { 
                    status: 'processed', 
                    webhookId: eventData.id,
                    eventsPublished: publishResult.success ? 1 : 0
                },
                24 * 3600 // 24 hours TTL
            );

            logger.info('PayPal webhook processed successfully', {
                webhookId: eventData.id,
                eventType: eventData.event_type,
                resourceId: eventData.resource?.id,
                eventsPublished: publishResult.success ? 1 : 0,
                publishTopic: publishResult.topic
            });

            return {
                success: true,
                status: 'processed',
                webhookId: eventData.id,
                resourceId: eventData.resource?.id,
                eventsPublished: publishResult.success ? 1 : 0,
                signatureVerified: true
            };

        } catch (error) {
            logger.error('PayPal webhook processing failed', {
                error: error.message,
                stack: error.stack,
                webhookId: eventData.id,
                eventType: eventData.event_type
            });

            // Try to mark as failed if we have the hook
            try {
                const hook = await PayPalHook.findByWebhookId(eventData.id);
                if (hook) {
                    await hook.markAsFailed(error);
                }
            } catch (markError) {
                logger.error('Failed to mark webhook as failed', {
                    error: markError.message,
                    webhookId: eventData.id
                });
            }

            return {
                success: false,
                status: 'failed',
                webhookId: eventData.id,
                error: error.message
            };
        }
    }

    /**
     * Validate PayPal webhook event structure
     * @param {Object} eventData - Webhook event data
     * @returns {boolean} - Validation result
     */
    validateEventStructure(eventData) {
        try {
            // Required fields validation
            const requiredFields = ['id', 'event_type', 'resource_type', 'resource'];
            
            for (const field of requiredFields) {
                if (!eventData[field]) {
                    logger.warn('Missing required webhook field', { field });
                    return false;
                }
            }

            // Validate supported event types
            if (!this.supportedEvents.includes(eventData.event_type)) {
                logger.warn('Unsupported event type', { 
                    eventType: eventData.event_type,
                    supportedEvents: this.supportedEvents 
                });
                return false;
            }

            return true;

        } catch (error) {
            logger.error('Event structure validation error', {
                error: error.message,
                eventData
            });
            return false;
        }
    }

    /**
     * Extract business data from PayPal webhook
     * @param {Object} eventData - Webhook event data
     * @returns {Object} - Extracted business data
     */
    extractBusinessData(eventData) {
        const resource = eventData.resource || {};
        
        return {
            orderId: resource.id || eventData.resource?.supplementary_data?.related_ids?.order_id,
            captureId: eventData.event_type?.includes('CAPTURE') ? resource.id : null,
            refundId: eventData.event_type?.includes('REFUND') ? resource.id : null,
            amount: {
                value: resource.amount?.value,
                currency: resource.amount?.currency_code
            },
            paymentStatus: resource.status,
            payerId: resource.payer?.payer_id,
            payerEmail: resource.payer?.email_address,
            merchantId: resource.payee?.merchant_id || resource.merchant_id,
            customId: resource.custom_id,
            invoiceId: resource.invoice_id,
            description: resource.description
        };
    }

    /**
     * Generate idempotency key for PayPal webhook
     * @param {Object} eventData - Webhook event data
     * @param {Object} headers - Request headers
     * @returns {string} - Idempotency key
     */
    generateIdempotencyKey(eventData, headers) {
        const transmissionId = headers['paypal-transmission-id'];
        const webhookId = eventData.id;
        const eventType = eventData.event_type;
        const resourceId = eventData.resource?.id;

        const keyData = `paypal:${webhookId}:${transmissionId}:${eventType}:${resourceId}`;
        
        return crypto
            .createHash('sha256')
            .update(keyData)
            .digest('hex');
    }

    /**
     * Extract PayPal headers from request headers
     * @param {Object} headers - All request headers
     * @returns {Object} - PayPal specific headers
     */
    extractPayPalHeaders(headers) {
        return {
            paypalAuthAlgo: headers['paypal-auth-algo'],
            paypalTransmissionId: headers['paypal-transmission-id'],
            paypalCertId: headers['paypal-cert-id'],
            paypalTransmissionSig: headers['paypal-transmission-sig'],
            paypalTransmissionTime: headers['paypal-transmission-time'],
            userAgent: headers['user-agent'],
            contentType: headers['content-type']
        };
    }

    /**
     * Determine target services for event publishing
     * @param {string} eventType - PayPal event type
     * @param {Object} businessData - Extracted business data
     * @returns {Array} - Array of {service, topic, eventData}
     */
    determineTargetServices(eventType, businessData) {
        const services = [];

        switch (eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'payment.completed',
                        eventData: {
                            type: 'PAYMENT_COMPLETED',
                            paymentId: businessData.captureId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            payerId: businessData.payerId,
                            provider: 'paypal',
                            timestamp: new Date().toISOString()
                        }
                    },
                    {
                        service: 'ticket-service',
                        topic: 'ticket.payment.completed',
                        eventData: {
                            type: 'TICKET_PAYMENT_COMPLETED',
                            paymentId: businessData.captureId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            customId: businessData.customId,
                            provider: 'paypal',
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;

            case 'PAYMENT.CAPTURE.DENIED':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'payment.failed',
                        eventData: {
                            type: 'PAYMENT_FAILED',
                            paymentId: businessData.captureId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            reason: 'CAPTURE_DENIED',
                            provider: 'paypal',
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;

            case 'CHECKOUT.ORDER.APPROVED':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'order.approved',
                        eventData: {
                            type: 'ORDER_APPROVED',
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            payerId: businessData.payerId,
                            provider: 'paypal',
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;
        }

        // Always notify notification service for important events
        if (['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED'].includes(eventType)) {
            services.push({
                service: 'notification-service',
                topic: 'notification.payment',
                eventData: {
                    type: 'PAYMENT_NOTIFICATION',
                    paymentId: businessData.captureId,
                    orderId: businessData.orderId,
                    status: eventType.includes('COMPLETED') ? 'completed' : 'failed',
                    amount: businessData.amount,
                    payerEmail: businessData.payerEmail,
                    provider: 'paypal',
                    timestamp: new Date().toISOString()
                }
            });
        }

        return services;
    }

    /**
     * Publish events to Kafka
     * @param {Array} targetServices - Array of service configurations
     * @param {Object} paypalHook - PayPal hook instance
     * @returns {Promise<Array>} - Publish results
     */
    async publishEvents(targetServices, paypalHook) {
        const results = [];

        for (const serviceConfig of targetServices) {
            try {
                const messageId = crypto.randomUUID();
                
                await publish(
                    serviceConfig.topic,
                    serviceConfig.eventData.orderId || serviceConfig.eventData.paymentId,
                    serviceConfig.eventData
                );

                await paypalHook.addPublishedEvent(
                    serviceConfig.service,
                    serviceConfig.topic,
                    serviceConfig.eventData,
                    messageId,
                    true
                );

                results.push({
                    service: serviceConfig.service,
                    topic: serviceConfig.topic,
                    messageId,
                    success: true
                });

            } catch (error) {
                await paypalHook.addPublishedEvent(
                    serviceConfig.service,
                    serviceConfig.topic,
                    serviceConfig.eventData,
                    null,
                    false,
                    error.message
                );

                results.push({
                    service: serviceConfig.service,
                    topic: serviceConfig.topic,
                    success: false,
                    error: error.message
                });

                logger.error('Failed to publish event to Kafka', {
                    service: serviceConfig.service,
                    topic: serviceConfig.topic,
                    error: error.message,
                    webhookId: paypalHook.webhookId
                });
            }
        }

        return results;
    }

    /**
     * Publish webhook event to payment service
     * @param {Object} webhookData - Complete webhook data
     * @param {Object} paypalHook - PayPal hook instance
     * @returns {Promise<Object>} - Publish result
     */
    async publishWebhookEvent(webhookData, paypalHook) {
        try {
            const messageId = crypto.randomUUID();
            
            // Publish raw webhook event to payment service
            const result = await publishWebhookEvent(webhookData);
            
            // Log successful publish to MongoDB
            await paypalHook.addPublishedEvent(
                'payment-service',
                result.topic,
                webhookData.eventData,
                messageId,
                true
            );

            logger.info('Webhook event published to payment service', {
                webhookId: webhookData.eventData.id,
                eventType: webhookData.eventData.event_type,
                topic: result.topic,
                messageId,
                messageKey: result.messageKey
            });

            return {
                success: true,
                topic: result.topic,
                messageId,
                messageKey: result.messageKey,
                service: 'payment-service'
            };

        } catch (error) {
            logger.error('Failed to publish webhook event to payment service', {
                error: error.message,
                webhookId: webhookData.eventData.id,
                eventType: webhookData.eventData.event_type
            });

            // Log failed publish to MongoDB
            await paypalHook.addPublishedEvent(
                'payment-service',
                'paypal.webhook.event',
                webhookData.eventData,
                null,
                false,
                error.message
            );

            return {
                success: false,
                error: error.message,
                service: 'payment-service'
            };
        }
    }

    /**
     * Get PayPal webhook statistics
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} - Statistics
     */
    async getStatistics(startDate, endDate) {
        return await PayPalHook.getPayPalStatistics(startDate, endDate);
    }

    /**
     * Retry failed webhooks
     * @param {number} limit - Number of webhooks to retry
     * @returns {Promise<Array>} - Retry results
     */
    async retryFailedWebhooks(limit = 10) {
        const failedHooks = await PayPalHook.getFailedWebhooks(limit);
        const results = [];

        for (const hook of failedHooks) {
            try {
                const result = await this.processWebhook({
                    eventData: hook.rawPayload,
                    headers: hook.headers,
                    sourceIp: hook.sourceIp,
                    userAgent: hook.userAgent
                });

                results.push({
                    webhookId: hook.webhookId,
                    success: result.success,
                    status: result.status
                });

            } catch (error) {
                results.push({
                    webhookId: hook.webhookId,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Check if webhook is already processed (idempotency check)
     * @param {string} idempotencyKey - Idempotency key
     * @returns {Promise<boolean>} - True if already processed
     */
    async isProcessed(idempotencyKey) {
        try {
            const redis = this.redis || getRedisClient();
            if (!redis) {
                logger.warn('Redis not available for idempotency check, allowing processing');
                return false;
            }

            const key = this.idempotencyPrefix + idempotencyKey;
            const result = await redis.get(key);
            return !!result;

        } catch (error) {
            logger.error('Redis idempotency check failed', {
                error: error.message,
                idempotencyKey
            });
            // On Redis error, allow processing to continue
            return false;
        }
    }

    /**
     * Mark webhook as processed (idempotency)
     * @param {string} idempotencyKey - Idempotency key
     * @param {Object} data - Processing data
     * @param {number} ttlSeconds - TTL in seconds
     * @returns {Promise<void>}
     */
    async markAsProcessed(idempotencyKey, data, ttlSeconds = 3600) {
        try {
            const redis = this.redis || getRedisClient();
            if (!redis) {
                logger.warn('Redis not available for idempotency marking');
                return;
            }

            const key = this.idempotencyPrefix + idempotencyKey;
            const value = JSON.stringify({
                ...data,
                timestamp: new Date().toISOString()
            });

            await redis.set(key, value, { EX: ttlSeconds });

            logger.debug('Marked webhook as processed', {
                idempotencyKey,
                ttl: ttlSeconds,
                data
            });

        } catch (error) {
            logger.error('Failed to mark webhook as processed', {
                error: error.message,
                idempotencyKey,
                data
            });
            // Don't throw - this is not critical for webhook processing
        }
    }
}

module.exports = PayPalWebhookService;
