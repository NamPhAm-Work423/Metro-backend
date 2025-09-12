const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const QRCode = require('qrcode');
const { publish: publishKafka } = require('../kafka/kafkaProducer');
const { publishQrImage } = require('./qr.producer');
const PassengerCacheService = require('../cache/PassengerCacheService');

class TicketConsumer {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.redisClient = getClient();
        this.eventConsumer = null;
        
        // Use standardized passenger cache prefix across all services
        this.passengerCache = new PassengerCacheService(
            this.redisClient, 
            logger
        );
    }

    /**
     * Process incoming Kafka messages
     * @param {Object} messageData - Raw message data from Kafka
     */
    async processMessage(messageData) {
        const { topic, partition, message } = messageData;
        
        if (!message.value) {
            logger.warn('Received empty message', { topic, partition });
            return;
        }
        
        let data;
        try {
            data = JSON.parse(message.value.toString());
            logger.info(`Received ticket event: ${topic}`, {
                topic,
                partition,
                offset: message.offset,
                key: message.key?.toString(),
                eventData: data
            });
        } catch (e) {
            logger.error('JSON parse error for Kafka message', { 
                error: e.message,
                messageValue: message.value.toString()
            });
            return;
        }
        
        const payload = data.payload || data.eventData || data;
        
        // Route to appropriate handler based on topic
        try {
            switch (topic) {
                case 'ticket.activated':
                    await this.handleTicketActivated(payload);
                    break;
                case 'ticket.created':
                    await this.handleTicketCreated(payload);
                    break;
                case 'ticket.cancelled':
                    await this.handleTicketCancelled(payload);
                    break;
                case 'ticket.expired':
                    await this.handleTicketExpired(payload);
                    break;
                case 'ticket.used':
                    await this.handleTicketUsed(payload);
                    break;
                case 'ticket.expiring_soon':
                    await this.handleTicketExpiringSoon(payload);
                    break;
                default:
                    logger.warn(`Unknown ticket event topic: ${topic}`);
            }
        } catch (error) {
            logger.error(`Failed to handle ticket event: ${topic}`, {
                error: error.message,
                payload,
                stack: error.stack
            });
        }
    }

    /**
     * Handle ticket activated event - send ticket email
     * @param {Object} payload - Ticket activation data
     */
    async handleTicketActivated(payload) {
        const {
            ticketId,
            passengerId,
            qrCode,
            totalPrice,
            totalPassengers,
            paymentMethod,
            paymentStatus,
            activatedAt,
            paymentData,
            status,
            ticketType
        } = payload;

        logger.info('Processing ticket activated event', {
            ticketId,
            passengerId,
            totalPrice,
            totalPassengers,
            paymentStatus,
            ticketType,
            originStationId: payload.originStationId,
            destinationStationId: payload.destinationStationId,
            hasQrCode: !!qrCode,
            qrCodeLength: qrCode?.length || 0,
            paymentMethod,
            status
        });

        try {
            const actualTotalPassengers = totalPassengers || 1;

            // Trust enriched display data from TicketDataEnrichmentService 
            const displayData = payload.displayData || {};
            
            // Get template name from enriched data
            const templateName = payload.templateName || 'singleUseTicketEmail'; //fallback
            
            logger.info('Processing ticket activation with enriched data', {
                ticketId,
                hasDisplayData: !!payload.displayData,
                displayDataFields: payload.displayData ? Object.keys(payload.displayData) : [],
                templateName: templateName,
                ticketType: ticketType,
                isMultiUse: payload.isMultiUse,
                enrichedDataUsed: !!payload.displayData
            });
            
            // Use enriched data directly - no more local formatting
            const ticketData = {
                ticketId: ticketId,
                qrCode: qrCode,
                price: displayData.formattedPrice || '0 ₫', // minimal fallback
                ticketType: displayData.ticketTypeName || 'Vé một chiều', // minimal fallback
                departureDate: displayData.departureDate || new Date().toLocaleDateString('vi-VN'),
                departureTime: displayData.departureTime || new Date().toLocaleTimeString('vi-VN'),
                fromStation: displayData.fromStationName || 'Không xác định',
                toStation: displayData.toStationName || 'Không xác định',
                isActive: (status ? status === 'active' : false),
                paymentMethod: paymentMethod || paymentData?.paymentMethod,
                totalPassengers: actualTotalPassengers
            };
            
            // Get passenger information from shared cache
            const passengerData = await this.getPassengerFromCache(passengerId);
            
            if (!passengerData) {
                await this.handlePassengerCacheMiss({
                    ticketId,
                    passengerId,
                    payload,
                    context: 'ticket.activated'
                });
                return;
            }

            const passengerEmail = passengerData.email;
            const passengerName = passengerData.fullName || 
                                 `${passengerData.firstName || ''} ${passengerData.lastName || ''}`.trim() || 
                                 passengerData.username || 
                                 'Customer';

            // Validate essential passenger data
            if (!passengerEmail) {
                logger.error('Passenger email not found in cache data', { 
                    ticketId, 
                    passengerId,
                    cachedFields: Object.keys(passengerData)
                });
                throw new Error(`Passenger email not found for ID: ${passengerId}`);
            }

            // Enhanced QR image generation and publishing to public-service
            let qrCodeImage = null;
            
            try {
                if (qrCode) {
                    // Use the provided qrCode string directly as the QR content
                    const qrContent = String(qrCode);

                    // Generate QR code as base64 data (without data URL prefix)
                    const qrDataUrl = await QRCode.toDataURL(qrContent, {
                        errorCorrectionLevel: 'M',
                        type: 'image/png',
                        quality: 0.92,
                        margin: 1,
                        width: 200,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    });

                    // Extract base64 data and publish to QR storage
                    if (qrDataUrl && qrDataUrl.startsWith('data:image/png;base64,')) {
                        const base64Data = qrDataUrl.split(',')[1];
                        
                        // Publish QR image to public-service for hosting
                        await publishQrImage({
                            ticketId,
                            imageBase64: base64Data,
                            mimeType: 'image/png'
                        });

                        // Generate QR URL for email template
                        const publicServiceUrl = process.env.PUBLIC_SERVICE_URL || 'http://localhost:3007';
                        qrCodeImage = `${publicServiceUrl}/qr/${ticketId}.png`;

                        logger.info('QR code published and URL generated successfully', { 
                            ticketId, 
                            qrContentLength: qrContent.length,
                            qrUrl: qrCodeImage
                        });
                    }
                } else {
                    logger.warn('No QR code data provided from ticket service', { ticketId });
                }
            } catch (qrErr) {
                logger.error('QR image generation/publishing failed', { 
                    ticketId, 
                    error: qrErr.message, 
                    stack: qrErr.stack,
                    qrCodeType: typeof qrCode,
                    qrCodeLength: qrCode?.length || 0
                });
                qrCodeImage = null;
            }

            // Prepare template variables
            const templateVariables = {
                ...ticketData,
                passengerName: passengerName,
                qrCodeImage
            };

            // Add validity range variables for both single-use and multi-use
            const isMultiUseTemplate = templateName.includes('multiUse');

            // Debug incoming/derived date sources for template
            logger.info('Activation date inputs', {
                payloadValidFrom: payload.validFrom,
                payloadValidUntil: payload.validUntil,
                payloadTicketValidFrom: payload.ticket?.validFrom,
                payloadTicketValidUntil: payload.ticket?.validUntil,
                displayDataValidFromDate: displayData?.validFromDate,
                displayDataValidFromTime: displayData?.validFromTime,
                displayDataValidUntilDate: displayData?.validUntilDate,
                displayDataValidUntilTime: displayData?.validUntilTime,
                templateName,
                isMultiUseTemplate
            });
            
            // Trust enriched validity data from TicketDataEnrichmentService
            if (displayData?.validFromDate || displayData?.validUntilDate) {
                // Use pre-formatted validity data from enrichment service
                templateVariables.validFromDate = displayData.validFromDate;
                templateVariables.validFromTime = displayData.validFromTime;
                templateVariables.validUntilDate = displayData.validUntilDate;
                templateVariables.validUntilTime = displayData.validUntilTime;
                templateVariables.validUntilDateTime = displayData.validUntilDateTime;
                templateVariables.activationDate = displayData.activationDate;
                templateVariables.usageStats = displayData.usageStats;
                
                logger.info('Using enriched validity data from TicketDataEnrichmentService', {
                    ticketId,
                    validFromDate: displayData.validFromDate,
                    validUntilDate: displayData.validUntilDate
                });
            } else if (payload.validFrom && payload.validUntil) {
                // Minimal fallback when enrichment service didn't provide formatted dates
                const from = new Date(payload.validFrom);
                const until = new Date(payload.validUntil);
                templateVariables.validFromDate = from.toLocaleDateString('vi-VN');
                templateVariables.validFromTime = from.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                templateVariables.validUntilDate = until.toLocaleDateString('vi-VN');
                templateVariables.validUntilTime = until.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                templateVariables.validUntilDateTime = `${templateVariables.validUntilDate} lúc ${templateVariables.validUntilTime}`;
                templateVariables.activationDate = templateVariables.validFromDate;
                
                logger.warn('Using payload validity dates with minimal formatting (enrichment service data missing)', {
                    ticketId,
                    validFrom: payload.validFrom,
                    validUntil: payload.validUntil
                });
            } else {
                // Emergency fallback - should rarely happen with proper enrichment service
                const now = new Date();
                const nextDay = new Date(now.getTime() + 24*60*60*1000);
                templateVariables.validFromDate = now.toLocaleDateString('vi-VN');
                templateVariables.validFromTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                templateVariables.validUntilDate = nextDay.toLocaleDateString('vi-VN');
                templateVariables.validUntilTime = nextDay.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                templateVariables.validUntilDateTime = `${templateVariables.validUntilDate} lúc ${templateVariables.validUntilTime}`;
                templateVariables.activationDate = templateVariables.validFromDate;

                if (isMultiUseTemplate) {
                    templateVariables.usageStats = { totalTrips: 0, daysRemaining: 1, lastUsed: 'Chưa sử dụng' };
                }
                
                logger.error('Emergency fallback for validity dates - enrichment service and payload both missing', {
                    ticketId,
                    ticketType,
                    templateName,
                    payloadValidFrom: payload.validFrom,
                    payloadValidUntil: payload.validUntil,
                    hasDisplayData: !!displayData
                });
            }

            // Combine template variables with QR code and passenger data 
            const finalVariables = {
                ...ticketData,
                passengerName: passengerName,
                qrCode: qrCode,
                qrCodeImage,
                rawTicketType: ticketType,
                isReturnTicket: ticketType === 'return',
                validFromDate: templateVariables.validFromDate,
                validFromTime: templateVariables.validFromTime,
                validUntilDate: templateVariables.validUntilDate,
                validUntilTime: templateVariables.validUntilTime,
                validUntilDateTime: templateVariables.validUntilDateTime,
                activationDate: templateVariables.activationDate,
                usageStats: templateVariables.usageStats
            };

            // Log resolved values that will feed the email template
            logger.info('Email variables date fields', {
                validFromDate: finalVariables.validFromDate,
                validFromTime: finalVariables.validFromTime,
                validUntilDate: finalVariables.validUntilDate,
                validUntilTime: finalVariables.validUntilTime,
                validUntilDateTime: finalVariables.validUntilDateTime
            });

            // QR code is now hosted as URL, no attachments needed
            let attachments = [];
            
            // QR code URL is already set in qrCodeImage
            if (qrCodeImage) {
                finalVariables.qrCodeImage = qrCodeImage;
                logger.info('Using inline QR code image', { ticketId });
            } else if (!qrCodeImage) {
                finalVariables.qrCodeImage = null;
                logger.warn('No QR code image available', { ticketId });
            }

            const emailSubject = isMultiUseTemplate
                ? 'Metro Pass Activation Success - Thẻ Thông Hành'
                : 'Metro Ticket Activation Success - Vé Tàu';
                
            await this.notificationService.sendEmail({
                to: passengerEmail,
                subject: emailSubject,
                template: `ticket_template/${templateName}`,
                variables: finalVariables,
                attachments: attachments.length > 0 ? attachments : undefined,
                userId: passengerId,
                category: 'ticket_activation'
            });

            // SMS notification removed - only email notifications for tickets

            logger.info('Ticket activation email notification sent successfully', { ticketId, passengerId });

        } catch (error) {
            logger.error('Failed to send ticket activation email notification', {
                error: error.message,
                ticketId,
                passengerId,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Handle ticket created event
     * @param {Object} payload - Ticket creation data
     */
    async handleTicketCreated(payload) {
        const { ticketId, passengerId, amount, ticketType } = payload;

        logger.info('Processing ticket created event', {
            ticketId,
            passengerId,
            amount,
            ticketType
        });

        logger.info('Ticket created - no notification sent', { ticketId });
    }

    /**
     * Handle ticket cancelled event
     * @param {Object} payload - Ticket cancellation data
     */
    async handleTicketCancelled(payload) {
        const { ticketId, passengerId, reason } = payload;

        logger.info('Processing ticket cancelled event', {
            ticketId,
            passengerId,
            reason
        });

        try {
            // Get passenger information from shared cache
            const passengerData = await this.getPassengerFromCache(passengerId);
            
            if (!passengerData) {
                await this.handlePassengerCacheMiss({
                    ticketId,
                    passengerId,
                    payload: { passengerId, reason },
                    context: 'ticket.cancelled'
                });
                return;
            }

            const passengerEmail = passengerData.email;
            const passengerName = passengerData.fullName || 
                                 `${passengerData.firstName || ''} ${passengerData.lastName || ''}`.trim() || 
                                 passengerData.username || 
                                 'Customer';

            // Validate essential passenger data
            if (!passengerEmail) {
                logger.error('Passenger email not found in cache data for cancellation', { 
                    ticketId, 
                    passengerId,
                    cachedFields: Object.keys(passengerData)
                });
                throw new Error(`Passenger email not found for ID: ${passengerId}`);
            }

            await this.notificationService.sendEmail({
                to: passengerEmail,
                subject: 'Metro Ticket Cancellation',
                template: 'ticket_template/ticketCancelledEmail',
                variables: {
                    ticketId: ticketId,
                    reason: reason,
                    cancelledAt: this.formatDate(new Date()),
                    passengerName: passengerName
                },
                userId: passengerId,
                category: 'ticket_cancellation'
            });

            logger.info('Ticket cancellation notification sent', { ticketId });
        } catch (error) {
            logger.error('Failed to send ticket cancellation notification', {
                error: error.message,
                ticketId
            });
        }
    }

    /**
     * Handle ticket expired event
     * @param {Object} payload - Ticket expiration data
     */
    async handleTicketExpired(payload) {
        const { ticketId, passengerId } = payload;

        logger.info('Processing ticket expired event', {
            ticketId,
            passengerId
        });

        // You can send an expiration notification if needed
        logger.info('Ticket expired - no notification sent', { ticketId });
    }

    /**
     * Handle ticket used event
     * @param {Object} payload - Ticket usage data
     */
    async handleTicketUsed(payload) {
        const { ticketId, passengerId, usageData } = payload;

        logger.info('Processing ticket used event', {
            ticketId,
            passengerId,
            stationId: usageData?.stationId
        });

        // You can send usage confirmation if needed
        logger.info('Ticket used - no notification sent', { ticketId });
    }

    /**
     * Handle ticket expiring soon event - notify passenger
     * @param {Object} payload - Expiring soon data
     */
    async handleTicketExpiringSoon(payload) {
        const { ticketId, passengerId, validUntil, daysLeft } = payload;

        logger.info('Processing ticket expiring soon event', {
            ticketId,
            passengerId,
            validUntil,
            daysLeft
        });

        try {
            const passengerData = await this.getPassengerFromCache(passengerId);
            if (!passengerData) {
                await this.handlePassengerCacheMiss({
                    ticketId,
                    passengerId,
                    payload,
                    context: 'ticket.expiring_soon'
                });
                return;
            }

            const passengerEmail = passengerData.email;
            const passengerName = passengerData.fullName || 
                                 `${passengerData.firstName || ''} ${passengerData.lastName || ''}`.trim() || 
                                 passengerData.username || 
                                 'Quý khách';
            if (!passengerEmail) {
                throw new Error('Passenger email missing for expiring soon');
            }

            await this.notificationService.sendEmail({
                to: passengerEmail,
                subject: 'Vé sắp hết hạn',
                template: 'ticket_template/ticketExpiringSoon',
                variables: {
                    ticketId,
                    passengerName,
                    validUntil: this.formatDate(validUntil),
                    daysLeft: daysLeft ?? 7
                },
                userId: passengerId,
                category: 'ticket_expiring_soon'
            });

            logger.info('Ticket expiring soon notification sent', { ticketId, passengerId });
        } catch (error) {
            logger.error('Failed to send ticket expiring soon notification', {
                error: error.message,
                ticketId,
                passengerId
            });
        }
    }

    /**
     * Start consuming ticket events
     */
    async start() {
        try {
            const topics = [
                'ticket.activated',
                'ticket.created',
                'ticket.cancelled',
                'ticket.expired',
                'ticket.used'
            ];

            this.eventConsumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: 'notification-service-ticket',
                topics,
                eachMessage: this.processMessage.bind(this)
            });

            await this.eventConsumer.start();
            logger.info('Ticket consumer started successfully', { topics });
        } catch (error) {
            logger.error('Failed to start ticket consumer:', error);
            throw error;
        }
    }

    /**
     * Stop consuming events
     */
    async stop() {
        if (this.eventConsumer) {
            await this.eventConsumer.stop();
            logger.info('Ticket consumer stopped');
        }
    }

    /**
     * Check if consumer is healthy
     */
    async isHealthy() {
        return this.eventConsumer ? this.eventConsumer.isHealthy() : false;
    }

    /**
     * Get consumer statistics
     */
    async getStats() {
        return this.eventConsumer ? this.eventConsumer.getStats() : {};
    }

    /**
     * Get passenger data from shared Redis cache using PassengerCacheService
     * @param {string} passengerId - Passenger ID
     * @returns {Object|null} Passenger data or null if not found
     */
    async getPassengerFromCache(passengerId) {
        if (!this.passengerCache || !this.redisClient) {
            logger.warn('PassengerCacheService or Redis client not available for passenger cache lookup');
            return null;
        }

        try {
            const passengerData = await this.passengerCache.getPassenger(passengerId);
            
            if (passengerData) {
                logger.debug('Found passenger in cache via PassengerCacheService', { 
                    passengerId,
                    hasEmail: !!passengerData.email,
                    hasUserId: !!passengerData.userId 
                });
            } else {
                logger.debug('Passenger not found in cache via PassengerCacheService', { passengerId });
            }
            
            return passengerData;
        } catch (error) {
            logger.warn('Failed to get passenger from cache via PassengerCacheService', { 
                passengerId, 
                error: error.message 
            });
            return null;
        }
    }

    /**
     * Handle passenger cache miss with comprehensive fallback mechanisms
     * @param {Object} options - Cache miss handling options
     * @param {string} options.ticketId - Ticket ID
     * @param {string} options.passengerId - Passenger ID
     * @param {Object} options.payload - Original event payload
     * @param {string} options.context - Context where cache miss occurred
     */
    async handlePassengerCacheMiss({ ticketId, passengerId, payload, context }) {
        logger.error('Passenger cache miss detected', {
            ticketId,
            passengerId,
            context,
            hasUserId: !!payload.userId,
            payloadKeys: Object.keys(payload)
        });

        // Try to request passenger cache sync if userId is available
        if (payload.userId) {
            try {
                await publishKafka('passenger-sync-request', payload.userId, {
                    eventType: 'passenger-sync-request',
                    userId: payload.userId,
                    passengerId: passengerId,
                    requestedBy: 'notification-service',
                    source: context,
                    ticketId: ticketId,
                    timestamp: new Date().toISOString()
                });
                
                logger.info('Requested passenger cache sync due to cache miss', {
                    userId: payload.userId,
                    passengerId,
                    ticketId,
                    context
                });
            } catch (pubErr) {
                logger.error('Failed to publish passenger-sync-request', { 
                    error: pubErr.message,
                    passengerId,
                    ticketId,
                    userId: payload.userId
                });
            }
        } else {
            logger.warn('Cannot request passenger sync: missing userId in payload', { 
                passengerId, 
                ticketId,
                context,
                availableFields: Object.keys(payload)
            });
        }

        // Store failed notification for potential retry
        await this.logFailedNotification({
            ticketId,
            passengerId,
            userId: payload.userId,
            reason: 'passenger_cache_miss',
            context,
            payload: payload,
            timestamp: new Date().toISOString()
        });

        logger.warn('Skipping notification due to passenger cache miss', {
            ticketId,
            passengerId,
            context,
            syncRequested: !!payload.userId
        });
    }

    /**
     * Log failed notification for debugging and potential retry
     * @param {Object} failureData - Failure information
     */
    async logFailedNotification(failureData) {
        try {
            // Log to application logs for immediate visibility
            logger.error('Notification failed and logged for review', {
                ...failureData,
                service: 'notification-service'
            });
            
        } catch (logError) {
            logger.error('Failed to log notification failure', {
                error: logError.message,
                originalFailure: failureData
            });
        }
    }

}

module.exports = TicketConsumer; 