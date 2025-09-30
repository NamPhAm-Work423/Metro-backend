const { Ticket, Fare, Promotion, TransitPass, PassengerDiscount } = require('../../../models/index.model');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { logger } = require('../../../config/logger');
const FareService = require('../../fare.service');
const ITicketService = require('../interfaces/ITicketService');
const PassengerTypeHelper = require('../../../helpers/passengerType.helper');
const PaymentCompletionHandler = require('../handlers/PaymentCompletionHandler');
const IdempotencyHelper = require('../../../helpers/IdempotencyHelper');

// Import other services
const TicketRepository = require('../repositories/TicketRepository');
const TicketValidatorService = require('./TicketValidatorService');
const TicketCommunicationService = require('./TicketCommunicationService');
const TicketPaymentService = require('./TicketPaymentService');
const TicketPriceCalculator = require('../calculators/TicketPriceCalculator');
const TicketStatusService = require('./TicketStatusService');
const TicketAbused = require('../handlers/TicketAbused');
const RotationQRCode = require('../helpers/RotationQRCode.helper');

class TicketService extends ITicketService {
    constructor() {
        super();
        this.fareService = FareService;
        this.repository = TicketRepository;
        this.validator = TicketValidatorService;
        this.communication = TicketCommunicationService;
        this.payment = TicketPaymentService;
        this.priceCalculator = TicketPriceCalculator;
        this.statusService = TicketStatusService;
        this.idempotency = IdempotencyHelper;
    }

    /**
     * Private helper method to handle promotion logic
     * @param {Object} ticketData - Ticket data
     * @param {Object} promotion - Promotion object (can be model instance or plain object)
     * @param {string} ticketType - Type of ticket for validation
     * @returns {Object} Promotion result
     */
    async _handlePromotion(ticketData, promotion, ticketType = null) {
        if (!ticketData.promotionCode) {
            return { appliedPromotion: null, promotionId: null };
        }

        // Handle both model instance and plain object from TicketPriceCalculator
        if (!promotion) {
            logger.warn('No promotion provided', { promotionCode: ticketData.promotionCode });
            return { appliedPromotion: null, promotionId: null };
        }

        // Check if promotion is valid (handle both model instance and plain object)
        let isValid = false;
        if (typeof promotion.isCurrentlyValid === 'function') {
            // This is a model instance
            isValid = promotion.isCurrentlyValid();
        } else if (promotion.promotionId && promotion.promotionCode) {
            // This is a plain object from TicketPriceCalculator, assume it's valid if it exists
            isValid = true;
        }

        if (!isValid) {
            logger.warn('Invalid promotion provided', { promotionCode: ticketData.promotionCode });
            return { appliedPromotion: null, promotionId: null };
        }

        // Validate promotion applicability for specific ticket types
        if (ticketType && promotion.applicableTicketTypes && promotion.applicableTicketTypes.length > 0 && 
            !promotion.applicableTicketTypes.includes(ticketType)) {
            logger.warn('Promotion not applicable to ticket type', {
                promotionCode: ticketData.promotionCode,
                ticketType: ticketType
            });
            return { appliedPromotion: null, promotionId: null };
        }

        return {
            appliedPromotion: promotion,
            promotionId: promotion.promotionId
        };
    }

    /**
     * Generate QR payload that contains only ticketId and signature
     * @param {string} ticketId
     * @returns {string} Base64 encoded JSON string
     */
    _generateQRCode(ticketId) {
        try {
            if (!ticketId) {
                throw new Error('ticketId is required for QR generation');
            }

            const secret = process.env.TICKET_QR_SECRET;
            if (!secret) {
                throw new Error('TICKET_QR_SECRET is not configured');
            }

            const signature = crypto
                .createHmac('sha256', secret)
                .update(String(ticketId))
                .digest('hex');

            const payload = { ticketId, signature };
            const payloadString = JSON.stringify(payload);
            const qrCodeData = Buffer.from(payloadString).toString('base64');

            logger.info('QR code generated successfully', {
                ticketId,
                encodedSize: qrCodeData.length,
                hasSecret: !!secret
            });

            return qrCodeData;
        } catch (error) {
            logger.error('Failed to generate QR code', { 
                error: error.message, 
                ticketId,
                hasSecret: !!process.env.TICKET_QR_SECRET,
                stack: error.stack
            });
            throw new Error(`QR code generation failed: ${error.message}`);
        }
    }

    /**
     * Build payment redirect URLs with ENV fallback
     * @param {Object} ticketData
     * @returns {{success: string, fail: string}}
     */
    _getRedirectUrls(ticketData) {
        const base = process.env.PUBLIC_FRONTEND_URL || 'http://localhost:5173';
        const normalizedBase = String(base).replace(/\/$/, '');
        const success = ticketData?.paymentSuccessUrl || `${normalizedBase}/payment/success`;
        const fail = ticketData?.paymentFailUrl || `${normalizedBase}/payment/fail`;
        return { success, fail };
    }

