const { Ticket, Fare, Promotion, TransitPass } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const FareService = require('./fare.service');
const { publishTicketCreated, generatePaymentId, getPaymentData } = require('../events/ticket.producer');

// Add caching utilities
const NodeCache = require('node-cache');
const cache = new NodeCache({ 
    stdTTL: 300, // 5 minutes default TTL
    checkperiod: 600, // Check for expired keys every 10 minutes
    useClones: false // Better performance
});

class TicketService {
    constructor() {
        this.fareService = FareService;
        this.cache = cache;
    }

    /**
     * Get cached data or fetch from database
     * @private
     */
    async getCachedOrFetch(key, fetchFunction, ttl = 300) {
        const cached = this.cache.get(key);
        if (cached) {
            logger.debug('Cache hit', { key });
            return cached;
        }
        
        const data = await fetchFunction();
        this.cache.set(key, data, ttl);
        logger.debug('Cache miss, stored new data', { key });
        return data;
    }

    /**
     * Invalidate cache by pattern
     * @private
     */
    invalidateCache(pattern) {
        const keys = this.cache.keys();
        const matchingKeys = keys.filter(key => key.includes(pattern));
        matchingKeys.forEach(key => this.cache.del(key));
        logger.debug('Cache invalidated', { pattern, keysCount: matchingKeys.length });
    }

