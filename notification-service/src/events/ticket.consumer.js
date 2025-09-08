const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const QRCode = require('qrcode');
const { publish: publishKafka } = require('../kafka/kafkaProducer');
const PassengerCacheService = require('../cache/PassengerCacheService');

class TicketConsumer {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.redisClient = getClient();
        this.eventConsumer = null;
        
        // Initialize PassengerCacheService with proper prefix
        // Based on actual Redis key: metrohcm:user-service:user:passenger:{passengerId}
        const SERVICE_PREFIX = process.env.REDIS_USER_CACHE_KEY_PREFIX || 'metrohcm:';
        this.passengerCache = new PassengerCacheService(
            this.redisClient, 
            logger, 
            `${SERVICE_PREFIX}user-service:user:passenger:`
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
            // Simple QR code parsing for departure info
            let departureInfo = { date: null, time: null };
            let actualTotalPassengers = totalPassengers || 1;
            
            if (qrCode) {
                try {
                    const qrData = JSON.parse(Buffer.from(qrCode, 'base64').toString());
                    
                    // Extract departure time from validFrom
                    if (qrData.validFrom) {
                        const validFromDate = new Date(qrData.validFrom);
                        departureInfo.date = this.formatDate(validFromDate);
                        departureInfo.time = this.formatTime(validFromDate);
                    }
                    
                    // Get total passengers from QR data
                    if (qrData.totalPassengers) {
                        actualTotalPassengers = qrData.totalPassengers;
                    }
                } catch (qrParseError) {
                    logger.warn('Failed to parse QR code, using fallback', { ticketId, error: qrParseError.message });
                }
            }
            
            // Fallback to activatedAt if QR parsing failed
            if (!departureInfo.date) {
                const fallbackDate = activatedAt ? new Date(activatedAt) : new Date();
                departureInfo.date = this.formatDate(fallbackDate);
                departureInfo.time = this.formatTime(fallbackDate);
            }

            // Format ticket data for template
            const ticketData = {
                ticketId: ticketId,
                qrCode: qrCode,
                price: this.formatCurrency(Number(totalPrice)),
                ticketType: ticketType ? this.getTicketTypeName(ticketType, actualTotalPassengers) : this.getTicketType(actualTotalPassengers),
                departureDate: departureInfo.date,
                departureTime: departureInfo.time,
                fromStation: this.getStationName(payload.originStationId || 'Unknown'),
                toStation: this.getStationName(payload.destinationStationId || 'Unknown'),
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
            const passengerPhone = passengerData.phone;
            const passengerName = passengerData.fullName || passengerData.name;

            // Validate essential passenger data
            if (!passengerEmail) {
                logger.error('Passenger email not found in cache data', { 
                    ticketId, 
                    passengerId,
                    cachedFields: Object.keys(passengerData)
                });
                throw new Error(`Passenger email not found for ID: ${passengerId}`);
            }

            // Enhanced QR image generation with proper base64 JSON data parsing
            let qrCodeImage = null;
            let qrCodeAttachment = null;
            let parsedQrData = null;
            
            try {
                if (qrCode) {
                    // First, try to parse the base64 encoded JSON data from ticket service
                    try {
                        const decodedJsonString = Buffer.from(qrCode, 'base64').toString('utf8');
                        parsedQrData = JSON.parse(decodedJsonString);
                        
                        logger.info('Successfully parsed QR data from ticket service', {
                            ticketId,
                            qrDataFields: Object.keys(parsedQrData),
                            hasTicketId: !!parsedQrData.ticketId,
                            hasPassengerId: !!parsedQrData.passengerId,
                            originalDataSize: qrCode.length,
                            decodedSize: decodedJsonString.length
                        });
                    } catch (parseError) {
                        logger.warn('Failed to parse base64 QR data as JSON, treating as plain text', {
                            ticketId,
                            parseError: parseError.message,
                            qrCodeLength: qrCode.length
                        });
                        // If parsing fails, use qrCode as is
                        parsedQrData = null;
                    }
                    
                    // Create simplified QR content for actual QR code generation
                    let qrContent;
                    if (parsedQrData) {
                        // Use simplified data for QR code to ensure scannability
                        qrContent = JSON.stringify({
                            id: parsedQrData.ticketId || ticketId,
                            passenger: parsedQrData.passengerId,
                            from: parsedQrData.originStationId || payload.originStationId,
                            to: parsedQrData.destinationStationId || payload.destinationStationId,
                            valid: parsedQrData.validFrom,
                            expires: parsedQrData.validUntil,
                            type: parsedQrData.ticketType || ticketType,
                            passengers: parsedQrData.totalPassengers || actualTotalPassengers
                        });
                    } else if (typeof qrCode === 'string' && qrCode.length < 500) {
                        // Use original QR code if it's not too long
                        qrContent = qrCode;
                    } else {
                        // Fallback to ticket ID
                        qrContent = ticketId;
                    }
                    
                    // Ensure QR content is not too long (QR codes have size limits)
                    if (qrContent.length > 800) {
                        logger.warn('QR content too long, using simplified version', {
                            ticketId,
                            originalLength: qrContent.length
                        });
                        qrContent = JSON.stringify({
                            id: ticketId,
                            valid: parsedQrData?.validFrom || new Date().toISOString()
                        });
                    }
                    
                    // Generate QR code image with enhanced options
                    qrCodeImage = await QRCode.toDataURL(qrContent, {
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

                    logger.info('QR code image generated successfully', { 
                        ticketId, 
                        qrContentLength: qrContent.length,
                        imageSize: qrCodeImage.length,
                        usedParsedData: !!parsedQrData
                    });
                } else {
                    logger.warn('No QR code data provided from ticket service', { ticketId });
                }
            } catch (qrErr) {
                logger.error('QR image generation failed', { 
                    ticketId, 
                    error: qrErr.message, 
                    stack: qrErr.stack,
                    qrCodeType: typeof qrCode,
                    qrCodeLength: qrCode?.length || 0,
                    hasParsedData: !!parsedQrData
                });
                qrCodeImage = null;
            }

            // Prepare template variables
            const templateVariables = {
                ...ticketData,
                passengerName: passengerName,
                qrCodeImage
            };

            const finalVariables = {
                ticketId: templateVariables.ticketId || ticketId,
                passengerName: templateVariables.passengerName || 'Valued Customer',
                fromStation: templateVariables.fromStation || this.getStationName(payload.originStationId),
                toStation: templateVariables.toStation || this.getStationName(payload.destinationStationId),
                departureDate: templateVariables.departureDate || new Date().toLocaleDateString('vi-VN'),
                departureTime: templateVariables.departureTime || new Date().toLocaleTimeString('vi-VN'),
                price: templateVariables.price || this.formatCurrency(Number(totalPrice || 0)),
                ticketType: templateVariables.ticketType || this.getTicketTypeName(ticketType, actualTotalPassengers),
                isActive: templateVariables.isActive !== undefined ? templateVariables.isActive : true,
                paymentMethod: templateVariables.paymentMethod || paymentMethod,
                totalPassengers: templateVariables.totalPassengers || actualTotalPassengers || 1,
                qrCode: templateVariables.qrCode,
                qrCodeImage: templateVariables.qrCodeImage
            };

            // Enhanced QR attachment preparation with better validation
            let attachments = [];
            let useInlineQr = false;
            
            if (qrCodeImage && qrCodeImage.startsWith('data:image/png;base64,')) {
                try {
                    const base64Data = qrCodeImage.split(',')[1];
                    if (base64Data && base64Data.length > 100) {
                        // Validate base64 data
                        const buffer = Buffer.from(base64Data, 'base64');
                        if (buffer.length > 0) {
                            attachments.push({
                                filename: `ticket-qr-${ticketId.substring(0, 8)}.png`,
                                content: base64Data,
                                encoding: 'base64',
                                contentType: 'image/png',
                                cid: 'qr-code-image',
                                disposition: 'inline'
                            });
                            
                            // Set CID reference for template
                            finalVariables.qrCodeImage = 'cid:qr-code-image';
                            logger.info('QR code attachment prepared', { 
                                ticketId, 
                                attachmentSize: base64Data.length,
                                bufferSize: buffer.length 
                            });
                        } else {
                            throw new Error('Invalid base64 buffer');
                        }
                    } else {
                        throw new Error('Base64 data too short or missing');
                    }
                } catch (attachmentError) {
                    logger.warn('QR attachment preparation failed, using inline image', { 
                        ticketId, 
                        error: attachmentError.message,
                        qrImageLength: qrCodeImage.length 
                    });
                    useInlineQr = true;
                }
            } else {
                useInlineQr = true;
            }
            
            // Fallback to inline image if attachment failed
            if (useInlineQr && qrCodeImage) {
                finalVariables.qrCodeImage = qrCodeImage;
                logger.info('Using inline QR code image', { ticketId });
            } else if (!qrCodeImage) {
                finalVariables.qrCodeImage = null;
                logger.warn('No QR code image available', { ticketId });
            }

            // Send email notification with QR attachment
            await this.notificationService.sendEmail({
                to: passengerEmail,
                subject: 'Metro Ticket Activation Success',
                template: 'ticket_template/trainTicketEmail',
                variables: finalVariables,
                attachments: attachments.length > 0 ? attachments : undefined,
                userId: passengerId,
                category: 'ticket_activation'
            });

            if (passengerPhone) {
                const smsData = {
                    ticketId: finalVariables.ticketId,
                    fromStation: finalVariables.fromStation,
                    toStation: finalVariables.toStation,
                    departureDate: finalVariables.departureDate,
                    departureTime: finalVariables.departureTime,
                    price: finalVariables.price,
                    qrCode: finalVariables.qrCode
                };

                try {
                    await this.notificationService.sendSms({
                        to: passengerPhone,
                        template: 'ticket_template/trainTicketSms',
                        variables: smsData,
                        userId: passengerId,
                        category: 'ticket_activation'
                    });
                } catch (smsError) {
                    logger.warn('Failed to send SMS notification, but email was successful', {
                        ticketId,
                        passengerId,
                        error: smsError.message
                    });
                }
            }

            logger.info('Ticket activation notifications sent successfully', { ticketId, passengerId });

        } catch (error) {
            logger.error('Failed to send ticket activation notifications', {
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

        // You can send a confirmation email here if needed
        // For now, we'll just log it
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
            const passengerName = passengerData.fullName || passengerData.name;

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
            const passengerName = passengerData.fullName || passengerData.name || 'Quý khách';
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

            // TODO: Optionally store in database for admin review and retry
            // This could be implemented to store in a failed_notifications table
            // for admin dashboard and retry mechanisms
            
        } catch (logError) {
            logger.error('Failed to log notification failure', {
                error: logError.message,
                originalFailure: failureData
            });
        }
    }

    // Helper methods for data formatting and retrieval

    /**
     * Format currency for display
     * @param {number} amount - Amount in VND
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * Format date for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted date string
     */
    formatDate(date) {
        return new Date(date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    /**
     * Format time for display
     * @param {string|Date} date - Date to format
     * @returns {string} Formatted time string
     */
    formatTime(date) {
        return new Date(date).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Get ticket type based on passenger count
     * @param {number} totalPassengers - Number of passengers
     * @returns {string} Ticket type description
     */
    getTicketType(totalPassengers) {
        if (totalPassengers === 1) return 'Vé một chiều';
        if (totalPassengers > 1) return `Vé ${totalPassengers} hành khách`;
        return 'Vé không xác định';
    }

    /**
     * Get station name by ID (placeholder - implement based on your data)
     * @param {string} stationId - Station ID
     * @returns {string} Station name
     */
    getStationName(stationId) {
        if (!stationId) return 'Unknown';
        const normalized = String(stationId)
            .trim()
            .toUpperCase()
            .replace(/-/g, '_');
        const stationNames = {
            'BEN_THANH': 'Bến Thành',
            'SUI_TIEN': 'Suối Tiên',
            'SUOI_TIEN': 'Suối Tiên',
            'TAN_DINH': 'Tân Định',
            'THI_NGHE': 'Thị Nghè',
            'PHU_NHUAN': 'Phú Nhuận',
            'GO_VAP': 'Gò Vấp',
            'AN_DONG': 'An Đông',
            'BA_SON': 'Ba Son'
        };
        return stationNames[normalized] || stationId;
    }

    /**
     * Map ticket type code to localized name
     */
    getTicketTypeName(ticketType, totalPassengers) {
        const type = String(ticketType || '').toLowerCase();
        switch (type) {
            case 'one_way':
            case 'single':
            case 'oneway':
                return 'Vé một chiều';
            case 'return':
            case 'round_trip':
                return 'Vé khứ hồi';
            default:
                return this.getTicketType(totalPassengers);
        }
    }

    /**
     * Test QR code generation functionality
     * @param {string} ticketId - Test ticket ID
     * @returns {Promise<Object>} Test result
     */
    async testQRCodeGeneration(ticketId = 'TEST_TICKET_001') {
        try {
            logger.info('Testing QR code generation', { ticketId });
            
            // Create test QR content
            const testQrContent = JSON.stringify({
                id: ticketId,
                passenger: 'TEST_PASSENGER_001',
                from: 'BEN_THANH',
                to: 'BA_SON',
                valid: new Date().toISOString(),
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                type: 'one_way',
                passengers: 1
            });
            
            // Test QR code image generation
            const qrCodeImage = await QRCode.toDataURL(testQrContent, {
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
            
            const isValidImage = qrCodeImage.startsWith('data:image/png;base64,');
            const base64Data = qrCodeImage.split(',')[1];
            const imageSize = base64Data ? base64Data.length : 0;
            
            logger.info('QR code generation test completed', {
                ticketId,
                success: isValidImage,
                qrContentLength: testQrContent.length,
                imageSize,
                imageFormat: isValidImage ? 'PNG' : 'UNKNOWN'
            });
            
            return {
                success: isValidImage,
                ticketId,
                qrContent: testQrContent,
                qrCodeImage: isValidImage ? qrCodeImage : null,
                imageSize,
                error: isValidImage ? null : 'Invalid image format'
            };
        } catch (error) {
            logger.error('QR code generation test failed', {
                ticketId,
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                ticketId,
                error: error.message
            };
        }
    }


}

module.exports = TicketConsumer; 