    /**
     * Build a concise, enriched ticket usage payload for clients
     * @param {Object} ticket - Sequelize ticket instance
     * @returns {Object}
     */
    _buildTicketUsageInfo(ticket) {
        const info = {
            ticketId: ticket.ticketId,
            status: ticket.status,
            passengerId: ticket.passengerId,
            ticketType: ticket.ticketType,
            originStationId: ticket.originStationId,
            destinationStationId: ticket.destinationStationId,
            validFrom: ticket.validFrom,
            validUntil: ticket.validUntil,
            usedList: ticket.usedList,
            stationCount: ticket.stationCount,
            fareId: ticket.fareId,
            promotionId: ticket.promotionId,
            paymentMethod: ticket.paymentMethod,
            originalPrice: ticket.originalPrice,
            discountAmount: ticket.discountAmount,
            finalPrice: ticket.finalPrice,
            totalPrice: ticket.totalPrice,
            qrCode: ticket.qrCode
        };

        // Attach breakdowns conditionally to support both short-term and long-term
        const fb = ticket.fareBreakdown;
        if (fb && typeof fb === 'object') {
            info.fareBreakdown = fb;
            if (fb.passengerBreakdown) {
                info.passengerBreakdown = fb.passengerBreakdown;
            }
            if (fb.segmentFares) {
                info.segmentFares = fb.segmentFares;
            }
            if (fb.passengerType) {
                info.passengerType = fb.passengerType;
            }
        }

        return info;
    }

    /**
     * Private helper method to process payment
     * @param {Object} ticket - Ticket object
     * @param {string} ticketType - Type of ticket
     * @param {Object} paymentOptions - Payment options
     * @param {boolean} waitForPayment - Whether to wait for payment response
     * @param {number} timeout - Payment timeout in milliseconds
     * @returns {Promise<Object>} Payment result
     */
    async _processPayment(ticket, ticketType, paymentOptions, waitForPayment = true, timeout = 60000) {
        const amountNum = Number(paymentOptions.amount ?? 0);
        if (!Number.isFinite(amountNum)) {
            logger.error('Cannot process payment: payment amount is not a finite number', { 
                amountNum, 
                ticketId: ticket.ticketId 
            });
            throw new Error('Payment amount is invalid.');
        }

        // Handle zero-amount (free) tickets
        if (amountNum <= 0) {
            const longTermTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
            const isLongTerm = longTermTypes.includes(ticket.ticketType);

            // Only bypass external payment for long-term passes
            if (!isLongTerm) {
                logger.error('Cannot process payment: zero-amount is not allowed for short-term tickets', {
                    ticketId: ticket.ticketId,
                    ticketType: ticket.ticketType,
                    amountNum
                });
                throw new Error('Payment amount is not valid (<= 0).');
            }

            try {
                const updates = {
                    status: 'inactive',
                    paymentMethod: 'free',
                    paymentId: null,
                    updatedAt: new Date()
                };

                await this.repository.update(ticket.ticketId, updates);
                logger.info('Zero-amount long-term ticket processed without external payment', {
                    ticketId: ticket.ticketId,
                    ticketType,
                    mappedStatus: 'inactive'
                });

                return { paymentResult: { paymentId: null }, paymentResponse: null };
            } catch (updateError) {
                logger.error('Failed to finalize zero-amount long-term ticket', {
                    ticketId: ticket.ticketId,
                    error: updateError.message
                });
                throw updateError;
            }
        }
        
        
        const paymentResult = await this.payment.processTicketPayment(ticket, ticketType, paymentOptions);

        // If waitForPayment is true, wait for payment response
        let paymentResponse = null;
        if (waitForPayment !== false) {
            paymentResponse = await this.payment.waitForPaymentResponse(paymentResult.paymentId, timeout);
        }

        return { paymentResult, paymentResponse };
    }
    /**
     * Private helper method to normalize promotion input
     * @param {Object} input - Promotion input
     * @returns {string} Normalized promotion code
     */
    _normalizePromotion(input) {
        const code = input?.promotionCode ?? input?.promotion?.code ?? input?.promotionData?.promotionCode ?? null;
        return code ? String(code).trim() : null;
    }
    /**
     * Private helper method to increment promotion usage
     * @param {string} promotionId - Promotion ID
     * @param {string} promotionCode - Promotion code
     * @param {string} ticketId - Ticket ID
     * @param {string} context - Context for logging
     */
    async _incrementPromotionUsage(promotionId, promotionCode, ticketId, context = 'ticket creation') {
        if (!promotionId || !promotionCode) return;

        try {
            const promotion = await Promotion.findByPk(promotionId);
            if (promotion) {
                await promotion.incrementUsage();
                logger.info(`Promotion usage incremented after successful ${context}`, {
                    promotionId: promotionId,
                    promotionCode: promotionCode,
                    ticketId: ticketId
                });
            }
        } catch (promotionError) {
            logger.error(`Failed to increment promotion usage for ${context}`, {
                error: promotionError.message,
                promotionId: promotionId,
                ticketId: ticketId
            });
        }
    }

    /**
     * Private helper method to validate passenger counts
     * @param {Object} ticketData - Ticket data
     * @returns {number} Total passengers
     */
    _validatePassengerCounts(ticketData) {
        const totalPassengers = (ticketData.numAdults || 0) + (ticketData.numElder || 0) + 
                              (ticketData.numTeenager || 0) + (ticketData.numChild || 0) + 
                              (ticketData.numStudent || 0) + (ticketData.numSenior || 0);
        
        if (totalPassengers === 0) {
            throw new Error('At least one passenger is required');
        }
        
        return totalPassengers;
    }