    /**
     * Create a short-term ticket (oneway or return) based on station count and fare calculation
     * @param {Object} ticketData - The ticket data
     * @param {string} ticketData.routeId - The route ID
     * @param {string} ticketData.passengerId - The passenger ID  
     * @param {Object} ticketData.passengerInfo - The passenger info (including dateOfBirth)
     * @param {string} ticketData.fromStation - The origin station ID
     * @param {string} ticketData.toStation - The destination station ID
     * @param {string} ticketData.tripType - "Oneway" or "Return"
     * @param {number} ticketData.numAdults - Number of adult passengers
     * @param {number} ticketData.numElder - Number of elderly passengers
     * @param {number} ticketData.numTeenager - Number of teenager passengers
     * @param {number} ticketData.numChild - Number of child passengers
     * @param {string} ticketData.promotionId - The promotion ID (optional)
     * @param {string} ticketData.tripId - The specific trip ID (optional)
     * @param {string} ticketData.paymentMethod - Payment method
     * @param {string} ticketData.paymentId - Payment ID (optional)
     * @param {boolean} ticketData.waitForPayment - Whether to wait for payment response (default: true)
     * @param {string} ticketData.paymentSuccessUrl - URL to redirect after successful payment
     * @param {string} ticketData.paymentFailUrl - URL to redirect after failed payment
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async createShortTermTicket(ticketData) {
        try {
            // Validate required fields
            if (!ticketData.fromStation || !ticketData.toStation) {
                throw new Error('Origin station (fromStation) and destination station (toStation) are required');
            }

            if (!ticketData.tripType || !['Oneway', 'Return'].includes(ticketData.tripType)) {
                throw new Error('Trip type must be either "Oneway" or "Return"');
            }

            // Validate passenger counts
            const totalPassengers = (ticketData.numAdults || 0) + (ticketData.numElder || 0) + 
                                  (ticketData.numTeenager || 0) + (ticketData.numChild || 0);
            if (totalPassengers === 0) {
                throw new Error('At least one passenger is required');
            }

            // Calculate fare based on station count and passenger types
            const fareCalculation = await this.fareService.calculateStationBasedFare(
                ticketData.fromStation,
                ticketData.toStation,
                ticketData.numAdults || 0,
                ticketData.numElder || 0,
                ticketData.numTeenager || 0,
                ticketData.numChild || 0,
                ticketData.tripType
            );

            // Get fare record for association (using the routeId from fare calculation)
            const fare = await Fare.findOne({
                where: {
                    routeId: fareCalculation.routeId,
                    isActive: true
                }
            });

            if (!fare) {
                throw new Error(`No active fare found for route ${fareCalculation.routeId}`);
            }

            // Use calculated total fare
            let originalPrice = fareCalculation.basePrice;
            let discountAmount = 0;
            let finalPrice = originalPrice;

            // Apply promotion if provided
            if (ticketData.promotionId) {
                const promotion = await Promotion.findByPk(ticketData.promotionId);
                if (promotion && promotion.isCurrentlyValid()) {
                    // Validate promotion applicability for short-term tickets
                    if (promotion.applicableTicketTypes.length === 0 || 
                        promotion.applicableTicketTypes.includes(ticketData.tripType.toLowerCase())) {
                        discountAmount = promotion.calculateDiscount(originalPrice);
                        finalPrice = originalPrice - discountAmount;
                        
                        // Increment promotion usage
                        await promotion.incrementUsage();
                    } else {
                        logger.warn('Promotion not applicable to ticket type', {
                            promotionId: ticketData.promotionId,
                            ticketType: ticketData.tripType
                        });
                        ticketData.promotionId = null;
                    }
                } else {
                    logger.warn('Invalid promotion provided', { promotionId: ticketData.promotionId });
                    ticketData.promotionId = null;
                }
            }

            // Calculate validity period for short-term tickets (30 days validity)
            const validFrom = new Date();
            const validUntil = new Date(validFrom);
            validUntil.setDate(validUntil.getDate() + 30);

            // Generate QR code data for the new ticket
            const qrData = {
                passengerId: ticketData.passengerId,
                originStationId: fareCalculation.originStationId,
                destinationStationId: fareCalculation.destinationStationId,
                validFrom: validFrom,
                validUntil: validUntil,
                status: 'active',
                ticketType: ticketData.tripType.toLowerCase(),
                totalPrice: finalPrice,
                totalPassengers: fareCalculation.totalPassengers,
                passengerBreakdown: fareCalculation.passengerBreakdown,
                createdAt: new Date().toISOString()
            };

            // Generate QR code as base64
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

            // Generate payment ID for this ticket
            const paymentId = generatePaymentId(null, 'short-term'); // Will be updated after ticket creation

            logger.info('Creating ticket with initial payment ID', { 
                initialPaymentId: paymentId,
                ticketData: {
                    passengerId: ticketData.passengerId,
                    tripType: ticketData.tripType,
                    totalPrice: finalPrice
                }
            });

            // Create ticket with QR code
            const ticket = await Ticket.create({
                passengerId: ticketData.passengerId,
                tripId: ticketData.tripId || null,
                fareId: fare.fareId,
                promotionId: ticketData.promotionId || null,
                originStationId: fareCalculation.originStationId,
                destinationStationId: fareCalculation.destinationStationId,
                originalPrice: originalPrice,
                discountAmount: discountAmount,
                finalPrice: finalPrice,
                totalPrice: finalPrice,
                validFrom: validFrom,
                validUntil: validUntil,
                ticketType: ticketData.tripType.toLowerCase(),
                status: 'pending_payment', 
                stationCount: fareCalculation.stationCount,
                fareBreakdown: {
                    ...fareCalculation.priceBreakdown,
                    passengerBreakdown: fareCalculation.passengerBreakdown,
                    totalPassengers: fareCalculation.totalPassengers
                },
                paymentMethod: ticketData.paymentMethod,
                paymentId: paymentId,
                qrCode: qrCodeData
            });

            // Update paymentId with actual ticket ID
            const finalPaymentId = generatePaymentId(ticket.ticketId, 'short-term');
            
            logger.info('Updating ticket with final payment ID', {
                ticketId: ticket.ticketId,
                initialPaymentId: paymentId,
                finalPaymentId: finalPaymentId
            });

            ticket.paymentId = finalPaymentId;
            await ticket.save();

            // Publish ticket created event with redirect URLs
            const publishedPaymentId = await publishTicketCreated(ticket, 'short-term', {
                paymentSuccessUrl: ticketData.paymentSuccessUrl,
                paymentFailUrl: ticketData.paymentFailUrl,
                currency: ticketData.currency || 'VND'
            });

            // Log URLs for debugging
            logger.info('Ticket created with payment URLs', {
                ticketId: ticket.ticketId,
                paymentId: publishedPaymentId,
                hasPaymentSuccessUrl: !!ticketData.paymentSuccessUrl,
                hasPaymentFailUrl: !!ticketData.paymentFailUrl,
                paymentSuccessUrl: ticketData.paymentSuccessUrl,
                paymentFailUrl: ticketData.paymentFailUrl
            });

            // If waitForPayment is true, wait for payment response
            let paymentResponse = null;
            if (ticketData.waitForPayment !== false) {
                paymentResponse = await this.waitForPaymentResponse(publishedPaymentId, 60000); // 60 seconds timeout
            }

            logger.info('Short-term ticket created successfully', { 
                ticketId: ticket.ticketId, 
                paymentId: publishedPaymentId,
                passengerId: ticket.passengerId, 
                tripType: ticketData.tripType,
                stationCount: fareCalculation.stationCount,
                totalPrice: finalPrice,
                totalPassengers: fareCalculation.totalPassengers,
                passengerBreakdown: fareCalculation.passengerBreakdown,
                originStationId: fareCalculation.originStationId,
                destinationStationId: fareCalculation.destinationStationId,
                paymentResponse: paymentResponse ? 'received' : 'timeout'
            });

            return {
                ticket,
                paymentId: publishedPaymentId,
                paymentResponse
            };
        } catch (error) {
            logger.error('Error creating short-term ticket', { error: error.message, ticketData });
            throw error;
        }
    }

    /**
     * Create a long-term ticket (pass-based) using TransitPass model pricing
     * @param {Object} ticketData - The ticket data
     * @param {string} ticketData.routeId - The route ID (optional for passes that work on all routes)
     * @param {string} ticketData.passengerId - The passenger ID
     * @param {Object} ticketData.passengerInfo - The passenger info (including dateOfBirth)
     * @param {string} ticketData.passType - Pass type (day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass)
     * @param {string} ticketData.promotionId - The promotion ID (optional)
     * @param {string} ticketData.paymentMethod - Payment method
     * @param {string} ticketData.paymentId - Payment ID (optional)
     * @param {boolean} ticketData.waitForPayment - Whether to wait for payment response (default: true)
     * @param {string} ticketData.paymentSuccessUrl - URL to redirect after successful payment (optional)
     * @param {string} ticketData.paymentFailUrl - URL to redirect after failed payment (optional)
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async createLongTermTicket(ticketData) {
        try {
            // Validate required fields
            if (!ticketData.passType) {
                throw new Error('Pass type is required for long-term tickets');
            }

            const validPassTypes = TransitPass.transitPassType;
            if (!validPassTypes.includes(ticketData.passType.toLowerCase())) {
                throw new Error(`Invalid pass type. Must be one of: ${validPassTypes.join(', ')}`);
            }

            // Get transit pass pricing from TransitPass model
            const transitPass = await TransitPass.findOne({
                where: {
                    transitPassType: ticketData.passType,
                    isActive: true
                }
            });

            if (!transitPass) {
                throw new Error(`No active pricing found for pass type: ${ticketData.passType}`);
            }

            // Determine passenger type based on age
            let passengerType = 'adult';
            if (ticketData.passengerInfo && ticketData.passengerInfo.dateOfBirth) {
                let age = new Date(Date.now() - new Date(ticketData.passengerInfo.dateOfBirth));
                age = age.getUTCFullYear() - 1970;
                
                if (age < 12) {
                    passengerType = 'child';
                } else if (age < 18) {
                    passengerType = 'teen';
                } else if (age > 60) {
                    passengerType = 'senior';
                } else {
                    passengerType = 'adult';
                }
            }

            // Apply passenger type discount if applicable
            let originalPrice = parseFloat(transitPass.price);
            
            switch(passengerType) {
                case 'child':
                    originalPrice = originalPrice * 0.5; // 50% discount for children
                    break;
                case 'teen':
                    originalPrice = originalPrice * 0.7; // 30% discount for teenagers
                    break;
                case 'senior':
                    originalPrice = 0; // 100% discount for seniors
                    break;
                default:
                    // Adult price remains as is
                    break;
            }

            let discountAmount = 0;
            let finalPrice = originalPrice;

            // Apply promotion if provided
            if (ticketData.promotionId) {
                const promotion = await Promotion.findByPk(ticketData.promotionId);
                if (promotion && promotion.isCurrentlyValid()) {
                    // Validate promotion applicability for long-term tickets
                    if (promotion.applicableTicketTypes.length === 0 || 
                        promotion.applicableTicketTypes.includes(ticketData.passType)) {
                        discountAmount = promotion.calculateDiscount(originalPrice);
                        finalPrice = originalPrice - discountAmount;
                        
                        // Increment promotion usage
                        await promotion.incrementUsage();
                    } else {
                        logger.warn('Promotion not applicable to pass type', {
                            promotionId: ticketData.promotionId,
                            passType: ticketData.passType
                        });
                        ticketData.promotionId = null;
                    }
                } else {
                    logger.warn('Invalid promotion provided', { promotionId: ticketData.promotionId });
                    ticketData.promotionId = null;
                }
            }

            // Calculate validity period based on pass type
            const { validFrom, validUntil } = Ticket.calculateValidityPeriod(ticketData.passType);

            // Generate QR code data for the new pass ticket
            const qrData = {
                passengerId: ticketData.passengerId,
                passType: ticketData.passType,
                validFrom: validFrom,
                validUntil: validUntil,
                status: 'active',
                ticketType: ticketData.passType,
                totalPrice: finalPrice,
                createdAt: new Date().toISOString()
            };

            // Generate QR code as base64
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

            // Generate payment ID for this ticket
            const paymentId = generatePaymentId(null, 'long-term'); // Will be updated after ticket creation

            // Create ticket for long-term pass with QR code
            const ticket = await Ticket.create({
                passengerId: ticketData.passengerId,
                tripId: null, // Passes are not tied to specific trips
                fareId: null, // Long-term tickets don't use fare model
                promotionId: ticketData.promotionId || null,
                originStationId: null, // Passes work between any stations
                destinationStationId: null, // Passes work between any stations
                originalPrice: originalPrice,
                discountAmount: discountAmount,
                finalPrice: finalPrice,
                totalPrice: finalPrice,
                validFrom: validFrom,
                validUntil: validUntil,
                ticketType: ticketData.passType,
                status: 'pending_payment', // Changed from 'active' to 'pending_payment'
                stationCount: null, // Not applicable for passes
                fareBreakdown: {
                    passType: ticketData.passType,
                    originalPassPrice: parseFloat(transitPass.price),
                    passengerType: passengerType,
                    passengerDiscount: originalPrice !== parseFloat(transitPass.price) ? parseFloat(transitPass.price) - originalPrice : 0,
                    finalPrice: finalPrice,
                    currency: transitPass.currency
                },
                paymentMethod: ticketData.paymentMethod || 'vnpay',
                paymentId: paymentId,
                qrCode: qrCodeData
            });

            // Update paymentId with actual ticket ID
            const finalPaymentId = generatePaymentId(ticket.ticketId, 'long-term');
            ticket.paymentId = finalPaymentId;
            await ticket.save();

            // Publish ticket created event with redirect URLs
            const publishedPaymentId = await publishTicketCreated(ticket, 'long-term', {
                paymentSuccessUrl: ticketData.paymentSuccessUrl,
                paymentFailUrl: ticketData.paymentFailUrl,
                currency: ticketData.currency || 'VND'
            });
            
            // If waitForPayment is true, wait for payment response
            let paymentResponse = null;
            if (ticketData.waitForPayment !== false) {
                paymentResponse = await this.waitForPaymentResponse(publishedPaymentId, 30000); // 30 seconds timeout
            }

            logger.info('Long-term ticket created successfully', { 
                ticketId: ticket.ticketId, 
                paymentId: publishedPaymentId,
                passengerId: ticket.passengerId, 
                passType: ticketData.passType,
                totalPrice: finalPrice,
                passengerType: passengerType,
                validFrom: validFrom,
                validUntil: validUntil,
                paymentResponse: paymentResponse ? 'received' : 'timeout'
            });

            return {
                ticket,
                paymentId: publishedPaymentId,
                paymentResponse
            };
        } catch (error) {
            logger.error('Error creating long-term ticket', { error: error.message, ticketData });
            throw error;
        }
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
                            attributes: ['ticketId', 'paymentId', 'status', 'paymentMethod', 'updatedAt']
                        });
                    }, 5); // Very short cache for payment checks

                    // Fallback: try to find by ticket ID
                    let ticketById = null;
                    if (!ticket && ticketIdFromPaymentId) {
                        ticketById = await Ticket.findByPk(ticketIdFromPaymentId, {
                            attributes: ['ticketId', 'paymentId', 'status', 'paymentMethod', 'updatedAt']
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

    async getAllTickets(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.passengerId) {
                where.passengerId = filters.passengerId;
            }
            
            if (filters.tripId) {
                where.tripId = filters.tripId;
            }
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.ticketType) {
                where.ticketType = filters.ticketType;
            }
            
            if (filters.originStationId) {
                where.originStationId = filters.originStationId;
            }
            
            if (filters.destinationStationId) {
                where.destinationStationId = filters.destinationStationId;
            }

            if (filters.validFromStart && filters.validFromEnd) {
                where.validFrom = {
                    [Op.between]: [filters.validFromStart, filters.validFromEnd]
                };
            }

            if (filters.notes) {
                where.notes = {
                    [Op.like]: `%${filters.notes}%`
                };
            }

            if (filters.specialRequests) {
                where.specialRequests = {
                    [Op.like]: `%${filters.specialRequests}%`
                };
            }

            // Optimize query with proper indexing and eager loading
            const tickets = await Ticket.findAll({
                where,
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive'],
                        required: false // Use LEFT JOIN instead of INNER JOIN
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type', 'value'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']],
                // Add query optimization hints
                subQuery: false, // Prevent unnecessary subqueries
                distinct: true // Ensure unique results
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching tickets', { error: error.message, filters });
            throw error;
        }
    }

    async getTicketById(ticketId) {
        try {
            const cacheKey = `ticket:${ticketId}`;
            
            return await this.getCachedOrFetch(cacheKey, async () => {
                const ticket = await Ticket.findByPk(ticketId, {
                    include: [
                        {
                            model: Fare,
                            as: 'fare',
                            attributes: ['fareId', 'basePrice', 'routeId', 'currency', 'isActive']
                        },
                        {
                            model: Promotion,
                            as: 'promotion',
                            attributes: ['promotionId', 'code', 'name', 'type', 'value', 'description'],
                            required: false
                        }
                    ]
                });
                
                if (!ticket) {
                    throw new Error('Ticket not found');
                }
                
                return ticket;
            }, 600); // Cache for 10 minutes
            
        } catch (error) {
            logger.error('Error fetching ticket by ID', { error: error.message, ticketId });
            throw error;
        }
    }

    async getTicketsByPassenger(passengerId, filters = {}) {
        try {
            const where = { passengerId };
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }

            const tickets = await Ticket.findAll({
                where,
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type'],
                        required: false
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getActiveTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'active',
                    isActive: true,
                    validFrom: { [Op.lte]: new Date() },
                    validUntil: { [Op.gte]: new Date() }
                },
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'basePrice']
                    }
                ],
                order: [['validFrom', 'ASC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching active tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getInactiveTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'used'
                },
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type'],
                        required: false
                    }
                ],
                order: [['usedAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching inactive tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getCancelledTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    status: 'cancelled'
                },
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type'],
                        required: false
                    }
                ],
                order: [['updatedAt', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching cancelled tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getExpiredTicketsByPassenger(passengerId) {
        try {
            const tickets = await Ticket.findAll({
                where: {
                    passengerId,
                    [Op.or]: [
                        { status: 'expired' },
                        {
                            status: 'active',
                            validUntil: { [Op.lt]: new Date() }
                        }
                    ]
                },
                include: [
                    {
                        model: Fare,
                        as: 'fare',
                        attributes: ['fareId', 'routeId', 'basePrice', 'currency', 'isActive']
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        attributes: ['promotionId', 'code', 'name', 'type'],
                        required: false
                    }
                ],
                order: [['validUntil', 'DESC']]
            });
            
            return tickets;
        } catch (error) {
            logger.error('Error fetching expired tickets by passenger', { error: error.message, passengerId });
            throw error;
        }
    }

    async getTicketWithQR(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            const qrData = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                status: ticket.status,
                totalPrice: ticket.totalPrice,
                generatedAt: new Date().toISOString()
            };
            
            // Generate QR code (in real implementation, you would use a QR code library)
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
            
            logger.info('Ticket with QR code retrieved', { ticketId, passengerId });
            
            return {
                ticket,
                qrCode: {
                    data: qrCodeData,
                    format: 'base64',
                    metadata: qrData
                }
            };
        } catch (error) {
            logger.error('Error getting ticket with QR', { error: error.message, ticketId });
            throw error;
        }
    }

    async sendTicketToPhone(ticketId, phoneNumber, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate ticket data for SMS
            const ticketSummary = {
                ticketId: ticket.ticketId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                totalPrice: ticket.totalPrice,
                status: ticket.status
            };
            
            
            logger.info('Ticket sent to phone', { 
                ticketId, 
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${phoneNumber.replace(/\d(?=\d{4})/g, '*')}`,
                ticketSummary,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to phone', { error: error.message, ticketId });
            throw error;
        }
    }

    async sendTicketToEmail(ticketId, email, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate detailed ticket data for email
            const ticketDetails = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                ticketType: ticket.ticketType,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                basePrice: ticket.basePrice,
                discountAmount: ticket.discountAmount,
                totalPrice: ticket.totalPrice,
                status: ticket.status,
                fare: ticket.fare,
                promotion: ticket.promotion
            };
            
            // In real implementation, you would send email here
            logger.info('Ticket sent to email', { 
                ticketId, 
                email: email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`,
                ticketDetails,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to email', { error: error.message, ticketId });
            throw error;
        }
    }

    async cancelTicket(ticketId, reason = 'Passenger cancellation', passengerId = null) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            // If passengerId is provided, validate ownership
            if (passengerId && ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot cancel a used ticket');
            }
            
            if (ticket.status === 'cancelled') {
                throw new Error('Ticket is already cancelled');
            }

            const updatedTicket = await ticket.update({
                status: 'cancelled',
                isActive: false,
                cancelledAt: new Date(),
                cancellationReason: reason
            });
            
            logger.info('Ticket cancelled successfully', { ticketId, passengerId: ticket.passengerId, reason });
            return updatedTicket;
        } catch (error) {
            logger.error('Error cancelling ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async validateTicket(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                return { valid: false, reason: 'Ticket not found' };
            }
            
            if (!ticket.isValid()) {
                const now = new Date();
                if (ticket.validUntil < now) {
                    return { valid: false, reason: 'Ticket has expired' };
                }
                if (ticket.validFrom > now) {
                    return { valid: false, reason: 'Ticket is not yet valid' };
                }
                if (ticket.status !== 'active') {
                    return { valid: false, reason: `Ticket status is ${ticket.status}` };
                }
                if (!ticket.isActive) {
                    return { valid: false, reason: 'Ticket is deactivated' };
                }
            }
            
            return { 
                valid: true, 
                ticket: {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    ticketType: ticket.ticketType,
                    validFrom: ticket.validFrom,
                    validUntil: ticket.validUntil,
                    originStationId: ticket.originStationId,
                    destinationStationId: ticket.destinationStationId,
                    totalPrice: ticket.totalPrice
                }
            };
        } catch (error) {
            logger.error('Error validating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async getTicketDetail(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            return ticket;
        } catch (error) {
            logger.error('Error fetching ticket detail', { error: error.message, ticketId });
            throw error;
        }
    }

    async updateTicket(ticketId, updateData) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            // Prevent updating critical fields
            const allowedFields = ['notes', 'specialRequests'];
            const filteredData = {};
            
            Object.keys(updateData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = updateData[key];
                }
            });
            
            const updatedTicket = await ticket.update(filteredData);
            
            logger.info('Ticket updated successfully', { ticketId, updatedFields: Object.keys(filteredData) });
            
            return updatedTicket;
        } catch (error) {
            logger.error('Error updating ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async deleteTicket(ticketId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.status === 'used') {
                throw new Error('Cannot delete a used ticket');
            }
            
            await ticket.destroy();
            
            logger.info('Ticket deleted successfully', { ticketId });
            
            return true;
        } catch (error) {
            logger.error('Error deleting ticket', { error: error.message, ticketId });
            throw error;
        }
    }

    async getTicketStatistics(filters = {}) {
        try {
            const where = { isActive: true };
            
            if (filters.dateFrom && filters.dateTo) {
                where.createdAt = {
                    [Op.between]: [filters.dateFrom, filters.dateTo]
                };
            }
            
            if (filters.passengerId) {
                where.passengerId = filters.passengerId;
            }

            const stats = await Ticket.findAll({
                where,
                attributes: [
                    'status',
                    'ticketType',
                    [Ticket.sequelize.fn('COUNT', '*'), 'count'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('totalPrice')), 'totalRevenue'],
                    [Ticket.sequelize.fn('AVG', Ticket.sequelize.col('totalPrice')), 'averagePrice'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('basePrice')), 'totalBaseRevenue'],
                    [Ticket.sequelize.fn('SUM', Ticket.sequelize.col('discountAmount')), 'totalDiscounts']
                ],
                group: ['status', 'ticketType'],
                raw: true
            });
            
            return stats;
        } catch (error) {
            logger.error('Error generating ticket statistics', { error: error.message, filters });
            throw error;
        }
    }

    async expireTickets() {
        try {
            // Use batch processing for better performance
            const batchSize = 1000;
            let totalUpdated = 0;
            let hasMore = true;
            
            while (hasMore) {
                const expiredTickets = await Ticket.update(
                    { status: 'expired' },
                    {
                        where: {
                            status: 'active',
                            validUntil: { [Op.lt]: new Date() },
                            isActive: true
                        },
                        limit: batchSize,
                        returning: true
                    }
                );
                
                const updatedCount = expiredTickets[0];
                totalUpdated += updatedCount;
                
                // Check if we processed all records
                hasMore = updatedCount === batchSize;
                
                logger.debug('Batch expired tickets updated', { 
                    batchCount: updatedCount, 
                    totalUpdated,
                    hasMore 
                });
            }
            
            // Invalidate related caches
            this.invalidateCache('ticket:');
            this.invalidateCache('passenger:');
            
            logger.info('Expired tickets updated', { totalUpdated });
            return totalUpdated;
        } catch (error) {
            logger.error('Error expiring tickets', { error: error.message });
            throw error;
        }
    }

    /**
     * Create ticket for guest user (no account required)
     * @param {Object} ticketData 
     * @param {string} contactInfo - Email or phone number
     */
    async createGuestTicket(ticketData, contactInfo) {
        try {
            // Validate contact info format
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo);
            const isPhone = /^\+?[\d\s-]{10,}$/.test(contactInfo);
            
            if (!isEmail && !isPhone) {
                throw new Error('Invalid contact information. Please provide a valid email or phone number.');
            }

            // Create ticket without passenger ID
            const ticket = await this.createTicket({
                ...ticketData,
                guestContact: contactInfo,
                warningMessage: 'System is not responsible for lost or inaccessible e-tickets after issuance.'
            });

            // Send ticket to guest
            if (isEmail) {
                await this.sendTicketToEmail(ticket.ticketId, contactInfo);
            } else {
                await this.sendTicketToPhone(ticket.ticketId, contactInfo);
            }

            return {
                ticket,
                contactMethod: isEmail ? 'email' : 'phone',
                contactInfo: isEmail ? 
                    contactInfo.replace(/(.{2})(.*)(@.*)/, '$1***$3') : 
                    contactInfo.replace(/\d(?=\d{4})/g, '*')
            };
        } catch (error) {
            logger.error('Error creating guest ticket', { error: error.message, contactInfo });
            throw error;
        }
    }

    /**
     * Validate ticket for station entry/exit
     * @param {string} ticketId 
     * @param {string} stationId 
     * @param {'entry'|'exit'} action
     */
    async validateTicketAtGate(ticketId, stationId, action = 'entry') {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            // Check ticket validity
            if (!ticket.isValid()) {
                return {
                    valid: false,
                    reason: ticket.isExpired() ? 'Ticket has expired' : 'Ticket is not valid'
                };
            }

            // For unlimited passes
            if (ticket.ticketType.includes('pass')) {
                return { valid: true };
            }

            // For entry
            if (action === 'entry') {
                if (ticket.originStationId !== stationId) {
                    return {
                        valid: false,
                        reason: 'Invalid entry station'
                    };
                }
                return { valid: true };
            }

            // For exit
            const exitValidation = await this.fareService.validateExitStation(ticketId, stationId);
            return exitValidation;

        } catch (error) {
            logger.error('Error validating ticket at gate', {
                error: error.message,
                ticketId,
                stationId,
                action
            });
            throw error;
        }
    }

    /**
     * Pay additional fare for extended journey
     * @param {string} ticketId 
     * @param {string} newExitStationId 
     */
    async payAdditionalFare(ticketId, newExitStationId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            const fareCalculation = await this.fareService.validateExitStation(ticketId, newExitStationId);
            if (!fareCalculation.additionalFare) {
                throw new Error('No additional fare required');
            }

            // Create a new ticket for the extension
            const extensionTicket = await this.createTicket({
                routeId: ticket.routeId,
                originStationId: ticket.destinationStationId,
                destinationStationId: newExitStationId,
                ticketType: 'oneway',
                passengerType: ticket.passengerType,
                originalTicketId: ticketId
            });

            return {
                originalTicket: ticket,
                extensionTicket,
                additionalFare: fareCalculation.additionalFare
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

    /**
     * Create tickets from booking data
     * @param {Object} bookingData 
     * @param {string} [guestContact] Optional contact for guest bookings
     */
    async createTicketsFromBooking(bookingData, guestContact = null) {
        try {
            // Validate booking data
            if (!bookingData.fromStation || !bookingData.toStation) {
                throw new Error('Origin and destination stations are required');
            }

            // Get fare for the route
            const fare = await this.fareService.getFareForRoute(
                bookingData.routeId,
                bookingData.tripType,
                'adult' // Default to adult fare for initial calculation
            );

            // Calculate station count
            const stationCount = await this.fareService.calculateStationCount(
                bookingData.routeId,
                bookingData.fromStation,
                bookingData.toStation
            );

            // Generate tickets using model helper
            const tickets = await Ticket.generateTicketsFromBooking(
                bookingData,
                fare,
                bookingData.promotionCode ? await this.getValidPromotion(bookingData.promotionCode) : null,
                stationCount
            );

            // For guest bookings, send tickets
            if (guestContact) {
                const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestContact);
                for (const ticket of tickets) {
                    if (isEmail) {
                        await this.sendTicketToEmail(ticket.ticketId, guestContact);
                    } else {
                        await this.sendTicketToPhone(ticket.ticketId, guestContact);
                    }
                }
            }

            return {
                tickets,
                totalAmount: tickets.reduce((sum, t) => sum + t.finalPrice, 0),
                currency: fare.currency,
                isGuest: !!guestContact,
                contactInfo: guestContact ? this.maskContactInfo(guestContact) : null,
                warningMessage: guestContact ? 
                    'System is not responsible for lost or inaccessible e-tickets after issuance.' : null
            };
        } catch (error) {
            logger.error('Error creating tickets from booking', {
                error: error.message,
                bookingData
            });
            throw error;
        }
    }

    /**
     * Upgrade an existing pass to a higher tier
     * @param {string} currentTicketId 
     * @param {string} newPassType 
     */
    async upgradePass(currentTicketId, newPassType) {
        try {
            // Calculate upgrade cost
            const upgradeDetails = await this.fareService.calculatePassUpgrade(
                currentTicketId,
                newPassType
            );

            // Create new pass ticket
            const currentTicket = await Ticket.findByPk(currentTicketId);
            const newTicket = await this.createTicket({
                routeId: currentTicket.routeId,
                passengerId: currentTicket.passengerId,
                ticketType: newPassType,
                originalPrice: upgradeDetails.newPassPrice,
                finalPrice: upgradeDetails.upgradeCost,
                upgradedFromTicketId: currentTicketId
            });

            // Deactivate old ticket
            await currentTicket.update({
                status: 'upgraded',
                upgradedToTicketId: newTicket.ticketId
            });

            return {
                oldTicket: currentTicket,
                newTicket,
                upgradeCost: upgradeDetails.upgradeCost,
                currency: upgradeDetails.currency
            };
        } catch (error) {
            logger.error('Error upgrading pass', {
                error: error.message,
                currentTicketId,
                newPassType
            });
            throw error;
        }
    }

    /**
     * Mask contact information for privacy
     * @private
     */
    maskContactInfo(contact) {
        if (/@/.test(contact)) {
            return contact.replace(/(.{2})(.*)(@.*)/, '$1***$3');
        }
        return contact.replace(/\d(?=\d{4})/g, '*');
    }

    /**
     * Get valid promotion by code
     * @private
     */
    async getValidPromotion(code) {
        const promotion = await Promotion.findOne({
            where: {
                code,
                isActive: true,
                validFrom: { [Op.lte]: new Date() },
                validUntil: { [Op.gte]: new Date() }
            }
        });
        return promotion;
    }
}

module.exports = new TicketService();
