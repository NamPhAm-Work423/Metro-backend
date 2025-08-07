const { Ticket, Fare, Promotion, TransitPass, PassengerDiscount } = require('../../../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../../../config/logger');
const FareService = require('../../fare.service');
const ITicketService = require('../interfaces/ITicketService');

// Import other services
const TicketRepository = require('../repositories/TicketRepository');
const TicketValidatorService = require('./TicketValidatorService');
const TicketCommunicationService = require('./TicketCommunicationService');
const TicketPaymentService = require('./TicketPaymentService');
const TicketPriceCalculator = require('../calculators/TicketPriceCalculator');

class TicketService extends ITicketService {
    constructor() {
        super();
        this.fareService = FareService;
        this.repository = TicketRepository;
        this.validator = TicketValidatorService;
        this.communication = TicketCommunicationService;
        this.payment = TicketPaymentService;
        this.priceCalculator = TicketPriceCalculator;
    }

    /**
     * Create a short-term ticket (oneway or return) based on station count and fare calculation
     * @param {Object} ticketData - The ticket data
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

            // Use TicketPriceCalculator to get comprehensive price calculation
            const priceCalculation = await this.priceCalculator.calculateTotalPriceForPassengers(
                ticketData.fromStation,
                ticketData.toStation,
                ticketData.tripType,
                {
                    numAdults: ticketData.numAdults || 0,
                    numElder: ticketData.numElder || 0,
                    numTeenager: ticketData.numTeenager || 0,
                    numChild: ticketData.numChild || 0,
                    numSenior: ticketData.numSenior || 0,
                    numStudent: ticketData.numStudent || 0
                },
                ticketData.promotionCode ? { promotionCode: ticketData.promotionCode } : null
            );

            // Extract values from price calculation
            const { 
                totalPrice: finalPrice, 
                totalOriginalPrice: originalPrice, 
                totalDiscountAmount: discountAmount, 
                appliedPromotion,
                journeyDetails,
                segmentFares,
                passengerBreakdown
            } = priceCalculation.data;
            
            // Validate finalPrice is not zero or negative
            if (!finalPrice || finalPrice <= 0) {
                logger.error('Invalid final price calculated', { 
                    finalPrice, 
                    priceCalculation: priceCalculation.data
                });
                throw new Error('Payment amount is not valid (<= 0). Please check the ticket information or promotion.');
            }

            // Get fare record for association (using the first segment's routeId)
            const firstSegment = segmentFares[0];
            const fare = await Fare.findOne({
                where: {
                    routeId: firstSegment.routeId,
                    isActive: true
                }
            });

            if (!fare) {
                throw new Error(`No active fare found for route ${firstSegment.routeId}`);
            }
            
            // Set promotionId if promotion was applied
            if (appliedPromotion) {
                ticketData.promotionId = appliedPromotion.promotionId;
                logger.info('Promotion applied in ticket creation', {
                    promotionCode: ticketData.promotionCode,
                    promotionDiscountAmount: appliedPromotion.discountAmount,
                    finalPriceAfterPromotion: finalPrice
                });
            } else if (ticketData.promotionCode) {
                logger.warn('Promotion not applied', { promotionCode: ticketData.promotionCode });
                ticketData.promotionId = null;
            }

            // Calculate validity period for short-term tickets (30 days validity)
            const validFrom = new Date();
            const validUntil = new Date(validFrom);
            validUntil.setDate(validUntil.getDate() + 30);

            // Generate QR code data for the new ticket
            const qrData = this.communication.generateQRData({
                passengerId: ticketData.passengerId,
                originStationId: journeyDetails.routeSegments[0].originStationId,
                destinationStationId: journeyDetails.routeSegments[journeyDetails.routeSegments.length - 1].destinationStationId,
                validFrom: validFrom,
                validUntil: validUntil,
                ticketType: ticketData.tripType.toLowerCase(),
                totalPrice: finalPrice,
                fareBreakdown: {
                    totalPassengers: journeyDetails.totalPassengers || totalPassengers,
                    passengerBreakdown: passengerBreakdown,
                    journeyDetails: journeyDetails
                }
            });

            // Generate QR code as base64
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

            // Create ticket with QR code
            const ticket = await this.repository.create({
                passengerId: ticketData.passengerId,
                tripId: ticketData.tripId || null,
                fareId: fare.fareId,
                promotionId: ticketData.promotionId || null,
                originStationId: journeyDetails.routeSegments[0].originStationId,
                destinationStationId: journeyDetails.routeSegments[journeyDetails.routeSegments.length - 1].destinationStationId,
                originalPrice: originalPrice,
                discountAmount: discountAmount,
                finalPrice: finalPrice,
                totalPrice: finalPrice,
                validFrom: validFrom,
                validUntil: validUntil,
                ticketType: ticketData.tripType.toLowerCase(),
                status: 'pending_payment', 
                stationCount: journeyDetails.totalStations,
                fareBreakdown: {
                    journeyDetails: journeyDetails,
                    segmentFares: segmentFares,
                    passengerBreakdown: passengerBreakdown,
                    totalPassengers: journeyDetails.totalPassengers || totalPassengers
                },
                paymentMethod: ticketData.paymentMethod,
                qrCode: qrCodeData
            });

            // Process payment
            const paymentAmount = Number(finalPrice || 0).toFixed(2);
            
            // Validate payment amount before calling payment service
            if (Number(paymentAmount) <= 0) {
                logger.error('Cannot process payment: payment amount is zero or negative', { 
                    paymentAmount, 
                    finalPrice, 
                    ticketId: ticket.ticketId 
                });
                throw new Error('Payment amount is not valid (<= 0). Please check the ticket information or promotion.');
            }
            
            const paymentResult = await this.payment.processTicketPayment(ticket, 'short-term', {
                paymentSuccessUrl: ticketData.paymentSuccessUrl,
                paymentFailUrl: ticketData.paymentFailUrl,
                currency: ticketData.currency || 'VND',
                amount: paymentAmount
            });

            // If waitForPayment is true, wait for payment response
            let paymentResponse = null;
            if (ticketData.waitForPayment !== false) {
                paymentResponse = await this.payment.waitForPaymentResponse(paymentResult.paymentId, 60000); // 60 seconds timeout
            }

            logger.info('Short-term ticket created successfully', { 
                ticketId: ticket.ticketId, 
                paymentId: paymentResult.paymentId,
                passengerId: ticket.passengerId, 
                tripType: ticketData.tripType,
                stationCount: journeyDetails.totalStations,
                totalPrice: finalPrice,
                totalPassengers: journeyDetails.totalPassengers || totalPassengers,
                passengerBreakdown: passengerBreakdown,
                originStationId: journeyDetails.routeSegments[0].originStationId,
                destinationStationId: journeyDetails.routeSegments[journeyDetails.routeSegments.length - 1].destinationStationId,
                paymentResponse: paymentResponse ? 'received' : 'timeout'
            });

            return {
                ticket,
                paymentId: paymentResult.paymentId,
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
            if (ticketData.promotionCode) {
                const promotion = await Promotion.findOne({ 
                    where: { promotionCode: ticketData.promotionCode }
                });
                if (promotion && promotion.isCurrentlyValid()) {
                    // Validate promotion applicability for long-term tickets
                    if (promotion.applicableTicketTypes.length === 0 || 
                        promotion.applicableTicketTypes.includes(ticketData.passType)) {
                        discountAmount = promotion.calculateDiscount(originalPrice);
                        finalPrice = originalPrice - discountAmount;
                        
                        // Increment promotion usage
                        await promotion.incrementUsage();
                        
                        // Set promotionId for database reference
                        ticketData.promotionId = promotion.promotionId;
                    } else {
                        logger.warn('Promotion not applicable to pass type', {
                            promotionCode: ticketData.promotionCode,
                            passType: ticketData.passType
                        });
                        ticketData.promotionId = null;
                    }
                } else {
                    logger.warn('Invalid promotion provided', { promotionCode: ticketData.promotionCode });
                    ticketData.promotionId = null;
                }
            }

            // Calculate validity period based on pass type
            const { validFrom, validUntil } = Ticket.calculateValidityPeriod(ticketData.passType);

            // Generate QR code data for the new pass ticket
            const qrData = this.communication.generateQRData({
                passengerId: ticketData.passengerId,
                passType: ticketData.passType,
                validFrom: validFrom,
                validUntil: validUntil,
                ticketType: ticketData.passType,
                totalPrice: finalPrice
            });

            // Generate QR code as base64
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');

            // Create ticket for long-term pass with QR code
            const ticket = await this.repository.create({
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
                qrCode: qrCodeData
            });

            // Process payment
            const paymentAmount = Number(finalPrice || 0).toFixed(2);
            const paymentResult = await this.payment.processTicketPayment(ticket, 'long-term', {
                paymentSuccessUrl: ticketData.paymentSuccessUrl,
                paymentFailUrl: ticketData.paymentFailUrl,
                currency: ticketData.currency || 'VND',
                amount: paymentAmount
            });
            
            // If waitForPayment is true, wait for payment response
            let paymentResponse = null;
            if (ticketData.waitForPayment !== false) {
                paymentResponse = await this.payment.waitForPaymentResponse(paymentResult.paymentId, 30000); // 30 seconds timeout
            }

            logger.info('Long-term ticket created successfully', { 
                ticketId: ticket.ticketId, 
                paymentId: paymentResult.paymentId,
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
                paymentId: paymentResult.paymentId,
                paymentResponse
            };
        } catch (error) {
            logger.error('Error creating long-term ticket', { error: error.message, ticketData });
            throw error;
        }
    }

    /**
     * Create ticket for guest user (no account required)
     * @param {Object} ticketData - Ticket data
     * @param {string} contactInfo - Email or phone number
     * @returns {Promise<Object>} Created guest ticket
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
            const ticket = await this.createShortTermTicket({
                ...ticketData,
                guestContact: contactInfo,
                warningMessage: 'System is not responsible for lost or inaccessible e-tickets after issuance.'
            });

            // Send ticket to guest
            if (isEmail) {
                await this.communication.sendTicketToEmail(ticket.ticket.ticketId, contactInfo);
            } else {
                await this.communication.sendTicketToPhone(ticket.ticket.ticketId, contactInfo);
            }

            return {
                ticket,
                contactMethod: isEmail ? 'email' : 'phone',
                contactInfo: isEmail ? 
                    this.communication.maskEmail(contactInfo) : 
                    this.communication.maskPhoneNumber(contactInfo)
            };
        } catch (error) {
            logger.error('Error creating guest ticket', { error: error.message, contactInfo });
            throw error;
        }
    }

    /**
     * Get all tickets with optional filters
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of tickets
     */
    async getAllTickets(filters = {}) {
        return await this.repository.findAll(filters);
    }