    /**
     * Create a short-term ticket (oneway or return) based on station count and fare calculation
     * @param {Object} ticketData - The ticket data
     * @param {string} idempotencyKey - Optional custom idempotency key
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async createShortTermTicket(ticketData, idempotencyKey = null) {
        // Use custom idempotency key or generate one from ticket data
        const operation = 'create_short_term_ticket';
        
        return await this.idempotency.executeWithIdempotency(
            operation,
            idempotencyKey ? { customKey: idempotencyKey } : ticketData,
            async () => this._createShortTermTicketInternal(ticketData),
            ticketData.passengerId,
            1800 // 30 minutes TTL
        );
    }

    /**
     * Internal method for creating short-term ticket (wrapped by idempotency)
     * @param {Object} ticketData - The ticket data
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async _createShortTermTicketInternal(ticketData) {
        try {
            // Validate passenger counts (additional validation)
            const totalPassengers = this._validatePassengerCounts(ticketData);

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
            
            if (!finalPrice || finalPrice <= 0) {
                // Resolve fareId for short-term classification
                let resolvedFareId = null;
                try {
                    const firstZeroPriceSegment = segmentFares[0];
                    if (firstZeroPriceSegment && firstZeroPriceSegment.routeId) {
                        const zeroFare = await Fare.findOne({
                            where: { routeId: firstZeroPriceSegment.routeId, isActive: true }
                        });
                        resolvedFareId = zeroFare?.fareId || null;
                    }
                } catch (resolveErr) {
                    logger.warn('Failed to resolve fareId for zero-price short-term ticket', {
                        error: resolveErr.message
                    });
                }

                const ticket = await this.repository.create({
                    passengerId: ticketData.passengerId,
                    tripId: ticketData.tripId || null,
                    fareId: resolvedFareId,
                    promotionId: ticketData.promotionId || null,
                    originStationId: journeyDetails.routeSegments[0]?.originStationId || null,
                    destinationStationId: journeyDetails.routeSegments[journeyDetails.routeSegments.length - 1]?.destinationStationId || null,
                    originalPrice: originalPrice,
                    discountAmount: discountAmount,
                    finalPrice: 0,
                    totalPrice: 0,
                    validFrom: new Date(),
                    validUntil: new Date(new Date().setDate(new Date().getDate() + 30)),
                    ticketType: ticketData.tripType.toLowerCase(),
                    status: 'pending_payment',
                    stationCount: journeyDetails.totalStations,
                    fareBreakdown: {
                        journeyDetails: journeyDetails,
                        segmentFares: segmentFares,
                        passengerBreakdown: passengerBreakdown,
                        totalPassengers: journeyDetails.totalPassengers || totalPassengers
                    },
                    paymentMethod: 'free',
                    qrCode: null
                });

                // Generate QR code for free ticket
                logger.info('About to generate QR code for free single-use ticket', {
                    ticketId: ticket.ticketId,
                    ticketType: ticket.ticketType,
                    paymentMethod: 'free',
                    hasTicketObject: !!ticket,
                    hasTicketId: !!ticket.ticketId
                });

                try {
                    const freeTicketQrCodeData = this._generateQRCode(ticket.ticketId);
                    
                    await this.repository.update(ticket.ticketId, { qrCode: freeTicketQrCodeData });
                    
                    ticket.qrCode = freeTicketQrCodeData;
                    
                    await ticket.reload();
                    
                    logger.info('Generated and verified QR code successfully for free single-use ticket', {
                        ticketId: ticket.ticketId,
                        ticketType: ticket.ticketType,
                        paymentMethod: 'free',
                        qrCodeLength: freeTicketQrCodeData?.length || 0,
                        qrCodeLengthAfterReload: ticket.qrCode?.length || 0,
                        qrCodeMatches: ticket.qrCode === freeTicketQrCodeData
                    });
                } catch (freeQrUpdateError) {
                    logger.error('Failed to generate QR code for free single-use ticket', {
                        ticketId: ticket.ticketId,
                        ticketType: ticket.ticketType,
                        paymentMethod: 'free',
                        error: freeQrUpdateError.message,
                        stack: freeQrUpdateError.stack,
                        errorName: freeQrUpdateError.name,
                        errorCode: freeQrUpdateError.code
                    });
                    // Don't throw error, but ensure qrCode is set to ticketId as fallback
                    ticket.qrCode = ticket.ticketId;
                    
                    logger.warn('Using ticketId as fallback QR code for free single-use ticket', {
                        ticketId: ticket.ticketId,
                        fallbackQrCode: ticket.ticketId
                    });
                }

                try {
                    const syntheticPaymentId = `FREE_${ticket.ticketId}`;
                    await PaymentCompletionHandler.processPaymentCompletion(ticket, syntheticPaymentId, {
                        paymentMethod: 'free',
                        status: 'active',
                        webhookProcessed: true
                    });
                } catch (pcErr) {
                    logger.error('PaymentCompletionHandler failed for free short-term ticket', {
                        ticketId: ticket.ticketId,
                        error: pcErr.message
                    });
                }

                logger.info('Short-term ticket created successfully with free payment', { 
                    ticketId: ticket.ticketId, 
                    paymentId: null, 
                    passengerId: ticket.passengerId, 
                    tripType: ticketData.tripType,
                    stationCount: journeyDetails.totalStations,
                    totalPrice: 0,
                    totalPassengers: journeyDetails.totalPassengers || totalPassengers,
                    passengerBreakdown: passengerBreakdown,
                    originStationId: journeyDetails.routeSegments[0]?.originStationId || null,
                    destinationStationId: journeyDetails.routeSegments[journeyDetails.routeSegments.length - 1]?.destinationStationId || null,
                    paymentResponse: null
                });
                return { ticket, paymentId: null, paymentResponse: null };
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
                logger.error(`No active fare found for route ${firstSegment.routeId}`);
            }
            ticketData.promotionCode = this._normalizePromotion(ticketData);
            // Handle promotion logic
            const { promotionId } = await this._handlePromotion(ticketData, appliedPromotion);
            ticketData.promotionId = promotionId;

            // Calculate validity period for short-term tickets (30 days validity)
            const validFrom = new Date();
            const validUntil = new Date(validFrom);
            validUntil.setDate(validUntil.getDate() + 30);

            // Create ticket without QR code (will be generated after creation)
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
                qrCode: null
            });

            logger.info('About to generate QR code for single-use ticket', {
                ticketId: ticket.ticketId,
                ticketType: ticket.ticketType,
                paymentMethod: ticketData.paymentMethod,
                hasTicketObject: !!ticket,
                hasTicketId: !!ticket.ticketId
            });

            // Generate QR code based on ticketId after ticket creation
            try {
                const finalQrCodeData = this._generateQRCode(ticket.ticketId);
                
                await this.repository.update(ticket.ticketId, { qrCode: finalQrCodeData });
                
                // Update the ticket object for return
                ticket.qrCode = finalQrCodeData;
                
                // Verify QR code was saved by reloading from database
                await ticket.reload();
                
                logger.info('Generated and verified QR code successfully for single-use ticket', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    ticketType: ticket.ticketType,
                    qrCodeLength: finalQrCodeData?.length || 0,
                    qrCodeLengthAfterReload: ticket.qrCode?.length || 0,
                    qrCodeMatches: ticket.qrCode === finalQrCodeData
                });
            } catch (qrUpdateError) {
                logger.error('Failed to generate QR code for single-use ticket', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    ticketType: ticket.ticketType,
                    paymentMethod: ticketData.paymentMethod,
                    error: qrUpdateError.message,
                    stack: qrUpdateError.stack,
                    errorName: qrUpdateError.name,
                    errorCode: qrUpdateError.code
                });
                // Don't throw error, but ensure qrCode is set to ticketId as fallback
                ticket.qrCode = ticket.ticketId;
                
                logger.warn('Using ticketId as fallback QR code for single-use ticket', {
                    ticketId: ticket.ticketId,
                    fallbackQrCode: ticket.ticketId
                });
            }

            // Increment promotion usage only after successful ticket creation
            await this._incrementPromotionUsage(
                appliedPromotion?.promotionId || ticketData.promotionId, 
                ticketData.promotionCode, 
                ticket.ticketId, 
                'short-term ticket creation'
            );

            // Process payment
            const { success, fail } = this._getRedirectUrls(ticketData);
            const { paymentResult, paymentResponse } = await this._processPayment(
                ticket, 
                'short-term', 
                {
                    paymentSuccessUrl: success,
                    paymentFailUrl: fail,
                    currency: ticketData.currency || 'VND',
                    amount: finalPrice
                },
                ticketData.waitForPayment,
                60000
            );

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
     * @param {string} idempotencyKey - Optional custom idempotency key
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async createLongTermTicket(ticketData, idempotencyKey = null) {
        // Use custom idempotency key or generate one from ticket data
        const operation = 'create_long_term_ticket';
        
        return await this.idempotency.executeWithIdempotency(
            operation,
            idempotencyKey ? { customKey: idempotencyKey } : ticketData,
            async () => this._createLongTermTicketInternal(ticketData),
            ticketData.passengerId,
            1800 // 30 minutes TTL
        );
    }

    /**
     * Internal method for creating long-term ticket (wrapped by idempotency)
     * @param {Object} ticketData - The ticket data
     * @returns {Promise<Object>} The created ticket with payment information
     */
    async _createLongTermTicketInternal(ticketData) {
        try {
            const validPassTypes = TransitPass.transitPassType;
            if (!validPassTypes.includes(ticketData.passType.toLowerCase())) {
                logger.error(`Invalid pass type. Must be one of: ${validPassTypes.join(', ')}`);
            }

            // Get transit pass pricing from TransitPass model
            const transitPass = await TransitPass.findOne({
                where: {
                    transitPassType: ticketData.passType,
                    isActive: true
                }
            });

            if (!transitPass) {
                logger.error(`No active pricing found for pass type: ${ticketData.passType}`);
            }

            // Determine passenger type based on age (validate DOB not in future)
            let passengerType = 'adult';
            let dateOfBirth = null;
            
            // Get dateOfBirth from passengerInfo or ticketData
            if (ticketData.passengerInfo?.dateOfBirth) {
                dateOfBirth = new Date(ticketData.passengerInfo.dateOfBirth);
            } else if (ticketData.dateOfBirth) {
                dateOfBirth = new Date(ticketData.dateOfBirth);
            }
            
            if (dateOfBirth && !isNaN(dateOfBirth.getTime())) {
                // Validate DOB is not in the future
                if (dateOfBirth > new Date()) {
                    logger.warn('Invalid date of birth: cannot be in the future', {
                        passengerId: ticketData.passengerId,
                        dateOfBirth: dateOfBirth.toISOString()
                    });
                } else {
                    let age = new Date(Date.now() - dateOfBirth);
                    age = age.getUTCFullYear() - 1970;
                    passengerType = PassengerTypeHelper.determineTypeByAge(age);
                    
                    logger.debug('Passenger type determined from date of birth', {
                        passengerId: ticketData.passengerId,
                        dateOfBirth: dateOfBirth.toISOString(),
                        age: age,
                        passengerType: passengerType
                    });
                }
            } else {
                logger.debug('No valid date of birth provided, using default adult passenger type', {
                    passengerId: ticketData.passengerId
                });
            }

            // Apply passenger type discount using PassengerDiscount model
            const originalPrice = parseFloat(transitPass.price);
            let discountedPrice = originalPrice;
            
            const passengerDiscount = await PassengerDiscount.findOne({
                where: { 
                    passengerType: passengerType,
                    isActive: true 
                }
            });
            
            if (passengerDiscount && passengerDiscount.isCurrentlyValid()) {
                discountedPrice = passengerDiscount.getFinalPrice(originalPrice);
                logger.info('Applied passenger discount', {
                    passengerType,
                    originalPrice,
                    discountedPrice,
                    discountType: passengerDiscount.discountType,
                    discountValue: passengerDiscount.discountValue
                });
            } else {
                logger.info('No valid discount found for passenger type', { passengerType });
            }

            let discountAmount = originalPrice - discountedPrice;
            let finalPrice = discountedPrice;
            ticketData.promotionCode = this._normalizePromotion(ticketData);
            // Apply promotion if provided
            if (ticketData.promotionCode) {
                const promotion = await Promotion.findOne({ 
                    where: { promotionCode: ticketData.promotionCode }
                });
                
                const { appliedPromotion, promotionId } = await this._handlePromotion(ticketData, promotion, ticketData.passType);
                ticketData.promotionId = promotionId;
                
                if (appliedPromotion) {
                    const promotionDiscount = appliedPromotion.calculateDiscount(finalPrice);
                    discountAmount += promotionDiscount;
                    finalPrice = finalPrice - promotionDiscount;
                }
            }

            // Create ticket for long-term pass without QR (will be generated after creation)
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
                validFrom: null,
                validUntil: null,
                activatedAt: null, // 30 days from now
                ticketType: ticketData.passType,
                status: (finalPrice && finalPrice > 0) ? 'pending_payment' : 'inactive',
                stationCount: null, // Not applicable for passes
                fareBreakdown: {
                    passType: ticketData.passType,
                    originalPassPrice: parseFloat(transitPass.price),
                    passengerType: passengerType,
                    discountAmount: discountAmount,
                    finalPrice: finalPrice,
                    currency: transitPass.currency
                },                paymentMethod: (finalPrice && finalPrice > 0) ? ticketData.paymentMethod : 'free',
                qrCode: null
            });

