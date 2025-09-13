const ticketService = require('../services/ticket.service');
const TicketPriceCalculator = require('../services/ticket/calculators/TicketPriceCalculator');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const PassengerCacheService = require('../services/cache/PassengerCacheService');
const { publish } = require('../kafka/kafkaProducer');


const SERVICE_PREFIX = process.env.REDIS_KEY_PREFIX || 'service:';
const USER_CACHE_PREFIX = process.env.REDIS_USER_CACHE_KEY_PREFIX || 'metrohcm:';



class TicketController {
    // Helper method to wait for passenger sync via Kafka
    async _requestPassengerSync(userId) {
        try {
            logger.info('Requesting passenger sync via Kafka', { userId });
            
            await publish('passenger-sync-request', userId, {
                eventType: 'REQUEST_PASSENGER_SYNC',
                userId: userId,
                requestedBy: 'ticket-service',
                timestamp: new Date().toISOString(),
                source: 'cache-miss'
            });
            
            // Wait for sync to complete (with retry)
            const maxRetries = 3;
            const retryDelayMs = 1000; // 1 second
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                logger.debug(`Waiting for passenger sync, attempt ${attempt}/${maxRetries}`, { userId });
                
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                
                // Check cache again
                const redisClient = getClient();
                const passengerCache = new PassengerCacheService(redisClient, logger, `${USER_CACHE_PREFIX}user-service:user:passenger:`);
                const passenger = await passengerCache.getPassengerByUserId(userId);
                
                if (passenger) {
                    logger.info('Passenger sync successful via Kafka', { 
                        userId, 
                        passengerId: passenger.passengerId,
                        attempts: attempt 
                    });
                    return passenger;
                }
            }
            
            logger.warn('Passenger sync timeout after retries', { userId, maxRetries });
            return null;
            
        } catch (error) {
            logger.error('Failed to request passenger sync via Kafka', {
                userId,
                error: error.message
            });
            return null;
        }
    }

    // Helper method to get passenger from cache
    async _getPassengerFromCache(req) {
        let passengerId = req.headers['x-passenger-id'];
        let passenger;
        let userId; // Declare userId at the top

        if (passengerId) {
            // Direct lookup by passengerId
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${USER_CACHE_PREFIX}user-service:user:passenger:`);
            passenger = await passengerCache.getPassenger(passengerId);
        } else {
            // Lookup by userId from JWT token
            userId = req.user?.id;
            if (!userId) {
                logger.error('User ID not found in request');
                throw new Error('User ID not found in request');
            }
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${USER_CACHE_PREFIX}user-service:user:passenger:`);
            passenger = await passengerCache.getPassengerByUserId(userId);
            if (passenger) {
                passengerId = passenger.passengerId;
            }
        }
        
        if (!passenger) {
            // Try to sync passenger via Kafka as fallback
            if (userId) {
                logger.warn('Passenger not found in cache, requesting sync via Kafka', {
                    passengerId,
                    userId
                });
                
                passenger = await this._requestPassengerSync(userId);
                if (passenger) {
                    passengerId = passenger.passengerId;
                }
            }
            
            // If still no passenger after Kafka sync attempt
            if (!passenger) {
                logger.error('Passenger not found in cache after sync attempt. Please sync your passenger profile or authenticate again.', {
                    passengerId,
                    userId
                });
                throw new Error('Passenger not found in cache. Please sync your passenger profile or authenticate again.');
            }
        }

        return { passengerId, passenger };
    }

    // POST /v1/tickets/create-short-term
    createShortTermTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const ticketData = req.body;
            
            // Get passenger from cache to validate existence
            const { passengerId, passenger } = await this._getPassengerFromCache(req);

            const result = await ticketService.createShortTermTicket({
                ...ticketData,
                passengerId,
                passengerInfo: passenger // Include passenger info for validation
            });

            // Check if payment response was received
            if (result.paymentResponse) {
                return res.status(201).json({
                    success: true,
                    message: 'Ticket created and payment URL generated successfully',
                    data: {
                        ticket: result.ticket,
                        payment: {
                            paymentId: result.paymentId,
                            paymentUrl: result.paymentResponse.paymentUrl,
                            paymentMethod: result.paymentResponse.paymentMethod,
                            paypalOrderId: result.paymentResponse.paypalOrderId,
                            status: 'ready'
                        }
                    }
                });
            } else {
                return res.status(201).json({
                    success: true,
                    message: 'Ticket created successfully. Payment URL will be available shortly.',
                    data: {
                        ticket: result.ticket,
                        payment: {
                            paymentId: result.paymentId,
                            status: 'processing',
                            message: 'Payment URL is being generated. Please check back in a few seconds.'
                        }
                    }
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_SHORT_TERM_TICKET'
            });
        }
    });

    // POST /v1/tickets/create-long-term
    createLongTermTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const ticketData = req.body;
            
            // Get passenger from cache to validate existence
            const { passengerId, passenger } = await this._getPassengerFromCache(req);

            const result = await ticketService.createLongTermTicket({
                ...ticketData,
                passengerId,
                passengerInfo: passenger // Include passenger info for validation
            });

            // Check if payment response was received
            if (result.paymentResponse) {
                return res.status(201).json({
                    success: true,
                    message: 'Ticket created and payment URL generated successfully',
                    data: {
                        ticket: result.ticket,
                        payment: {
                            paymentId: result.paymentId,
                            paymentUrl: result.paymentResponse.paymentUrl,
                            paymentMethod: result.paymentResponse.paymentMethod,
                            paypalOrderId: result.paymentResponse.paypalOrderId,
                            status: 'ready'
                        }
                    }
                });
            } else {
                return res.status(201).json({
                    success: true,
                    message: 'Ticket created successfully. Payment URL will be available shortly.',
                    data: {
                        ticket: result.ticket,
                        payment: {
                            paymentId: result.paymentId,
                            status: 'processing',
                            message: 'Payment URL is being generated. Please check back in a few seconds.'
                        }
                    }
                });
            }
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CREATE_LONG_TERM_TICKET'
            });
        }
    });
    // GET /v1/tickets/getAllTickets
    getAllTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const filters = req.query;
            const tickets = await ticketService.getAllTickets(filters);
            
            return res.status(200).json({
                success: true,
                message: 'Tickets retrieved successfully',
                data: tickets,
                count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_ALL_TICKETS'
            });
        }
    });

    // GET /v1/tickets/:id
    getTicketById = asyncErrorHandler(async (req, res, next) => {
        try {
        const { id } = req.params;
        const ticket = await ticketService.getTicketById(id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
                
        return res.status(200).json({
            success: true,
            message: 'Ticket retrieved successfully',
            data: ticket
        });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKET_BY_ID'
            });
        }

    });

    // GET /v1/tickets/me
    getMyTickets = asyncErrorHandler(async (req, res, next) => {
        try {
        const { passengerId } = await this._getPassengerFromCache(req);

        const filters = req.query;
        const tickets = await ticketService.getTicketsByPassenger(passengerId, filters);
        
        return res.status(200).json({
            success: true,
            message: 'My tickets retrieved successfully',
            data: tickets,
            count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_MY_TICKETS'
            });
        }
    });

    // GET /v1/tickets/me/unused
    getMyActiveTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerId } = await this._getPassengerFromCache(req);

            const tickets = await ticketService.getActiveTicketsByPassenger(passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'My active tickets retrieved successfully',
                data: tickets,
                count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_MY_ACTIVE_TICKETS'
            });
        }
    });

    // GET /v1/tickets/me/used
    getMyInactiveTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerId } = await this._getPassengerFromCache(req);

            const tickets = await ticketService.getInactiveTicketsByPassenger(passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'My used tickets retrieved successfully',
                data: tickets,
                count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_MY_INACTIVE_TICKETS'
            });
        }
    });

    // GET /v1/tickets/me/cancelled
    getMyCancelledTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerId } = await this._getPassengerFromCache(req);

            const tickets = await ticketService.getCancelledTicketsByPassenger(passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'My cancelled tickets retrieved successfully',
                data: tickets,
                count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_MY_CANCELLED_TICKETS'
            });
        }
    });

    // GET /v1/tickets/me/expired
    getMyExpiredTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const { passengerId } = await this._getPassengerFromCache(req);

            const tickets = await ticketService.getExpiredTicketsByPassenger(passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'My expired tickets retrieved successfully',
                data: tickets,
                count: tickets.length
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_MY_EXPIRED_TICKETS'
            });
        }
    });


    // GET /v1/tickets/:id/getTicket
    getTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { passengerId } = await this._getPassengerFromCache(req);
            
            const ticketData = await ticketService.getTicketWithQR(id, passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket retrieved with QR code successfully',
                data: ticketData
                });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKET'
            });
        }
    });

    // POST /v1/tickets/:id/cancel
    cancelTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const { passengerId } = await this._getPassengerFromCache(req);
            
            const ticket = await ticketService.cancelTicket(id, reason, passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket cancelled successfully',
                data: ticket
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CANCEL_TICKET'
            });
        }
    });

    // POST /v1/tickets/:id/phoneTicket
    getPhoneTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { phoneNumber } = req.body;
            const { passengerId } = await this._getPassengerFromCache(req);
            
            const result = await ticketService.sendTicketToPhone(id, phoneNumber, passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket sent to phone successfully',
                data: result
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_SEND_TICKET_TO_PHONE'
            });
        }
    });

    // POST /v1/tickets/:id/mailTicket
    getMailTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { email } = req.body;
            const { passengerId } = await this._getPassengerFromCache(req);
            
            const result = await ticketService.sendTicketToEmail(id, email, passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket sent to email successfully',
                data: result
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_SEND_TICKET_TO_EMAIL'
            });
        }
    });

    // GET /v1/tickets/:id/validate
    validateTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const validation = await ticketService.validateTicket(id);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket validation completed',
                data: validation
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_VALIDATE_TICKET'
            });
        }
    });

    // GET /v1/tickets/:id/detail
    getTicketDetail = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const ticket = await ticketService.getTicketDetail(id);
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }
            
            return res.status(200).json({
                success: true,
                message: 'Ticket details retrieved successfully',
                data: ticket
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKET_DETAIL'
            });
        }
    });

    // PUT /v1/tickets/:id/update
    updateTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            const ticket = await ticketService.updateTicket(id, updateData);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket updated successfully',
                data: ticket
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_TICKET'
            });
        }
    });

    // PUT /v1/tickets/:id/status
    updateTicketStatus = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const updatedBy = req.user?.id;

            // Validate required fields
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Status is required',
                    error: 'MISSING_STATUS'
                });
            }

            // Validate status format
            const validStatuses = ['active', 'inactive', 'pending_payment', 'used', 'expired', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
                    error: 'INVALID_STATUS'
                });
            }

            // Get current ticket status before update
            const currentTicket = await ticketService.getTicketById(id);
            const oldStatus = currentTicket ? currentTicket.status : 'unknown';
            
            const ticket = await ticketService.updateTicketStatus(id, status, reason, updatedBy);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket status updated successfully',
                data: {
                    ticketId: ticket.ticketId,
                    oldStatus: oldStatus,
                    newStatus: ticket.status,
                    reason: reason || null,
                    updatedBy: updatedBy,
                    updatedAt: ticket.updatedAt
                }
            });
        } catch (error) {
            // Handle specific error cases
            if (error.message.includes('Invalid status transition')) {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'INVALID_STATUS_TRANSITION'
                });
            }
            
            if (error.message === 'Ticket not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_NOT_FOUND'
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_UPDATE_TICKET_STATUS'
            });
        }
    });

    // DELETE /v1/tickets/:id/delete
    deleteTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            await ticketService.deleteTicket(id);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket deleted successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_DELETE_TICKET'
            });
        }
    });

    // GET /v1/tickets/getTicketStatistics
    getTicketStatistics = asyncErrorHandler(async (req, res, next) => {
        try {
            const filters = req.query;
            const stats = await ticketService.getTicketStatistics(filters);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket statistics retrieved successfully',
                data: stats
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKET_STATISTICS'
            });
        }
    });

    // POST /v1/tickets/expire
    expireTickets = asyncErrorHandler(async (req, res, next) => {
        try {
            const expiredCount = await ticketService.expireTickets();
            
            return res.status(200).json({
                success: true,
                message: 'Expired tickets processed successfully',
                data: {
                    expiredCount,
                    processedAt: new Date()
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_EXPIRE_TICKETS'
            });
        }
    });

    // GET /v1/tickets/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        return res.status(200).json({
            success: true,
            message: 'Ticket service is healthy',
            timestamp: new Date(),
            service: 'ticket-controller'
        });
    });

    // GET /v1/tickets/:id/payment
    getTicketPayment = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        
        try {
            // Get ticket
            const ticket = await ticketService.getTicketById(id);
            
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            // Get payment URL from payment service
            const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:8002';
            const response = await fetch(`${paymentServiceUrl}/v1/payment/ticket/${id}`);
            
            if (!response.ok) {
                return res.status(404).json({
                    success: false,
                    message: 'Payment not found for this ticket'
                });
            }

            const paymentData = await response.json();

            return res.status(200).json({
                success: true,
                data: {
                    ticket: {
                        ticketId: ticket.ticketId,
                        passengerId: ticket.passengerId,
                        totalPrice: ticket.totalPrice,
                        status: ticket.status,
                        validFrom: ticket.validFrom,
                        validUntil: ticket.validUntil
                    },
                    payment: paymentData.data
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKET_PAYMENT'
            });
        }
    });

    // GET /v1/tickets/payment-status/:paymentId
    getPaymentStatus = asyncErrorHandler(async (req, res, next) => {
        const { paymentId } = req.params;
        
        const ticket = await ticketService.getTicketByPaymentId(paymentId);


        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if payment URL is available
        if (ticket.paymentUrl) {
            return res.status(200).json({
                success: true,
                message: 'Payment URL is ready',
                data: {
                    paymentId: ticket.paymentId,
                    paymentUrl: ticket.paymentUrl,
                    paymentMethod: ticket.paymentMethod,
                    paypalOrderId: ticket.paypalOrderId,
                    status: 'ready'
                }
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Payment URL is still being generated',
                data: {
                    paymentId: ticket.paymentId,
                    status: 'processing',
                    message: 'Payment URL is being generated. Please check back in a few seconds.'
                }
            });
        }
    });

    // POST /v1/tickets/calculate-price
    calculateTicketPrice = asyncErrorHandler(async (req, res, next) => {
        try {
            const {
                fromStation,
                toStation,
                tripType = 'Oneway',
                promotionId = null,
                promotionCode = null
            } = req.body;

            // Validate required parameters
            if (!fromStation || !toStation) {
                logger.warn('Missing required parameters for price calculation', {
                    fromStationPresent: !!fromStation,
                    toStationPresent: !!toStation,
                    path: req.originalUrl,
                    method: req.method,
                    requestId: req.headers['x-request-id'] || null,
                });
                return res.status(400).json({
                    success: false,
                    message: 'From station and to station are required'
                });
            }

            // Map passenger counts to correct keys
            const passengerCounts = {
                numAdults: req.body.numAdults || req.body.adult || 0,
                numElder: req.body.numElder || req.body.elder || 0,
                numTeenager: req.body.numTeenager || req.body.teenager || 0,
                numChild: req.body.numChild || req.body.child || 0,
                numSenior: req.body.numSenior || req.body.senior || 0,
                numStudent: req.body.numStudent || req.body.student || 0,
            };

            // Prepare promotionData
            const promotionData = promotionId ? { promotionId } : 
                                    promotionCode ? { promotionCode } : null;

            // Entry log
            logger.info('Calculate ticket price request received', {
                fromStation,
                toStation,
                tripType: String(tripType).toLowerCase(),
                passengerCounts,
                promotionData,
                userId: req.user?.id || null,
                path: req.originalUrl,
                method: req.method,
                requestId: req.headers['x-request-id'] || null,
            });

            // Use TicketPriceCalculator for comprehensive price calculation
            const priceCalculation = await TicketPriceCalculator.calculateTotalPriceForPassengers(
                fromStation,
                toStation,
                tripType.toLowerCase(),
                passengerCounts,
                promotionData
            );

            // Success log
            logger.info('Ticket price calculated successfully', {
                fromStation,
                toStation,
                tripType: String(tripType).toLowerCase(),
                totalPrice: priceCalculation?.data?.totalPrice ?? priceCalculation?.totalPrice ?? null,
                totalPassengers: priceCalculation?.data?.totalPassengers ?? priceCalculation?.totalPassengers ?? null,
                currency: priceCalculation?.data?.currency ?? priceCalculation?.currency ?? null,
                success: priceCalculation?.success ?? true,
                requestId: req.headers['x-request-id'] || null,
            });

            return res.status(200).json({
                success: true,
                message: 'Ticket price calculated successfully',
                data: priceCalculation
            });

        } catch (error) {

            if (error.code === 'DUPLICATE_STATION') {
                return res.status(400).json({
                    success: false,
                    message: 'Entry and exit stations must be different',
                    error: 'DUPLICATE_STATION'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to calculate ticket price',
                error: 'INTERNAL_ERROR_CALCULATE_TICKET_PRICE'
            });
        }
    });

    // POST /v1/tickets/active-long-term/:id
    activateLongTermTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            // Only enforce ownership when requester is a passenger.
            // Resolve real passengerId from cache (user.id is not passengerId).
            let passengerId = null;
            if (req.user?.role === 'passenger') {
                const passengerFromCache = await this._getPassengerFromCache(req);
                passengerId = passengerFromCache?.passengerId || null;
            }
            
            const ticket = await ticketService.activateTicket(id, passengerId);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Long-term ticket activated successfully', 
                data: {
                    ticketId: ticket.ticketId,
                    ticketType: ticket.ticketType,
                    status: ticket.status,
                    validFrom: ticket.validFrom,
                    validUntil: ticket.validUntil,
                    activatedAt: ticket.activatedAt
                },
                timestamp: new Date()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_ACTIVATE_LONG_TERM_TICKET'
            });
        }
    });

    // POST /v1/tickets/:id/use
    useTicket = asyncErrorHandler(async (req, res, next) => {
        try {
            const { id } = req.params;
            const { passengerId } = await this._getPassengerFromCache(req);
            
            const result = await ticketService.useTicket(id, passengerId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket used successfully',
                data: result?.info || {},
                timestamp: new Date()
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_USE_TICKET'
            });
        }
    });

    // POST /v1/tickets/qr/:qrCode/use
    useTicketByQRCode = asyncErrorHandler(async (req, res, next) => {
        try {
            const { qrCode } = req.params;
            const staffId = req.user?.id || null; // Get staff/admin ID from authenticated user
            
            const result = await ticketService.useTicketByQRCode(qrCode, staffId);
            
            return res.status(200).json({
                success: true,
                message: 'Ticket used successfully via QR code',
                data: result?.info || {},
                timestamp: new Date()
            });
        } catch (error) {
            if (error.message === 'Ticket not found with provided QR code') {
                return res.status(404).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_NOT_FOUND_WITH_PROVIDED_QR_CODE'
                });
            }
            else if (error.message === 'Ticket is already used') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_ALREADY_USED'
                });
            }
            else if (error.message === 'Ticket is already cancelled') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_ALREADY_CANCELLED'
                });
            }
            else if (error.message === 'Ticket is already expired') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_ALREADY_EXPIRED'
                });
            }
            else if (error.message === 'Ticket is not active and cannot be used') {
                return res.status(400).json({
                    success: false,
                    message: error.message,
                    error: 'TICKET_NOT_ACTIVE_AND_CANNOT_BE_USED'
                });
            }
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_USE_TICKET_BY_QR_CODE'
            });
        }
    });

    // GET /v1/tickets/getTicketsByRoutes
    getTicketsByRoutes = asyncErrorHandler(async (req, res, next) => {
        try {
            // Use validated data from middleware
            const { routeIds, statuses } = req.validatedQuery;

            // Call service layer
            const passengerIdTracingService = require('../services/ticket/handlers/passengerIdTracing');
            const result = await passengerIdTracingService.getTicketsByRoutes(routeIds, statuses);

            return res.status(200).json({
                success: true,
                message: 'Tickets retrieved successfully by routes',
                data: {
                    tickets: result.tickets,
                    totalCount: result.totalCount,
                    routeIds: routeIds,
                    statuses: statuses
                },
                count: result.tickets.length
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKETS_BY_ROUTES'
            });
        }
    });
}

module.exports = new TicketController();
