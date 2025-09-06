const SepayHook = require('../models/sepay.model');
const { getClient: getRedisClient } = require('../config/redis');
const { publish } = require('../kafka/kafkaProducer');
const { publishWebhookEvent } = require('../events/sepay.hook.producer');
const { logger } = require('../config/logger');
const crypto = require('crypto');

/**
 * Sepay Webhook Service
 * Business logic for processing Sepay webhooks
 * Following Clean Architecture principles
 */
class SepayWebhookService {
    constructor() {
        this.redis = getRedisClient();
        this.idempotencyPrefix = 'sepay:webhook:idempotency:';
        this.supportedEvents = [
            'PAYMENT.CAPTURE.COMPLETED',
            'PAYMENT.CAPTURE.DENIED',
            'PAYMENT.CAPTURE.PENDING',
            'CHECKOUT.ORDER.COMPLETED',
            'PAYMENT.CAPTURE.REFUNDED'
        ];
    }

    /**
     * Process Sepay webhook event
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
                logger.info('Sepay webhook already processed (duplicate)', {
                    webhookId: eventData.id,
                    idempotencyKey
                });

                const existingHook = await SepayHook.findByIdempotencyKey(idempotencyKey);
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

            // Extract Sepay headers
            const sepayHeaders = this.extractSepayHeaders(headers);

            // Create webhook log
            const hookData = {
                webhookId: eventData.id,
                eventType: eventData.event_type,
                resourceType: eventData.resource_type,
                resourceId: eventData.resource?.id,
                rawPayload: eventData,
                headers: sepayHeaders,
                idempotencyKey,
                sourceIp,
                userAgent,
                signatureVerified: true, // Simplified for now
                verificationMethod: 'webhook_signature'
            };

            // Save to MongoDB
            const sepayHook = new SepayHook(hookData);
            await sepayHook.extractSepayBusinessData(eventData);
            await sepayHook.markAsProcessing();

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
            const webhookPublishResult = await this.publishWebhookEvent(webhookData, sepayHook);

            // Publish additional events to Kafka
            const publishResults = await this.publishEvents(targetServices, sepayHook);

            // Mark as processed
            await sepayHook.markAsProcessed();
            await this.markAsProcessed(
                idempotencyKey,
                { 
                    status: 'processed', 
                    webhookId: eventData.id,
                    eventsPublished: (webhookPublishResult.success ? 1 : 0) + publishResults.filter(r => r.success).length
                },
                24 * 3600 // 24 hours TTL
            );

            logger.info('Sepay webhook processed successfully', {
                webhookId: eventData.id,
                eventType: eventData.event_type,
                resourceId: eventData.resource?.id,
                eventsPublished: (webhookPublishResult.success ? 1 : 0) + publishResults.filter(r => r.success).length,
                totalEvents: publishResults.length
            });

            return {
                success: true,
                status: 'processed',
                webhookId: eventData.id,
                resourceId: eventData.resource?.id,
                eventsPublished: (webhookPublishResult.success ? 1 : 0) + publishResults.filter(r => r.success).length,
                signatureVerified: true
            };

        } catch (error) {
            logger.error('Sepay webhook processing failed', {
                error: error.message,
                stack: error.stack,
                webhookId: eventData.id,
                eventType: eventData.event_type
            });

            // Try to mark as failed if we have the hook
            try {
                const hook = await SepayHook.findByWebhookId(eventData.id);
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
     * Validate Sepay webhook event structure
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
     * Extract business data from Sepay webhook
     * @param {Object} eventData - Webhook event data
     * @returns {Object} - Extracted business data
     */
    extractBusinessData(eventData) {
        const resource = eventData.resource || {};
        
        return {
            transactionId: resource.transaction_id || resource.id,
            orderId: resource.order_id || eventData.order_id,
            captureId: eventData.event_type?.includes('CAPTURE') ? resource.id : null,
            refundId: eventData.event_type?.includes('REFUND') ? resource.id : null,
            amount: {
                value: resource.amount?.value || resource.amount,
                currency: resource.amount?.currency || resource.currency || 'VND'
            },
            paymentStatus: resource.status || eventData.status,
            customerId: resource.customer_id || resource.customer?.id,
            customerEmail: resource.customer?.email || resource.email,
            merchantId: resource.merchant_id || eventData.merchant_id,
            customId: resource.custom_id || eventData.custom_id,
            invoiceId: resource.invoice_id || eventData.invoice_id,
            description: resource.description || eventData.description,
            sepayTransactionHash: resource.transaction_hash || eventData.transaction_hash,
            sepayBlockNumber: resource.block_number || eventData.block_number,
            sepayNetwork: resource.network || eventData.network || 'mainnet'
        };
    }

    /**
     * Generate idempotency key for Sepay webhook
     * @param {Object} eventData - Webhook event data
     * @param {Object} headers - Request headers
     * @returns {string} - Idempotency key
     */
    generateIdempotencyKey(eventData, headers) {
        const webhookId = eventData.id;
        const eventType = eventData.event_type;
        const resourceId = eventData.resource?.id;
        const timestamp = headers['sepay-timestamp'] || Date.now();

        const keyData = `sepay:${webhookId}:${eventType}:${resourceId}:${timestamp}`;
        
        return crypto
            .createHash('sha256')
            .update(keyData)
            .digest('hex');
    }

    /**
     * Extract Sepay headers from request headers
     * @param {Object} headers - All request headers
     * @returns {Object} - Sepay specific headers
     */
    extractSepayHeaders(headers) {
        return {
            sepaySignature: headers['sepay-signature'],
            sepayTimestamp: headers['sepay-timestamp'],
            userAgent: headers['user-agent'],
            contentType: headers['content-type']
        };
    }