    /**
     * Get ticket by ID
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Ticket object
     */
    async getTicketById(ticketId) {
        return await this.repository.findById(ticketId);
    }

    /**
     * Get tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} List of tickets
     */
    async getTicketsByPassenger(passengerId, filters = {}) {
        return await this.repository.findByPassengerId(passengerId, filters);
    }

    /**
     * Get active tickets by passenger ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Array>} List of active tickets
     */
    async getActiveTicketsByPassenger(passengerId) {
        return await this.repository.findAll({
            passengerId,
            status: 'active',
            isActive: true
        }, {
            include: [
                {
                    model: Fare,
                    as: 'fare',
                    attributes: ['fareId', 'basePrice']
                }
            ]
        });
    }

    /**
     * Update ticket
     * @param {string} ticketId - Ticket ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated ticket
     */
    async updateTicket(ticketId, updateData) {
        return await this.repository.update(ticketId, updateData);
    }

    /**
     * Cancel ticket
     * @param {string} ticketId - Ticket ID
     * @param {string} reason - Cancellation reason
     * @param {string} passengerId - Passenger ID (optional)
     * @returns {Promise<Object>} Cancelled ticket
     */
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

    /**
     * Validate ticket
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<Object>} Validation result
     */
    async validateTicket(ticketId) {
        return await this.validator.validateTicket(ticketId);
    }

