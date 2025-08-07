const ticketService = require('../services/ticket.service');
const TicketPriceCalculator = require('../services/ticket/calculators/TicketPriceCalculator');
const { Ticket } = require('../models/index.model');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const PassengerCacheService = require('../../../libs/cache/passenger.cache');


const SERVICE_PREFIX = process.env.REDIS_KEY_PREFIX || 'service:';



class TicketController {
    // Helper method to get passenger from cache
    async _getPassengerFromCache(req) {
        let passengerId = req.headers['x-passenger-id'];
        let passenger;
        let userId; // Declare userId at the top

        if (passengerId) {
            // Direct lookup by passengerId
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${SERVICE_PREFIX}user:passenger:`);
            passenger = await passengerCache.getPassenger(passengerId);
        } else {
            // Lookup by userId from JWT token
            userId = req.user?.id;
            if (!userId) {
                logger.error('User ID not found in request');
                throw new Error('User ID not found in request');
            }
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${SERVICE_PREFIX}user:passenger:`);
            passenger = await passengerCache.getPassengerByUserId(userId);
            if (passenger) {
                passengerId = passenger.passengerId;
            }
        }
        
        if (!passenger) {
            logger.error('Passenger not found in cache. Please sync your passenger profile or authenticate again.', {
                passengerId,
                userId
            });
            throw new Error('Passenger not found in cache. Please sync your passenger profile or authenticate again.');
        }

