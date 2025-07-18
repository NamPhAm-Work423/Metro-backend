const ticketService = require('../services/ticket.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const PassengerCacheService = require('../../../../libs/cache/passenger.cache');


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

        const ticket = await ticketService.createShortTermTicket({
            ...ticketData,
            passengerId,
            passengerInfo: passenger // Include passenger info for validation
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket
        });
    });

    // POST /v1/tickets/create-long-term
    createLongTermTicket = asyncErrorHandler(async (req, res, next) => {
        const ticketData = req.body;
        
        // Get passenger from cache to validate existence
        const { passengerId, passenger } = await this._getPassengerFromCache(req);

        const ticket = await ticketService.createLongTermTicket({
            ...ticketData,
            passengerId,
            passengerInfo: passenger // Include passenger info for validation
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket
        });
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
}

module.exports = new TicketController();
