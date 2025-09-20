const ticketService = require('../services/ticket.service');
const TicketPriceCalculator = require('../services/ticket/calculators/TicketPriceCalculator');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const { logger } = require('../config/logger');
const { getClient } = require('../config/redis');
const PassengerCacheService = require('../services/cache/PassengerCacheService');
const { paymentCache } = require('../cache/paymentCache');
const PaymentCompletionHandler = require('../services/ticket/handlers/PaymentCompletionHandler');
const { publish } = require('../kafka/kafkaProducer');
const { addCustomSpan } = require('../tracing');


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
        await addCustomSpan('ticket.create-short-term', async (span) => {
            const ticketData = req.body;
            
            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'ticket',
                'ticket.type': 'short_term',
                'ticket.start_station': ticketData.startStationId,
                'ticket.end_station': ticketData.endStationId,
                'ticket.quantity': ticketData.quantity || 1,
                'request.authenticated': !!req.user,
                'user.id': req.user?.id || 'unknown'
            });

            try {
                logger.traceInfo('Creating short-term ticket', {
                    ticketData: {
                        startStationId: ticketData.startStationId,
                        endStationId: ticketData.endStationId,
                        quantity: ticketData.quantity
                    },
                    requestedBy: req.user?.id
                });
                
                // Get passenger from cache to validate existence
                const { passengerId, passenger } = await addCustomSpan('ticket.get-passenger-cache', async (cacheSpan) => {
                    cacheSpan.setAttributes({
                        'cache.operation': 'get_passenger',
                        'cache.source': 'redis'
                    });
                    
                    const result = await this._getPassengerFromCache(req);
                    
                    cacheSpan.setAttributes({
                        'cache.passenger_found': !!result.passenger,
                        'passenger.id': result.passengerId || 'not_found'
                    });
                    
                    return result;
                });

                span.setAttributes({
                    'passenger.id': passengerId,
                    'passenger.found': !!passenger
                });

                const result = await addCustomSpan('ticket.service.create-short-term', async (serviceSpan) => {
                    serviceSpan.setAttributes({
                        'service.operation': 'create_short_term_ticket',
                        'ticket.passenger_id': passengerId,
                        'ticket.start_station': ticketData.startStationId,
                        'ticket.end_station': ticketData.endStationId
                    });
                    
                    const serviceResult = await ticketService.createShortTermTicket({
                        ...ticketData,
                        passengerId,
                        passengerInfo: passenger // Include passenger info for validation
                    });
                    
                    serviceSpan.setAttributes({
                        'service.success': !!serviceResult,
                        'ticket.created_id': serviceResult?.ticket?.ticketId,
                        'payment.required': !!serviceResult?.paymentResponse,
                        'payment.id': serviceResult?.paymentId || 'none'
                    });
                    
                    return serviceResult;
                });

                // Check if payment response was received
                if (result.paymentResponse) {
                    span.setAttributes({
                        'ticket.creation_success': true,
                        'payment.url_generated': !!result.paymentResponse.paymentUrl,
                        'payment.method': result.paymentResponse.paymentMethod,
                        'http.status_code': 201
                    });
                    
                    logger.traceInfo('Short-term ticket created with payment', {
                        ticketId: result.ticket?.ticketId,
                        paymentId: result.paymentId,
                        paymentMethod: result.paymentResponse.paymentMethod,
                        paymentUrl: !!result.paymentResponse.paymentUrl
                    });
                    
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
                    span.setAttributes({
                        'ticket.creation_success': true,
                        'payment.url_generated': false,
                        'http.status_code': 201
                    });
                    
                    logger.traceInfo('Short-term ticket created, payment processing', {
                        ticketId: result.ticket?.ticketId,
                        paymentId: result.paymentId
                    });
                    
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
                span.recordException(error);
                span.setAttributes({
                    'ticket.creation_success': false,
                    'error.type': error.constructor.name,
                    'error.message': error.message,
                    'http.status_code': 500
                });
                
                logger.traceError('Failed to create short-term ticket', error, {
                    ticketData: {
                        startStationId: ticketData.startStationId,
                        endStationId: ticketData.endStationId,
                        quantity: ticketData.quantity
                    },
                    requestedBy: req.user?.id
                });
                
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_CREATE_SHORT_TERM_TICKET'
                });
            }
        });
    });

    // POST /v1/tickets/create-long-term
    createLongTermTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.create-long-term', async (span) => {
            const ticketData = req.body;
            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'ticket',
                'ticket.type': 'long_term',
                'ticket.start_station': ticketData.startStationId,
                'ticket.end_station': ticketData.endStationId,
                'request.authenticated': !!req.user,
                'user.id': req.user?.id || 'unknown'
            });
            try {
                const { passengerId, passenger } = await addCustomSpan('ticket.get-passenger-cache', async (cacheSpan) => {
                    cacheSpan.setAttributes({ 'cache.operation': 'get_passenger', 'cache.source': 'redis' });
                    const result = await this._getPassengerFromCache(req);
                    cacheSpan.setAttributes({ 'cache.passenger_found': !!result.passenger, 'passenger.id': result.passengerId || 'not_found' });
                    return result;
                });

                const result = await addCustomSpan('ticket.service.create-long-term', async (serviceSpan) => {
                    serviceSpan.setAttributes({ 'service.operation': 'create_long_term_ticket', 'ticket.passenger_id': passengerId });
                    const serviceResult = await ticketService.createLongTermTicket({
                        ...ticketData,
                        passengerId,
                        passengerInfo: passenger
                    });
                    serviceSpan.setAttributes({ 'service.success': !!serviceResult, 'ticket.created_id': serviceResult?.ticket?.ticketId, 'payment.required': !!serviceResult?.paymentResponse });
                    return serviceResult;
                });

                if (result.paymentResponse) {
                    span.setAttributes({ 'ticket.creation_success': true, 'payment.url_generated': !!result.paymentResponse.paymentUrl, 'http.status_code': 201 });
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
                    span.setAttributes({ 'ticket.creation_success': true, 'payment.url_generated': false, 'http.status_code': 201 });
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
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_CREATE_LONG_TERM_TICKET'
                });
            }
        });
    });
    // GET /v1/tickets/getAllTickets
    getAllTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-all', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'all', 'query.has_filters': Object.keys(req.query || {}).length > 0 });
            try {
                const filters = req.query;
                const tickets = await addCustomSpan('ticket.service.get-all', async () => ticketService.getAllTickets(filters));
                span.setAttributes({ 'operation.success': true, 'items.count': tickets.length, 'http.status_code': 200 });
                return res.status(200).json({
                    success: true,
                    message: 'Tickets retrieved successfully',
                    data: tickets,
                    count: tickets.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_ALL_TICKETS'
                });
            }
        });
    });

    // GET /v1/tickets/:id
    getTicketById = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-by-id', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'ticket.id': id });
            try {
                const ticket = await addCustomSpan('ticket.service.get-by-id', async () => ticketService.getTicketById(id));
                if (!ticket) {
                    span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                    return res.status(404).json({ success: false, message: 'Ticket not found' });
                }
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket retrieved successfully', data: ticket });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_TICKET_BY_ID' });
            }
        });
    });

    // GET /v1/tickets/me
    getMyTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-my-tickets', async (span) => {
            span.setAttributes({
                'operation.type': 'read',
                'operation.entity': 'ticket',
                'operation.scope': 'user_tickets',
                'request.authenticated': !!req.user,
                'user.id': req.user?.id || 'unknown'
            });

            try {
                logger.traceInfo('Fetching user tickets', {
                    filters: req.query,
                    requestedBy: req.user?.id
                });

                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async (cacheSpan) => {
                    cacheSpan.setAttributes({
                        'cache.operation': 'get_passenger',
                        'cache.source': 'redis'
                    });
                    
                    const result = await this._getPassengerFromCache(req);
                    
                    cacheSpan.setAttributes({
                        'cache.passenger_found': !!result.passenger,
                        'passenger.id': result.passengerId || 'not_found'
                    });
                    
                    return result;
                });

                span.setAttributes({
                    'passenger.id': passengerId,
                    'query.has_filters': Object.keys(req.query || {}).length > 0
                });

                const filters = req.query;
                const tickets = await addCustomSpan('ticket.service.get-by-passenger', async (serviceSpan) => {
                    serviceSpan.setAttributes({
                        'service.operation': 'get_tickets_by_passenger',
                        'passenger.id': passengerId,
                        'query.filters': JSON.stringify(filters || {})
                    });
                    
                    const result = await ticketService.getTicketsByPassenger(passengerId, filters);
                    
                    serviceSpan.setAttributes({
                        'service.success': true,
                        'tickets.count': result.length,
                        'tickets.found': result.length > 0
                    });
                    
                    return result;
                });
                
                span.setAttributes({
                    'operation.success': true,
                    'response.tickets_count': tickets.length,
                    'http.status_code': 200
                });
                
                logger.traceInfo('User tickets retrieved successfully', {
                    passengerId,
                    ticketsCount: tickets.length,
                    filters: req.query
                });
                
                return res.status(200).json({
                    success: true,
                    message: 'My tickets retrieved successfully',
                    data: tickets,
                    count: tickets.length
                });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({
                    'operation.success': false,
                    'error.type': error.constructor.name,
                    'error.message': error.message,
                    'http.status_code': 500
                });
                
                logger.traceError('Failed to retrieve user tickets', error, {
                    filters: req.query,
                    requestedBy: req.user?.id
                });
                
                return res.status(500).json({
                    success: false,
                    message: error.message,
                    error: 'INTERNAL_ERROR_GET_MY_TICKETS'
                });
            }
        });
    });

    // GET /v1/tickets/me/unused
    getMyActiveTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-my-active', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'user_active' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const tickets = await addCustomSpan('ticket.service.get-active-by-passenger', async () => ticketService.getActiveTicketsByPassenger(passengerId));
                span.setAttributes({ 'operation.success': true, 'items.count': tickets.length, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'My active tickets retrieved successfully', data: tickets, count: tickets.length });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_MY_ACTIVE_TICKETS' });
            }
        });
    });

    // GET /v1/tickets/me/used
    getMyInactiveTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-my-inactive', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'user_inactive' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const tickets = await addCustomSpan('ticket.service.get-inactive-by-passenger', async () => ticketService.getInactiveTicketsByPassenger(passengerId));
                span.setAttributes({ 'operation.success': true, 'items.count': tickets.length, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'My used tickets retrieved successfully', data: tickets, count: tickets.length });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_MY_INACTIVE_TICKETS' });
            }
        });
    });

    // GET /v1/tickets/me/cancelled
    getMyCancelledTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-my-cancelled', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'user_cancelled' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const tickets = await addCustomSpan('ticket.service.get-cancelled-by-passenger', async () => ticketService.getCancelledTicketsByPassenger(passengerId));
                span.setAttributes({ 'operation.success': true, 'items.count': tickets.length, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'My cancelled tickets retrieved successfully', data: tickets, count: tickets.length });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_MY_CANCELLED_TICKETS' });
            }
        });
    });

    // GET /v1/tickets/me/expired
    getMyExpiredTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-my-expired', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'user_expired' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const tickets = await addCustomSpan('ticket.service.get-expired-by-passenger', async () => ticketService.getExpiredTicketsByPassenger(passengerId));
                span.setAttributes({ 'operation.success': true, 'items.count': tickets.length, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'My expired tickets retrieved successfully', data: tickets, count: tickets.length });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_MY_EXPIRED_TICKETS' });
            }
        });
    });


    // GET /v1/tickets/:id/getTicket
    getTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-with-qr', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'ticket.id': id, 'operation.scope': 'with_qr' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const ticketData = await addCustomSpan('ticket.service.get-with-qr', async () => ticketService.getTicketWithQR(id, passengerId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket retrieved with QR code successfully', data: ticketData });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_TICKET' });
            }
        });
    });

    // POST /v1/tickets/:id/cancel
    cancelTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.cancel', async (span) => {
            const { id } = req.params;
            const { reason } = req.body;
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'ticket', 'ticket.id': id, 'ticket.cancel.reason': reason || 'none' });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const ticket = await addCustomSpan('ticket.service.cancel', async () => ticketService.cancelTicket(id, reason, passengerId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket cancelled successfully', data: ticket });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_CANCEL_TICKET' });
            }
        });
    });

    // POST /v1/tickets/:id/phoneTicket
    getPhoneTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.send-to-phone', async (span) => {
            const { id } = req.params;
            const { phoneNumber } = req.body;
            span.setAttributes({ 'operation.type': 'send', 'operation.entity': 'ticket', 'ticket.id': id, 'contact.phone': !!phoneNumber });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const result = await addCustomSpan('ticket.service.send-to-phone', async () => ticketService.sendTicketToPhone(id, phoneNumber, passengerId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket sent to phone successfully', data: result });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_SEND_TICKET_TO_PHONE' });
            }
        });
    });

    // POST /v1/tickets/:id/mailTicket
    getMailTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.send-to-email', async (span) => {
            const { id } = req.params;
            const { email } = req.body;
            span.setAttributes({ 'operation.type': 'send', 'operation.entity': 'ticket', 'ticket.id': id, 'contact.email': !!email });
            try {
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const result = await addCustomSpan('ticket.service.send-to-email', async () => ticketService.sendTicketToEmail(id, email, passengerId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket sent to email successfully', data: result });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_SEND_TICKET_TO_EMAIL' });
            }
        });
    });

    // GET /v1/tickets/:id/validate
    validateTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.validate', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'validate', 'operation.entity': 'ticket', 'ticket.id': id });
            try {
                const validation = await addCustomSpan('ticket.service.validate', async () => ticketService.validateTicket(id));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket validation completed', data: validation });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_VALIDATE_TICKET' });
            }
        });
    });

    // GET /v1/tickets/:id/detail
    getTicketDetail = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-detail', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'ticket.id': id, 'operation.scope': 'detail' });
            try {
                const ticket = await addCustomSpan('ticket.service.get-detail', async () => ticketService.getTicketDetail(id));
                if (!ticket) {
                    span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                    return res.status(404).json({ success: false, message: 'Ticket not found' });
                }
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket details retrieved successfully', data: ticket });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_TICKET_DETAIL' });
            }
        });
    });

    // PUT /v1/tickets/:id/update
    updateTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.update', async (span) => {
            const { id } = req.params;
            const updateData = req.body;
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'ticket', 'ticket.id': id });
            try {
                const ticket = await addCustomSpan('ticket.service.update', async () => ticketService.updateTicket(id, updateData));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket updated successfully', data: ticket });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_UPDATE_TICKET' });
            }
        });
    });

    // PUT /v1/tickets/:id/status
    updateTicketStatus = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.update-status', async (span) => {
            const { id } = req.params;
            const { status, reason } = req.body;
            const updatedBy = req.user?.id;
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'ticket', 'ticket.id': id, 'ticket.new_status': status, 'user.id': updatedBy || 'unknown' });
            try {
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
            const currentTicket = await addCustomSpan('ticket.service.get-by-id', async () => ticketService.getTicketById(id));
            const oldStatus = currentTicket ? currentTicket.status : 'unknown';
            
            const ticket = await addCustomSpan('ticket.service.update-status', async () => ticketService.updateTicketStatus(id, status, reason, updatedBy));
            
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
    });

    // DELETE /v1/tickets/:id/delete
    deleteTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.delete', async (span) => {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'delete', 'operation.entity': 'ticket', 'ticket.id': id });
            try {
                await addCustomSpan('ticket.service.delete', async () => ticketService.deleteTicket(id));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_DELETE_TICKET' });
            }
        });
    });

    // GET /v1/tickets/getTicketStatistics
    getTicketStatistics = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-statistics', async (span) => {
            const filters = req.query;
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'operation.scope': 'statistics' });
            try {
                const stats = await addCustomSpan('ticket.service.get-statistics', async () => ticketService.getTicketStatistics(filters));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket statistics retrieved successfully', data: stats });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_TICKET_STATISTICS' });
            }
        });
    });

    // POST /v1/tickets/expire
    expireTickets = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.expire', async (span) => {
            span.setAttributes({ 'operation.type': 'update', 'operation.entity': 'ticket', 'operation.scope': 'expire' });
            try {
                const expiredCount = await addCustomSpan('ticket.service.expire', async () => ticketService.expireTickets());
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Expired tickets processed successfully', data: { expiredCount, processedAt: new Date() } });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_EXPIRE_TICKETS' });
            }
        });
    });

    // GET /v1/tickets/health
    healthCheck = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.health', async (span) => {
            span.setAttributes({ 'operation.type': 'health', 'operation.entity': 'ticket' });
            return res.status(200).json({ success: true, message: 'Ticket service is healthy', timestamp: new Date(), service: 'ticket-controller' });
        });
    });

    // GET /v1/tickets/:id/payment
    getTicketPayment = asyncErrorHandler(async (req, res, next) => {
        const { id } = req.params;
        await addCustomSpan('ticket.get-payment', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'ticket.id': id, 'operation.scope': 'payment' });
            try {
                const ticket = await addCustomSpan('ticket.service.get-by-id', async () => ticketService.getTicketById(id));
                if (!ticket) {
                    span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                    return res.status(404).json({ success: false, message: 'Ticket not found' });
                }
                const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:8002';
                const response = await fetch(`${paymentServiceUrl}/v1/payment/ticket/${id}`);
                if (!response.ok) {
                    span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                    return res.status(404).json({ success: false, message: 'Payment not found for this ticket' });
                }
                const paymentData = await response.json();
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, data: { ticket: { ticketId: ticket.ticketId, passengerId: ticket.passengerId, totalPrice: ticket.totalPrice, status: ticket.status, validFrom: ticket.validFrom, validUntil: ticket.validUntil }, payment: paymentData.data } });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_GET_TICKET_PAYMENT' });
            }
        });
    });

    // GET /v1/tickets/payment-status/:paymentId
    getPaymentStatus = asyncErrorHandler(async (req, res, next) => {
        const { paymentId } = req.params;
        await addCustomSpan('ticket.get-payment-status', async (span) => {
            span.setAttributes({ 'operation.type': 'read', 'operation.entity': 'ticket', 'payment.id': paymentId, 'operation.scope': 'payment_status' });
            const ticket = await addCustomSpan('ticket.service.get-by-payment-id', async () => ticketService.getTicketByPaymentId(paymentId));
            if (!ticket) {
                span.setAttributes({ 'operation.success': false, 'http.status_code': 404 });
                return res.status(404).json({ success: false, message: 'Ticket not found' });
            }
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200, 'payment.url_ready': !!ticket.paymentUrl });
            if (ticket.paymentUrl) {
                return res.status(200).json({ success: true, message: 'Payment URL is ready', data: { paymentId: ticket.paymentId, paymentUrl: ticket.paymentUrl, paymentMethod: ticket.paymentMethod, paypalOrderId: ticket.paypalOrderId, status: 'ready' } });
            } else {
                return res.status(200).json({ success: true, message: 'Payment URL is still being generated', data: { paymentId: ticket.paymentId, status: 'processing', message: 'Payment URL is being generated. Please check back in a few seconds.' } });
            }
        });
    });

    // POST /v1/tickets/calculate-price
    calculateTicketPrice = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.calculate-price', async (span) => {
            try {
            const {
                fromStation,
                toStation,
                tripType = 'Oneway',
                promotionId = null,
                promotionCode = null
            } = req.body;
            span.setAttributes({ 'operation.type': 'calculate', 'operation.entity': 'ticket', 'calc.trip_type': String(tripType).toLowerCase() });

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
            const priceCalculation = await addCustomSpan('ticket.service.calculate-price', async () => TicketPriceCalculator.calculateTotalPriceForPassengers(
                fromStation,
                toStation,
                tripType.toLowerCase(),
                passengerCounts,
                promotionData
            ));

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

            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
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

            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Failed to calculate ticket price',
                error: 'INTERNAL_ERROR_CALCULATE_TICKET_PRICE'
            });
        }
        });
    });

    // POST /v1/tickets/active-long-term/:id
    activateLongTermTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.activate-long-term', async (span) => {
            try {
            const { id } = req.params;
            // Only enforce ownership when requester is a passenger.
            // Resolve real passengerId from cache (user.id is not passengerId).
            let passengerId = null;
            if (req.user?.role === 'passenger') {
                const passengerFromCache = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                passengerId = passengerFromCache?.passengerId || null;
            }
            
            const ticket = await addCustomSpan('ticket.service.activate-long-term', async () => ticketService.activateTicket(id, passengerId));
            
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
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_ACTIVATE_LONG_TERM_TICKET'
            });
        }
        });
    });

    // POST /v1/tickets/:id/use
    useTicket = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.use', async (span) => {
            try {
                const { id } = req.params;
                const { passengerId } = await addCustomSpan('ticket.get-passenger-cache', async () => this._getPassengerFromCache(req));
                const result = await addCustomSpan('ticket.service.use', async () => ticketService.useTicket(id, passengerId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket used successfully', data: result?.info || {}, timestamp: new Date() });
            } catch (error) {
                span.recordException(error);
                span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
                return res.status(500).json({ success: false, message: error.message, error: 'INTERNAL_ERROR_USE_TICKET' });
            }
        });
    });

    // POST /v1/tickets/qr/:qrCode/use
    useTicketByQRCode = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.use-by-qrcode', async (span) => {
            try {
                const { qrCode } = req.params;
                const staffId = req.user?.id || null;
                const result = await addCustomSpan('ticket.service.use-by-qrcode', async () => ticketService.useTicketByQRCode(qrCode, staffId));
                span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
                return res.status(200).json({ success: true, message: 'Ticket used successfully via QR code', data: result?.info || {}, timestamp: new Date() });
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
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_USE_TICKET_BY_QR_CODE'
            });
        }
        });
    });

    // GET /v1/tickets/getTicketsByRoutes
    getTicketsByRoutes = asyncErrorHandler(async (req, res, next) => {
        await addCustomSpan('ticket.get-by-routes', async (span) => {
            try {
            // Use validated data from middleware
            const { routeIds, statuses } = req.validatedQuery;

            // Call service layer
            const passengerIdTracingService = require('../services/ticket/handlers/passengerIdTracing');
            const result = await addCustomSpan('ticket.service.get-by-routes', async () => passengerIdTracingService.getTicketsByRoutes(routeIds, statuses));

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
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'error.message': error.message, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_GET_TICKETS_BY_ROUTES'
            });
        }
        });
    });

    processPaymentReadyEvent = async (eventData) => {
        return addCustomSpan('event.ticket.payment_ready', async (span) => {
            const { ticketId, paymentId, paymentUrl, paymentMethod, paypalOrderId = null, status, redirectUrls = {} } = eventData || {};
            span.setAttributes({ 'event.type': 'payment_ready', 'ticket.id': ticketId, 'payment.id': paymentId });
            // Cache for quick retrieval
            if (paymentId && ticketId) {
                paymentCache.set(paymentId, { ticketId, paymentId, paymentUrl, paymentMethod, paypalOrderId, status, redirectUrls });
                paymentCache.set(ticketId, { ticketId, paymentId, paymentUrl, paymentMethod, paypalOrderId, status, redirectUrls });
            }
            await ticketService.updateTicketStatus(ticketId, 'pending_payment', null, 'system-event');
            return { success: true };
        });
    };

    processPaymentCompletedEvent = async (eventData) => {
        return addCustomSpan('event.ticket.payment_completed', async (span) => {
            const { paymentId, ticketId, paymentData = {} } = eventData || {};
            span.setAttributes({ 'event.type': 'payment_completed', 'ticket.id': ticketId, 'payment.id': paymentId });
            const ticket = await ticketService.getTicketById(ticketId);
            if (!ticket) {
                return { success: false, reason: 'TICKET_NOT_FOUND' };
            }
            const result = await PaymentCompletionHandler.processPaymentCompletion(ticket, paymentId, paymentData);
            if (result?.success) {
                // Persist purchase date via service update
                const purchaseDate = new Date();
                await ticketService.updateTicket(ticketId, { purchaseDate, updatedAt: purchaseDate });
            }
            return result;
        });
    };

    processPaymentFailedEvent = async (eventData) => {
        return addCustomSpan('event.ticket.payment_failed', async (span) => {
            const { ticketId } = eventData || {};
            span.setAttributes({ 'event.type': 'payment_failed', 'ticket.id': ticketId });
            await ticketService.updateTicketStatus(ticketId, 'pending_payment', 'payment_failed', 'system-event');
            return { success: true };
        });
    };

    processPaymentCancelledEvent = async (eventData) => {
        return addCustomSpan('event.ticket.payment_cancelled', async (span) => {
            const { ticketId, reason } = eventData || {};
            span.setAttributes({ 'event.type': 'payment_cancelled', 'ticket.id': ticketId });
            await ticketService.updateTicketStatus(ticketId, 'cancelled', reason || 'payment_cancelled', 'system-event');
            return { success: true };
        });
    };

    syncPassengerCacheEvent = async (eventData) => {
        return addCustomSpan('event.passenger.cache_sync', async (span) => {
            const passenger = eventData?.passenger || eventData?.data;
            if (!passenger || !passenger.passengerId) {
                span.setAttributes({ 'operation.success': false });
                return { success: false, reason: 'INVALID_PAYLOAD' };
            }
            const redisClient = getClient();
            const passengerCache = new PassengerCacheService(redisClient, logger, `${USER_CACHE_PREFIX}user-service:user:passenger:`);
            await passengerCache.setPassenger(passenger);
            return { success: true };
        });
    };
}

module.exports = new TicketController();