        return { passengerId, passenger };
    }

    // POST /v1/tickets/create-short-term
    createShortTermTicket = asyncErrorHandler(async (req, res, next) => {
        const ticketData = req.body;
        
        // Debug: Log ticket creation request
        logger.info('Creating short-term ticket', {
            hasFromStation: !!ticketData.fromStation,
            hasToStation: !!ticketData.toStation,
            tripType: ticketData.tripType,
            totalPassengers: (ticketData.numAdults || 0) + (ticketData.numElder || 0) + (ticketData.numTeenager || 0) + (ticketData.numChild || 0)
        });
        
        // Get passenger from cache to validate existence
        const { passengerId, passenger } = await this._getPassengerFromCache(req);

        const result = await ticketService.createShortTermTicket({
            ...ticketData,
            passengerId,
            passengerInfo: passenger // Include passenger info for validation
        });

        // Check if payment response was received
        if (result.paymentResponse) {
            res.status(201).json({
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
            res.status(201).json({
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
    });

    // POST /v1/tickets/create-long-term
    createLongTermTicket = asyncErrorHandler(async (req, res, next) => {
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
            res.status(201).json({
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
            res.status(201).json({
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
    });
    // GET /v1/tickets/getAllTickets
    getAllTickets = asyncErrorHandler(async (req, res, next) => {
        const filters = req.query;
        const tickets = await ticketService.getAllTickets(filters);
        
        res.status(200).json({
            success: true,
            message: 'Tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/:id
    getTicketById = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const ticket = await ticketService.getTicketById(id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Ticket retrieved successfully',
            data: ticket
        });
    });

    // GET /v1/tickets/me
    getMyTickets = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = await this._getPassengerFromCache(req);

        const filters = req.query;
        const tickets = await ticketService.getTicketsByPassenger(passengerId, filters);
        
        res.status(200).json({
            success: true,
            message: 'My tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me/unused
    getMyActiveTickets = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = await this._getPassengerFromCache(req);

        const tickets = await ticketService.getActiveTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'My active tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me/used
    getMyInactiveTickets = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = await this._getPassengerFromCache(req);

        const tickets = await ticketService.getInactiveTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'My used tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me/cancelled
    getMyCancelledTickets = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = await this._getPassengerFromCache(req);

        const tickets = await ticketService.getCancelledTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'My cancelled tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me/expired
    getMyExpiredTickets = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = await this._getPassengerFromCache(req);

        const tickets = await ticketService.getExpiredTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'My expired tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });


    // GET /v1/tickets/:id/getTicket
    getTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const { passengerId } = await this._getPassengerFromCache(req);
        
        const ticketData = await ticketService.getTicketWithQR(id, passengerId);
        
        res.status(200).json({
            success: true,
            message: 'Ticket retrieved with QR code successfully',
            data: ticketData
        });
    });

    // POST /v1/tickets/:id/cancel
    cancelTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const { reason } = req.body;
        const { passengerId } = await this._getPassengerFromCache(req);
        
        const ticket = await ticketService.cancelTicket(id, reason, passengerId);
        
        res.status(200).json({
            success: true,
            message: 'Ticket cancelled successfully',
            data: ticket
        });
    });

    // POST /v1/tickets/:id/phoneTicket
    getPhoneTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const { phoneNumber } = req.body;
        const { passengerId } = await this._getPassengerFromCache(req);
        
        const result = await ticketService.sendTicketToPhone(id, phoneNumber, passengerId);
        
        res.status(200).json({
            success: true,
            message: 'Ticket sent to phone successfully',
            data: result
        });
    });

    // POST /v1/tickets/:id/mailTicket
    getMailTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const { email } = req.body;
        const { passengerId } = await this._getPassengerFromCache(req);
        
        const result = await ticketService.sendTicketToEmail(id, email, passengerId);
        
        res.status(200).json({
            success: true,
            message: 'Ticket sent to email successfully',
            data: result
        });
    });

    // GET /v1/tickets/:id/validate
    validateTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const validation = await ticketService.validateTicket(id);
        
        res.status(200).json({
            success: true,
            message: 'Ticket validation completed',
            data: validation
        });
    });

    // GET /v1/tickets/:id/detail
    getTicketDetail = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const ticket = await ticketService.getTicketDetail(id);
        
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Ticket details retrieved successfully',
            data: ticket
        });
    });

    // PUT /v1/tickets/:id/update
    updateTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const updateData = req.body;
        
        const ticket = await ticketService.updateTicket(id, updateData);
        
        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            data: ticket
        });
    });

    // DELETE /v1/tickets/:id/delete
    deleteTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        await ticketService.deleteTicket(id);
        
        res.status(200).json({
            success: true,
            message: 'Ticket deleted successfully'
        });
    });

    // GET /v1/tickets/getTicketStatistics
    getTicketStatistics = asyncErrorHandler(async (req, res, next) => {
        const filters = req.query;
        const stats = await ticketService.getTicketStatistics(filters);
        
        res.status(200).json({
            success: true,
            message: 'Ticket statistics retrieved successfully',
            data: stats
        });
    });

    // POST /v1/tickets/expire
    expireTickets = asyncErrorHandler(async (req, res, next) => {
        const expiredCount = await ticketService.expireTickets();
        
        res.status(200).json({
            success: true,
            message: 'Expired tickets processed successfully',
            data: {
                expiredCount,
                processedAt: new Date()
            }
        });
    });

    // GET /v1/tickets/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        res.status(200).json({
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

            res.json({
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
            logger.error('Error getting ticket payment', { 
                ticketId: id, 
                error: error.message 
            });
            
            res.status(500).json({
                success: false,
                message: 'Failed to get payment information'
            });
        }
    });

    // GET /v1/tickets/payment-status/:paymentId
    getPaymentStatus = asyncErrorHandler(async (req, res, next) => {
        const { paymentId } = req.params;
        
        const ticket = await Ticket.findOne({
            where: { paymentId: paymentId }
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        // Check if payment URL is available
        if (ticket.paymentUrl) {
            res.status(200).json({
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
            res.status(200).json({
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

            // Use TicketPriceCalculator for comprehensive price calculation
            const priceCalculation = await TicketPriceCalculator.calculateTotalPriceForPassengers(
                fromStation,
                toStation,
                tripType.toLowerCase(),
                passengerCounts,
                promotionData
            );

            res.json(priceCalculation);

        } catch (error) {
            logger.error('Error calculating ticket price', {
                error: error.message,
                body: req.body
            });

            res.status(500).json({
                success: false,
                message: 'Failed to calculate ticket price',
                error: error.message
            });
        }
    });
}

module.exports = new TicketController();