            // Generate QR code based on ticketId after ticket creation
            try {
                const finalQrCodeData = this._generateQRCode(ticket.ticketId);
                
                await this.repository.update(ticket.ticketId, { qrCode: finalQrCodeData });
                
                // Update the ticket object for return
                ticket.qrCode = finalQrCodeData;
                
                // Verify QR code was saved by reloading from database
                await ticket.reload();
                
                logger.info('Generated and verified QR code successfully for multi-use ticket', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    passType: ticketData.passType,
                    qrCodeLength: finalQrCodeData?.length || 0,
                    qrCodeLengthAfterReload: ticket.qrCode?.length || 0,
                    qrCodeMatches: ticket.qrCode === finalQrCodeData
                });
            } catch (qrUpdateError) {
                logger.error('Failed to generate QR code for multi-use ticket', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    passType: ticketData.passType,
                    error: qrUpdateError.message,
                    stack: qrUpdateError.stack
                });
                // Don't throw error, but ensure qrCode is set to ticketId as fallback
                ticket.qrCode = ticket.ticketId;
            }

            // Increment promotion usage only after successful ticket creation
            await this._incrementPromotionUsage(
                ticketData.promotionId, 
                ticketData.promotionCode, 
                ticket.ticketId, 
                'long-term ticket creation'
            );

            // If price is zero or less, skip external payment
            if (!finalPrice || finalPrice <= 0) {
                logger.info('Long-term ticket created with zero amount, skipping payment', {
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    passType: ticketData.passType,
                    totalPrice: finalPrice,
                    paymentId: null
                });
                return {
                    ticket,
                    paymentId: null,
                    paymentResponse: null
                };
            }

            // Process payment
            const { success: passSuccess, fail: passFail } = this._getRedirectUrls(ticketData);
            const { paymentResult, paymentResponse } = await this._processPayment(
                ticket, 
                'long-term', 
                {
                    paymentSuccessUrl: passSuccess,
                    paymentFailUrl: passFail,
                    currency: ticketData.currency || 'VND',
                    amount: finalPrice
                },
                ticketData.waitForPayment,
                30000
            );

            logger.info('Long-term ticket created successfully', { 
                ticketId: ticket.ticketId, 
                paymentId: paymentResult.paymentId,
                passengerId: ticket.passengerId, 
                passType: ticketData.passType,
                totalPrice: finalPrice,
                passengerType: passengerType,
                validFrom: null,
                validUntil: null,
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
     * Update ticket status with validation
     * @param {string} ticketId - Ticket ID
     * @param {string} newStatus - New status to set
     * @param {string} reason - Reason for status change (optional)
     * @param {string} updatedBy - User ID who is updating the status
     * @returns {Promise<Object>} Updated ticket
     */
    async updateTicketStatus(ticketId, newStatus, reason = null, updatedBy = null) {
        return await this.statusService.updateTicketStatus(ticketId, newStatus, reason, updatedBy);
    }

    /**
     * Delete ticket (delegates to repository)
     * @param {string} ticketId - Ticket ID
     * @returns {Promise<boolean>} Deletion result
     */
    async deleteTicket(ticketId) {
        return await this.repository.delete(ticketId);
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
     * Get ticket by payment ID
     * @param {string} paymentId - Payment ID
     * @returns {Promise<Object>} Ticket object
     */
    async getTicketByPaymentId(paymentId) {
        return await this.repository.findByPaymentId(paymentId);
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
     * Activate long-term ticket (start countdown) with idempotency protection
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID (optional, for validation)
     * @param {string} idempotencyKey - Optional custom idempotency key
     * @returns {Promise<Object>} Activated ticket
     */
    async activateTicket(ticketId, passengerId = null, idempotencyKey = null) {
        const operation = 'activate_ticket';
        const data = { ticketId, passengerId };
        
        return await this.idempotency.executeWithIdempotency(
            operation,
            idempotencyKey ? { customKey: idempotencyKey } : data,
            async () => this._activateTicketInternal(ticketId, passengerId),
            passengerId,
            600 // 10 minutes TTL
        );
    }

    /**
     * Internal method for activating ticket (wrapped by idempotency)
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID (optional, for validation)
     * @returns {Promise<Object>} Activated ticket
     */
    async _activateTicketInternal(ticketId, passengerId = null) {
        let ticket = null;
        try {
            ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                logger.error('Ticket not found', { ticketId });
                throw new Error('Ticket not found');
            }

            // If passengerId is provided, validate ownership
            if (passengerId && ticket.passengerId !== passengerId) {
                logger.error('Unauthorized: Ticket does not belong to this passenger', {
                    ticketId,
                    providedPassengerId: passengerId,
                    ticketPassengerId: ticket.passengerId
                });
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }

            const activatedTicket = await Ticket.startCountDown(ticketId);
            
            logger.info('Ticket activated successfully', { 
                ticketId, 
                passengerId: ticket.passengerId,
                ticketType: ticket.ticketType,
                validFrom: activatedTicket.validFrom,
                validUntil: activatedTicket.validUntil,
            });
            
            return activatedTicket;
        } catch (error) {
            logger.error('Error activating ticket', { 
                error: error.message, 
                ticketId,
                passengerId,
                ticketStatus: ticket?.status,
                ticketType: ticket?.ticketType
            });
            throw error;
        }
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
                const expiredIds = await Ticket.findAll({
                    where: {
                        status: 'active',
                        validUntil: { [Op.lt]: new Date() },
                        isActive: true
                    },
                    attributes: ['ticketId'],
                    limit: batchSize,
                    raw: true
                });

                if (expiredIds.length === 0) {
                    hasMore = false;
                    break;
                }

                await Ticket.update(
                    { status: 'expired' },
                    { where: { ticketId: { [Op.in]: expiredIds.map(x => x.ticketId) } } }
                );

                const updatedCount = expiredIds.length;
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
    async handleUseLongTermTicket(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket.validFrom) {
                logger.error('Long-term ticket has not been activated yet', {
                    ticketId,
                    passengerId,
                    ticketType: ticket.ticketType,
                    status: ticket.status
                });
                throw new Error('Long-term ticket has not been activated yet');
            }
            
            // Check if ticket is still valid (not expired)
            if (ticket.validUntil && ticket.validUntil < new Date()) {
                logger.error('Long-term ticket has expired', {
                    ticketId,
                    passengerId,
                    validUntil: ticket.validUntil,
                    currentTime: new Date()
                });
                throw new Error('Long-term ticket has expired');
            }
            
            const usedTicket = await ticket.update({
                usedList: [...(ticket.usedList || []), new Date()]
            });
            try {
                const abuse = await TicketAbused.trackAndDetectAbuse(usedTicket);
                if (abuse.abused) {
                    logger.warn('Abuse detected after long-term usage', { ticketId, reason: abuse.reason });
                }
            } catch (e) {
                logger.error('Failed to track abuse after long-term usage', { error: e.message, ticketId });
            }

            const usageInfo = this._buildTicketUsageInfo(usedTicket);
            logger.info('Long-term ticket used successfully', { 
                ...usageInfo,
                usageTime: new Date(),
                passengerId,
                ticketType: ticket.ticketType,
                usageCount: usedTicket.usedList?.length || 0
            });
            return { ticket: usedTicket, info: usageInfo };
        }
        catch (error) {
            logger.error('Error using long-term ticket', { 
                error: error.message, 
                ticketId, 
                passengerId,
                ticketType: ticket?.ticketType 
            });
            throw error;
        }
    }
    async handleUseShortTermTicket(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            let usedTicket = null;
            
            // If ticket is oneway
            if (ticket.ticketType.toLowerCase() === 'oneway') {
                usedTicket = await ticket.update({
                    status: 'used',
                    usedList: [...(ticket.usedList || []), new Date()],
                });
            }
            else if (ticket.ticketType.toLowerCase() === 'return') {
                const currentUsedList = ticket.usedList || [];
                if (currentUsedList.length === 0) {
                    // First use of return ticket
                    usedTicket = await ticket.update({
                        usedList: [...currentUsedList, new Date()]
                    });
                } else if (currentUsedList.length === 1) {
                    // Second use of return ticket - mark as fully used
                    usedTicket = await ticket.update({
                        status: 'used',
                        usedList: [...currentUsedList, new Date()]
                    });
                } else {
                    logger.error('Return ticket has already been used twice', {
                        ticketId,
                        passengerId,
                        usageCount: currentUsedList.length
                    });
                    throw new Error('Return ticket has already been used twice');
                }
            } else {
                logger.error(`Unsupported ticket type: ${ticket.ticketType}`, {
                    ticketId,
                    passengerId,
                    ticketType: ticket.ticketType
                });
                throw new Error(`Unsupported ticket type: ${ticket.ticketType}`);
            }
            
            if (!usedTicket) {
                logger.error('Failed to update ticket usage', {
                    ticketId,
                    passengerId
                });
                throw new Error('Failed to update ticket usage');
            }
            try {
                const abuse = await TicketAbused.trackAndDetectAbuse(usedTicket);
                if (abuse.abused) {
                    logger.warn('Abuse detected after short-term usage', { ticketId, reason: abuse.reason });
                }
            } catch (e) {
                logger.error('Failed to track abuse after short-term usage', { error: e.message, ticketId });
            }

            const usageInfo = this._buildTicketUsageInfo(usedTicket);
            logger.info('Short-term ticket used successfully', { 
                ...usageInfo,
                usageTime: new Date(),
                passengerId,
                ticketType: ticket.ticketType,
                usageCount: usedTicket.usedList?.length || 0
            });
            return { ticket: usedTicket, info: usageInfo };
        }
        catch (error) {
            logger.error('Error using short-term ticket', { 
                error: error.message, 
                ticketId, 
                passengerId,
                ticketType: ticket?.ticketType 
            });
            throw error;
        }
    }
    async handleUseAbusedTicket(ticketId, passengerId, scannedQR) {
        try {
          const ticket = await Ticket.unscoped().findByPk(ticketId);
          if (!ticket) {
            logger.error('Ticket not found (abused handler)', { ticketId });
            throw new Error('Ticket not found');
          }
      
          const qrString = String(scannedQR || '');
          let baseQR, providedCode;
          if (qrString.includes(':')) {
            const [base, code] = qrString.split(':');
            baseQR = base;
            providedCode = code;
          } else {
            baseQR = ticket.qrCode;
            providedCode = qrString;
          }

          if (!/^[0-9]{6}$/.test(String(providedCode))) {
            logger.error('Rotation code required for abused ticket', { ticketId });
            throw new Error('Ticket abused, rotation code required');
          }
      
          if (baseQR !== ticket.qrCode) {
            logger.error('Base QR does not match ticket (abused handler)', { ticketId });
            throw new Error('Invalid QR base');
          }
      
          const valid = RotationQRCode.verifyCode(ticket.qrSecret, providedCode, 1);
          if (!valid) {
            logger.error('Invalid rotation code for abused ticket', { ticketId });
            throw new Error('Invalid or expired rotation code');
          }
      
          if (['oneway', 'return'].includes(ticket.ticketType.toLowerCase())) {
            return await this.handleUseShortTermTicket(ticketId, passengerId);
          } else {
            return await this.handleUseLongTermTicket(ticketId, passengerId);
          }
        }
        catch (error) {
          logger.error('Error using abused ticket', { 
            error: error.message, 
            ticketId, 
            passengerId
          });
          throw error;
        }
    }

    /**
     * Build rotating QR for abused ticket without exposing secret
     * @param {string} ticketId
     * @returns {Promise<{ticketId: string, qr: string, windowMs: number, currentWindow: number, expiresAt: Date}>}
     */
    async getAbusedQR(ticketId) {
        try {
            // Fetch with secret (unscoped) to avoid defaultScope excluding qrSecret
            const ticket = await Ticket.unscoped().findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            if (ticket.status !== 'abused') {
                throw new Error('Ticket is not in abused status');
            }

            if (!ticket.qrCode || !ticket.qrSecret) {
                throw new Error('Ticket is missing QR configuration');
            }

            const windowMs = 15000;
            const now = Date.now();
            const currentWindow = Math.floor(now / windowMs);
            const nextRotateAtMs = (currentWindow + 1) * windowMs;
            const qr = RotationQRCode.buildDisplayQR(ticket.qrCode, ticket.qrSecret, now);

            return {
                ticketId: ticket.ticketId,
                qr,
                windowMs,
                currentWindow,
                expiresAt: new Date(nextRotateAtMs)
            };
        } catch (error) {
            logger.error('Error building abused QR', { error: error.message, ticketId });
            throw error;
        }
    }
      
    /**
     * Use ticket - each usage is tracked separately
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Used ticket
     */
    async useTicket(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                logger.error('Ticket not found', { ticketId });
                throw new Error('Ticket not found');
            }
            if (ticket.status === 'abused') {
                logger.error('Ticket is locked due to abuse', { ticketId, passengerId, status: ticket.status });
                throw new Error('Ticket is locked due to abuse');
            }
            if (ticket.status === 'used') {
                logger.error('Ticket is already used', { ticketId, passengerId, status: ticket.status });
                throw new Error('Ticket is already used');
            }
            else if (ticket.status === 'cancelled') {
                logger.error('Ticket is already cancelled', { ticketId, passengerId, status: ticket.status });
                throw new Error('Ticket is already cancelled');
            }
            else if (ticket.status === 'expired') {
                logger.error('Ticket is already expired', { ticketId, passengerId, status: ticket.status });
                throw new Error('Ticket is already expired');
            }

            let result;
            if (ticket.ticketType.toLowerCase() === 'oneway' || ticket.ticketType.toLowerCase() === 'return') {
                result = await this.handleUseShortTermTicket(ticketId, passengerId);
            } else {
                result = await this.handleUseLongTermTicket(ticketId, passengerId);
            }

            // Track abuse after usage
            try {
                const fresh = await Ticket.findByPk(ticketId);
                const abuse = await TicketAbused.trackAndDetectAbuse(fresh);
                if (abuse.abused) {
                    logger.warn('Abuse detected post usage', { ticketId, reason: abuse.reason });
                }
            } catch (e) {
                logger.error('Failed to track abuse after useTicket', { error: e.message, ticketId });
            }

            return result;
        } catch (error) {
            logger.error('Error using ticket', { 
                error: error.message, 
                ticketId,
                passengerId,
                ticketStatus: ticket?.status,
                ticketType: ticket?.ticketType
            });
            throw error;
        }
    }

    /**
     * Use ticket by QR code (for staff/admin use) - each scan is tracked separately
     * @param {string} qrCode - QR code string
     * @param {string} staffId - Staff/Admin ID who is using the ticket
     * @returns {Promise<Object>} Used ticket
     */
    async useTicketByQRCode(qrCode, staffId) {
        let foundTicket = null;
        try {
            // Support both `${baseQR}` and `${baseQR}:${code}`
            const scanned = String(qrCode || '');
            const baseQR = scanned.includes(':') ? scanned.split(':')[0] : scanned;

            const ticket = await Ticket.findOne({
                where: { qrCode: baseQR }
            });
            foundTicket = ticket;
            
            if (!ticket) {
                logger.error('Ticket not found with provided QR code', {
                    qrCode: qrCode ? qrCode.substring(0, 20) + '...' : 'null',
                    staffId
                });
                throw new Error('Ticket not found with provided QR code');
            }
            if (ticket.status === 'used') {
                logger.error('Ticket is already used', { 
                    ticketId: ticket.ticketId, 
                    staffId, 
                    status: ticket.status 
                });
                throw new Error('Ticket is already used');
            }
            else if (ticket.status === 'cancelled') {
                logger.error('Ticket is already cancelled', { 
                    ticketId: ticket.ticketId, 
                    staffId, 
                    status: ticket.status 
                });
                throw new Error('Ticket is already cancelled');
            }
            else if (ticket.status === 'expired') {
                logger.error('Ticket is already expired', { 
                    ticketId: ticket.ticketId, 
                    staffId, 
                    status: ticket.status 
                });
                throw new Error('Ticket is already expired');
            }
            else if (ticket.status === 'abused') {
                logger.error('Ticket is locked due to abuse', { 
                    ticketId: ticket.ticketId, 
                    staffId, 
                    status: ticket.status 
                });
                // Pass full scanned value so abused handler can verify rotation code
                return await this.handleUseAbusedTicket(ticket.ticketId, ticket.passengerId, scanned);
            }
            if (ticket.ticketType.toLowerCase() === 'oneway' || ticket.ticketType.toLowerCase() === 'return') {
                return await this.handleUseShortTermTicket(ticket.ticketId, ticket.passengerId);
            } else {
                return await this.handleUseLongTermTicket(ticket.ticketId, ticket.passengerId);
            }
        } catch (error) {
            logger.error('Error using ticket by QR code', { 
                error: error.message, 
                qrCode: qrCode ? qrCode.substring(0, 20) + '...' : 'null', // Log partial QR for security
                staffId,
                ticketId: foundTicket?.ticketId,
                ticketStatus: foundTicket?.status,
                ticketType: foundTicket?.ticketType
            });
            throw new Error(error.message);
        }
    }
}

module.exports = new TicketService();
