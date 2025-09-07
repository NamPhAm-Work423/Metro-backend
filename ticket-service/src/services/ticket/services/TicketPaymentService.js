const { Ticket } = require('../../../models/index.model');
const { logger } = require('../../../config/logger');
const { publishTicketCreated, generatePaymentId, getPaymentData } = require('../../../events/ticket.producer');

class TicketPaymentService {
    constructor() {
        this.cache = require('node-cache');
        this.ticketCache = new this.cache({ 
            stdTTL: 300, // 5 minutes default TTL
            checkperiod: 600, // Check for expired keys every 10 minutes
            useClones: false // Better performance
        });
    }

    /**
     * Wait for payment response from payment service
     * @param {string} paymentId - Payment ID to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<Object|null>} Payment response or null if timeout
     */
    async waitForPaymentResponse(paymentId, timeout = 30000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const checkInterval = 1000; // Check every second for faster response
            let attempts = 0;
            const maxAttempts = Math.ceil(timeout / checkInterval);
            
            logger.info('Starting to wait for payment response', { 
                paymentId, 
                timeout,
                checkInterval,
                maxAttempts
            });
            
            // Set up interval to check for payment response
            const interval = setInterval(async () => {
                attempts++;
                try {
                    // First, check if payment data is available in cache (from Kafka event)
                    const paymentData = getPaymentData(paymentId);
                    
                    if (paymentData && paymentData.paymentUrl) {
                        clearInterval(interval);
                        logger.info('Payment response received from Kafka cache', {
                            paymentId,
                            ticketId: paymentData.ticketId,
                            paymentUrl: paymentData.paymentUrl,
                            paymentMethod: paymentData.paymentMethod,
                            attempts
                        });
                        
                        resolve({
                            status: 'success',
                            paymentMethod: paymentData.paymentMethod,
                            paymentUrl: paymentData.paymentUrl,
                            paypalOrderId: paymentData.paypalOrderId,
                            message: 'Payment ready for processing'
                        });
                        return;
                    }

                    // Fallback: try to find by ticket ID in cache
                    const paymentIdParts = paymentId.split('_');
                    const ticketIdFromPaymentId = paymentIdParts.length >= 3 ? paymentIdParts[2] : null;
                    if (ticketIdFromPaymentId) {
                        const paymentDataByTicketId = getPaymentData(ticketIdFromPaymentId);
                        if (paymentDataByTicketId && paymentDataByTicketId.paymentUrl) {
                            clearInterval(interval);
                            logger.info('Payment response received from Kafka cache (by ticket ID)', {
                                paymentId,
                                ticketId: paymentDataByTicketId.ticketId,
                                paymentUrl: paymentDataByTicketId.paymentUrl,
                                paymentMethod: paymentDataByTicketId.paymentMethod,
                                attempts
                            });
                            
                            resolve({
                                status: 'success',
                                paymentMethod: paymentDataByTicketId.paymentMethod,
                                paymentUrl: paymentDataByTicketId.paymentUrl,
                                paypalOrderId: paymentDataByTicketId.paypalOrderId,
                                message: 'Payment ready for processing'
                            });
                            return;
                        }
                    }

                    // Check database for ticket status to ensure ticket exists and is in pending_payment state
                    // But don't resolve from database - only use it to verify the ticket is ready
                    const cacheKey = `payment_check:${paymentId}`;
                    const ticket = await this.getCachedOrFetch(cacheKey, async () => {
                        return await Ticket.findOne({
                            where: { paymentId: paymentId },
                            attributes: ['ticketId', 'paymentId', 'status', 'paymentMethod']
                        });
                    }, 5); // Very short cache for payment checks

                    // Fallback: try to find by ticket ID
                    let ticketById = null;
                    if (!ticket && ticketIdFromPaymentId) {
                        ticketById = await Ticket.findByPk(ticketIdFromPaymentId, {
                            attributes: ['ticketId', 'paymentId', 'status', 'paymentMethod']
                        });
                    }

                    // Only log database status for debugging, but don't resolve from database
                    if (ticket && ticket.status === 'pending_payment') {
                        logger.debug('Ticket found in database with pending_payment status, waiting for payment URL from Kafka', {
                            paymentId,
                            ticketId: ticket.ticketId,
                            status: ticket.status,
                            attempts
                        });
                    } else if (ticketById && ticketById.status === 'pending_payment') {
                        logger.debug('Ticket found in database by ID with pending_payment status, waiting for payment URL from Kafka', {
                            paymentId,
                            ticketId: ticketById.ticketId,
                            status: ticketById.status,
                            attempts
                        });
                    }

                    // Check timeout
                    if (attempts >= maxAttempts) {
                        clearInterval(interval);
                        logger.warn('Payment response timeout', { paymentId, timeout, attempts });
                        resolve(null);
                        return;
                    }
                } catch (error) {
                    logger.error('Error checking payment response', { error: error.message, paymentId, attempts });
                    clearInterval(interval);
                    resolve(null);
                }
            }, checkInterval);
        });
    }

    /**
     * Get cached data or fetch from database
     * @private
     */
    async getCachedOrFetch(key, fetchFunction, ttl = 300) {
        const cached = this.ticketCache.get(key);
        if (cached) {
            logger.debug('Cache hit', { key });
            return cached;
        }
        
        const data = await fetchFunction();
        this.ticketCache.set(key, data, ttl);
        logger.debug('Cache miss, stored new data', { key });
        return data;
    }

    /**
     * Process ticket payment
     * @param {Object} ticket - Ticket object
     * @param {string} ticketType - Type of ticket ('short-term' or 'long-term')
     * @param {Object} paymentOptions - Payment options
     * @returns {Promise<Object>} Payment result
     */
    async processTicketPayment(ticket, ticketType, paymentOptions = {}) {
        try {
            // Generate initial payment ID
            const initialPaymentId = generatePaymentId(null, ticketType);
            
            logger.info('Processing ticket payment', { 
                ticketId: ticket.ticketId,
                initialPaymentId,
                ticketType,
                totalPrice: ticket.totalPrice
            });

            // Update ticket with initial payment ID
            ticket.paymentId = initialPaymentId;
            await ticket.save();

            // Update paymentId with actual ticket ID
            const finalPaymentId = generatePaymentId(ticket.ticketId, ticketType);
            
            logger.info('Updating ticket with final payment ID', {
                ticketId: ticket.ticketId,
                initialPaymentId: initialPaymentId,
                finalPaymentId: finalPaymentId
            });

            ticket.paymentId = finalPaymentId;
            await ticket.save();

            // Publish ticket created event with redirect URLs
            const publishedPaymentId = await publishTicketCreated(ticket, ticketType, {
                paymentSuccessUrl: paymentOptions.paymentSuccessUrl,
                paymentFailUrl: paymentOptions.paymentFailUrl,
                currency: paymentOptions.currency || 'VND'
            });

            // Log URLs for debugging
            logger.info('Ticket payment processed with payment URLs', {
                ticketId: ticket.ticketId,
                paymentId: publishedPaymentId,
                hasPaymentSuccessUrl: !!paymentOptions.paymentSuccessUrl,
                hasPaymentFailUrl: !!paymentOptions.paymentFailUrl
            });

            return {
                ticket,
                paymentId: publishedPaymentId,
                paymentOptions
            };
        } catch (error) {
            logger.error('Error processing ticket payment', { 
                error: error.message, 
                ticketId: ticket.ticketId 
            });
            throw error;
        }
    }

    /**
     * Pay additional fare for extended journey
     * @param {string} ticketId - Original ticket ID
     * @param {string} newExitStationId - New exit station ID
     * @returns {Promise<Object>} Additional fare payment result
     */
    async payAdditionalFare(ticketId, newExitStationId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            // In a real implementation, you would calculate additional fare here
            const additionalFare = 0; // Placeholder for fare calculation

            if (additionalFare <= 0) {
                throw new Error('No additional fare required');
            }

            // Create a new ticket for the extension
            const extensionTicket = await Ticket.create({
                passengerId: ticket.passengerId,
                originStationId: ticket.destinationStationId,
                destinationStationId: newExitStationId,
                ticketType: 'oneway',
                originalPrice: additionalFare,
                finalPrice: additionalFare,
                totalPrice: additionalFare,
                status: 'pending_payment',
                originalTicketId: ticketId
            });

            return {
                originalTicket: ticket,
                extensionTicket,
                additionalFare
            };

        } catch (error) {
            logger.error('Error processing additional fare', {
                error: error.message,
                ticketId,
                newExitStationId
            });
            throw error;
        }
    }
}

module.exports = new TicketPaymentService();
