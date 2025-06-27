const ticketService = require('../services/ticket.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');

class TicketController {
    // POST /v1/tickets
    createTicket = asyncErrorHandler(async (req, res, next) => {
        const ticketData = req.body;
        
        // Extract passenger ID from authenticated user or request
        const passengerId = req.headers['x-passenger-id'] || req.user?.passengerId || ticketData.passengerId;
        
        if (!passengerId) {
            return res.status(400).json({
                success: false,
                message: 'Passenger ID is required'
            });
        }

        const ticket = await ticketService.createTicket({
            ...ticketData,
            passengerId
        });

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            data: ticket
        });
    });

    // GET /v1/tickets
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

    // GET /v1/tickets/passenger/:passengerId
    getTicketsByPassenger = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = req.params;
        const filters = req.query;
        const tickets = await ticketService.getTicketsByPassenger(passengerId, filters);
        
        res.status(200).json({
            success: true,
            message: 'Passenger tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/passenger/:passengerId/active
    getActiveTicketsByPassenger = asyncErrorHandler(async (req, res, next) => {
        const { passengerId } = req.params;
        const tickets = await ticketService.getActiveTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'Active passenger tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me
    getMyTickets = asyncErrorHandler(async (req, res, next) => {
        const passengerId = req.headers['x-passenger-id'] || req.user?.passengerId;
        
        if (!passengerId) {
            return res.status(400).json({
                success: false,
                message: 'Passenger ID not found in request'
            });
        }

        const filters = req.query;
        const tickets = await ticketService.getTicketsByPassenger(passengerId, filters);
        
        res.status(200).json({
            success: true,
            message: 'My tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // GET /v1/tickets/me/active
    getMyActiveTickets = asyncErrorHandler(async (req, res, next) => {
        const passengerId = req.headers['x-passenger-id'] || req.user?.passengerId;
        
        if (!passengerId) {
            return res.status(400).json({
                success: false,
                message: 'Passenger ID not found in request'
            });
        }

        const tickets = await ticketService.getActiveTicketsByPassenger(passengerId);
        
        res.status(200).json({
            success: true,
            message: 'My active tickets retrieved successfully',
            data: tickets,
            count: tickets.length
        });
    });

    // POST /v1/tickets/:id/use
    useTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const usageData = req.body;
        
        const ticket = await ticketService.useTicket(id, usageData);
        
        res.status(200).json({
            success: true,
            message: 'Ticket used successfully',
            data: ticket
        });
    });

    // POST /v1/tickets/:id/cancel
    cancelTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const { reason } = req.body;
        
        const ticket = await ticketService.cancelTicket(id, reason);
        
        res.status(200).json({
            success: true,
            message: 'Ticket cancelled successfully',
            data: ticket
        });
    });

    // POST /v1/tickets/:id/refund
    refundTicket = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        const refundData = req.body;
        
        const ticket = await ticketService.refundTicket(id, refundData);
        
        res.status(200).json({
            success: true,
            message: 'Ticket refunded successfully',
            data: ticket
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

    // GET /v1/tickets/statistics
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
