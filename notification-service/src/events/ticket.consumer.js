const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const QRCode = require('qrcode');

class TicketConsumer {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.redisClient = getClient();
        this.eventConsumer = null;
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
        
        const payload = data.payload || data;
        
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
            paymentData
        } = payload;

        logger.info('Processing ticket activated event', {
            ticketId,
            passengerId,
            totalPrice,
            paymentStatus
        });

        try {
            // Format ticket data for template
            const ticketData = {
                ticketId: ticketId,
                qrCode: qrCode,
                price: this.formatCurrency(totalPrice),
                ticketType: this.getTicketType(totalPassengers),
                departureDate: this.formatDate(activatedAt),
                departureTime: this.formatTime(activatedAt),
                fromStation: this.getStationName(payload.originStationId || 'Unknown'),
                toStation: this.getStationName(payload.destinationStationId || 'Unknown'),
                isActive: paymentStatus === 'completed',
                paymentMethod: paymentMethod,
                totalPassengers: totalPassengers
            };

            // Get passenger information from shared cache
            const passengerData = await this.getPassengerFromCache(passengerId);
            
            if (!passengerData) {
                logger.error('Passenger data not found in cache', { 
                    ticketId, 
                    passengerId 
                });
                throw new Error(`Passenger data not found for ID: ${passengerId}`);
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

            // Generate QR image data URL
            let qrCodeImage = null;
            try {
                if (qrCode) {
                    qrCodeImage = await QRCode.toDataURL(qrCode, {
                        errorCorrectionLevel: 'M',
                        margin: 1,
                        width: 240
                    });
                }
            } catch (qrErr) {
                logger.warn('Failed to generate QR image; falling back to text', {
                    ticketId,
                    passengerId,
                    error: qrErr.message
                });
            }

            // Send email notification
            await this.notificationService.sendEmail({
                to: passengerEmail,
                subject: 'Metro Ticket Activation Success',
                template: 'ticket_template/trainTicketEmail',
                variables: {
                    ...ticketData,
                    passengerName: passengerName,
                    qrCodeImage
                },
                userId: passengerId,
                category: 'ticket_activation'
            });

            // Send SMS notification (optional)
            if (passengerPhone) {
                const smsData = {
                    ticketId: ticketId,
                    fromStation: ticketData.fromStation,
                    toStation: ticketData.toStation,
                    departureDate: ticketData.departureDate,
                    departureTime: ticketData.departureTime,
                    price: ticketData.price,
                    qrCode: qrCode
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
            } else {
                logger.info('No phone number available for SMS notification', {
                    ticketId,
                    passengerId
                });
            }

            logger.info('Ticket activation notifications sent successfully', {
                ticketId,
                passengerId
            });

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
                logger.error('Passenger data not found in cache for cancellation', { 
                    ticketId, 
                    passengerId 
                });
                throw new Error(`Passenger data not found for ID: ${passengerId}`);
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
     * Get passenger data from shared Redis cache
     * @param {string} passengerId - Passenger ID
     * @returns {Object|null} Passenger data or null if not found
     */
    async getPassengerFromCache(passengerId) {
        if (!this.redisClient) {
            logger.warn('Redis client not available for passenger cache lookup');
            return null;
        }

        try {
            const cacheKey = `service:user:passenger:${passengerId}`;
            const raw = await this.redisClient.get(cacheKey);
            
            if (!raw) {
                logger.debug('Passenger not found in cache', { passengerId, cacheKey });
                return null;
            }

            const parsed = JSON.parse(raw);
            return parsed.data || null;
        } catch (error) {
            logger.warn('Failed to get passenger from cache', { 
                passengerId, 
                error: error.message 
            });
            return null;
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
        // This should be implemented based on your station data
        // For now, return a placeholder
        const stationNames = {
            'BEN_THANH': 'Bến Thành',
            'SUOI_TIEN': 'Suối Tiên',
            'TAN_DINH': 'Tân Định',
            'THI_NGHE': 'Thị Nghè',
            'PHU_NHUAN': 'Phú Nhuận',
            'GO_VAP': 'Gò Vấp'
        };
        return stationNames[stationId] || stationId;
    }


}

module.exports = TicketConsumer; 