    /**
     * Validate ticket at gate
     * @param {string} ticketId - Ticket ID
     * @param {string} stationId - Station ID
     * @param {string} action - 'entry' or 'exit'
     * @returns {Promise<Object>} Validation result
     */
    async validateTicketAtGate(ticketId, stationId, action = 'entry') {
        return await this.validator.validateTicketAtGate(ticketId, stationId, action);
    }

    /**
     * Send ticket to phone
     * @param {string} ticketId - Ticket ID
     * @param {string} phoneNumber - Phone number
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToPhone(ticketId, phoneNumber, passengerId) {
        return await this.communication.sendTicketToPhone(ticketId, phoneNumber, passengerId);
    }

    /**
     * Send ticket to email
     * @param {string} ticketId - Ticket ID
     * @param {string} email - Email address
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToEmail(ticketId, email, passengerId) {
        return await this.communication.sendTicketToEmail(ticketId, email, passengerId);
    }

    /**
     * Get ticket with QR code
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Ticket with QR code
     */
    async getTicketWithQR(ticketId, passengerId) {
        return await this.communication.getTicketWithQR(ticketId, passengerId);
    }

    /**
     * Get ticket statistics
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Array>} Ticket statistics
     */
    async getTicketStatistics(filters = {}) {
        return await this.repository.getStatistics(filters);
    }

    /**
     * Expire tickets (batch operation)
     * @returns {Promise<number>} Number of expired tickets
     */
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
            
            logger.info('Expired tickets updated', { totalUpdated });
            return totalUpdated;
        } catch (error) {
            logger.error('Error expiring tickets', { error: error.message });
            throw error;
        }
    }
}

module.exports = new TicketService();