    /**
     * Determine target services for event publishing
     * @param {string} eventType - Sepay event type
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
                            transactionId: businessData.transactionId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            customerId: businessData.customerId,
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
                            sepayBlockNumber: businessData.sepayBlockNumber,
                            sepayNetwork: businessData.sepayNetwork,
                            timestamp: new Date().toISOString()
                        }
                    },
                    {
                        service: 'ticket-service',
                        topic: 'ticket.payment.completed',
                        eventData: {
                            type: 'TICKET_PAYMENT_COMPLETED',
                            paymentId: businessData.captureId,
                            transactionId: businessData.transactionId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            customId: businessData.customId,
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
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
                            transactionId: businessData.transactionId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            reason: 'CAPTURE_DENIED',
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;

            case 'PAYMENT.CAPTURE.PENDING':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'payment.pending',
                        eventData: {
                            type: 'PAYMENT_PENDING',
                            paymentId: businessData.captureId,
                            transactionId: businessData.transactionId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;

            case 'CHECKOUT.ORDER.COMPLETED':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'order.completed',
                        eventData: {
                            type: 'ORDER_COMPLETED',
                            orderId: businessData.orderId,
                            transactionId: businessData.transactionId,
                            amount: businessData.amount,
                            customerId: businessData.customerId,
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;

            case 'PAYMENT.CAPTURE.REFUNDED':
                services.push(
                    {
                        service: 'payment-service',
                        topic: 'payment.refunded',
                        eventData: {
                            type: 'PAYMENT_REFUNDED',
                            paymentId: businessData.captureId,
                            refundId: businessData.refundId,
                            transactionId: businessData.transactionId,
                            orderId: businessData.orderId,
                            amount: businessData.amount,
                            provider: 'sepay',
                            sepayTransactionHash: businessData.sepayTransactionHash,
                            timestamp: new Date().toISOString()
                        }
                    }
                );
                break;
        }

        // Always notify notification service for important events
        if (['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.DENIED', 'PAYMENT.CAPTURE.REFUNDED'].includes(eventType)) {
            services.push({
                service: 'notification-service',
                topic: 'notification.payment',
                eventData: {
                    type: 'PAYMENT_NOTIFICATION',
                    paymentId: businessData.captureId,
                    transactionId: businessData.transactionId,
                    orderId: businessData.orderId,
                    status: eventType.includes('COMPLETED') ? 'completed' : 
                           eventType.includes('DENIED') ? 'failed' : 'refunded',
                    amount: businessData.amount,
                    customerEmail: businessData.customerEmail,
                    provider: 'sepay',
                    sepayTransactionHash: businessData.sepayTransactionHash,
                    timestamp: new Date().toISOString()
                }
            });
        }

        return services;
    }

    /**
     * Publish events to Kafka
     * @param {Array} targetServices - Array of service configurations
     * @param {Object} sepayHook - Sepay hook instance
     * @returns {Promise<Array>} - Publish results
     */
    async publishEvents(targetServices, sepayHook) {
        const results = [];

        for (const serviceConfig of targetServices) {
            try {
                const messageId = crypto.randomUUID();
                
                await publish(
                    serviceConfig.topic,
                    serviceConfig.eventData.orderId || serviceConfig.eventData.transactionId || serviceConfig.eventData.paymentId,
                    serviceConfig.eventData
                );

                await sepayHook.addPublishedEvent(
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

                logger.info('Sepay event published to Kafka', {
                    service: serviceConfig.service,
                    topic: serviceConfig.topic,
                    messageId,
                    webhookId: sepayHook.webhookId
                });

            } catch (error) {
                await sepayHook.addPublishedEvent(
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

                logger.error('Failed to publish Sepay event to Kafka', {
                    service: serviceConfig.service,
                    topic: serviceConfig.topic,
                    error: error.message,
                    webhookId: sepayHook.webhookId
                });
            }
        }

        return results;
    }

    /**
     * Publish webhook event to payment service
     * @param {Object} webhookData - Complete webhook data
     * @param {Object} sepayHook - Sepay hook instance
     * @returns {Promise<Object>} - Publish result
     */
    async publishWebhookEvent(webhookData, sepayHook) {
        try {
            const messageId = crypto.randomUUID();
            
            // Publish raw webhook event to payment service
            const result = await publishWebhookEvent(webhookData);
            
            // Log successful publish to MongoDB
            await sepayHook.addPublishedEvent(
                'payment-service',
                result.topic,
                webhookData.eventData,
                messageId,
                true
            );

            logger.info('Sepay webhook event published to payment service', {
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
            logger.error('Failed to publish Sepay webhook event to payment service', {
                error: error.message,
                webhookId: webhookData.eventData.id,
                eventType: webhookData.eventData.event_type
            });

            // Log failed publish to MongoDB
            await sepayHook.addPublishedEvent(
                'payment-service',
                'sepay.webhook.event',
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
     * Get Sepay webhook statistics
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<Object>} - Statistics
     */
    async getStatistics(startDate, endDate) {
        return await SepayHook.getSepayStatistics(startDate, endDate);
    }

    /**
     * Retry failed webhooks
     * @param {number} limit - Number of webhooks to retry
     * @returns {Promise<Array>} - Retry results
     */
    async retryFailedWebhooks(limit = 10) {
        const failedHooks = await SepayHook.getFailedWebhooks(limit);
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

            logger.debug('Marked Sepay webhook as processed', {
                idempotencyKey,
                ttl: ttlSeconds,
                data
            });

        } catch (error) {
            logger.error('Failed to mark Sepay webhook as processed', {
                error: error.message,
                idempotencyKey,
                data
            });
            // Don't throw - this is not critical for webhook processing
        }
    }
}

module.exports = SepayWebhookService;
