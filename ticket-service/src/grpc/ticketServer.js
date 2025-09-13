const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

// Import services
const passengerIdTracingService = require('../services/ticket/handlers/passengerIdTracing');

// Load the protobuf
const PROTO_PATH = path.join(__dirname, '../proto/ticket.proto');
let ticketProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    ticketProto = grpc.loadPackageDefinition(packageDefinition).ticket;
    logger.info('Ticket proto file loaded successfully');
} catch (error) {
    logger.error('Error loading ticket proto file:', error);
    throw error;
}

// Service implementation
const ticketService = {
    /**
     * Get tickets by route IDs
     */
    async GetTicketsByRoutes(call, callback) {
        try {
            const { routeIds, statuses } = call.request;
            
            logger.debug('gRPC GetTicketsByRoutes called', {
                routeIdsCount: routeIds?.length || 0,
                statuses
            });

            if (!routeIds || routeIds.length === 0) {
                return callback(null, {
                    tickets: [],
                    totalCount: 0
                });
            }

            // Use tracing service to get tickets by routes
            const result = await passengerIdTracingService.getTicketsByRoutes(
                routeIds, 
                statuses || ['active', 'inactive']
            );

            logger.debug('gRPC GetTicketsByRoutes success', {
                requestedRoutes: routeIds.length,
                foundTickets: result.tickets.length
            });

            callback(null, {
                tickets: result.tickets,
                totalCount: result.totalCount
            });
        } catch (error) {
            logger.error('gRPC GetTicketsByRoutes failed', {
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Get unique passenger IDs by route IDs
     */
    async GetPassengerIdsByRoutes(call, callback) {
        try {
            const { routeIds, statuses } = call.request;
            
            logger.info('gRPC GetPassengerIdsByRoutes called', {
                routeIds: routeIds,
                routeIdsCount: routeIds?.length || 0,
                statuses: statuses
            });

            if (!routeIds || routeIds.length === 0) {
                return callback(null, {
                    passengerIds: [],
                    totalCount: 0,
                    traces: []
                });
            }

            // Use tracing service to get unique passenger IDs
            const result = await passengerIdTracingService.getPassengerIdsByRoutes(
                routeIds, 
                statuses || ['active', 'inactive']
            );

            logger.info('gRPC GetPassengerIdsByRoutes success', {
                requestedRoutes: routeIds,
                requestedRoutesCount: routeIds.length,
                uniquePassengers: result.passengerIds,
                uniquePassengersCount: result.passengerIds.length,
                totalTraces: result.traces.length,
                traces: result.traces
            });

            callback(null, {
                passengerIds: result.passengerIds,
                totalCount: result.totalCount,
                traces: result.traces
            });
        } catch (error) {
            logger.error('gRPC GetPassengerIdsByRoutes failed', {
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Get tickets by passenger IDs
     */
    async GetTicketsByPassengerIds(call, callback) {
        try {
            const { passengerIds } = call.request;
            
            logger.debug('gRPC GetTicketsByPassengerIds called', {
                passengerIdsCount: passengerIds?.length || 0
            });

            if (!passengerIds || passengerIds.length === 0) {
                return callback(null, {
                    tickets: [],
                    totalCount: 0
                });
            }

            // Get tickets by passenger IDs using Sequelize
            const { Ticket } = require('../models/index.model');
            const { Op } = require('sequelize');

            const tickets = await Ticket.findAll({
                where: {
                    passengerId: {
                        [Op.in]: passengerIds
                    },
                    isActive: true
                },
                attributes: ['ticketId', 'passengerId', 'status', 'ticketType', 'fareBreakdown', 'createdAt', 'updatedAt']
            });

            // Convert to gRPC format
            const grpcTickets = tickets.map(ticket => ({
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                status: ticket.status,
                ticketType: ticket.ticketType,
                fareBreakdown: passengerIdTracingService.convertFareBreakdownToGrpc(ticket.fareBreakdown),
                createdAt: ticket.createdAt?.toISOString() || '',
                updatedAt: ticket.updatedAt?.toISOString() || ''
            }));

            logger.debug('gRPC GetTicketsByPassengerIds success', {
                requestedPassengers: passengerIds.length,
                foundTickets: grpcTickets.length
            });

            callback(null, {
                tickets: grpcTickets,
                totalCount: grpcTickets.length
            });
        } catch (error) {
            logger.error('gRPC GetTicketsByPassengerIds failed', {
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    }
};

function startGrpcServer() {
    try {
        logger.info('Creating Ticket gRPC server...');
        const server = new grpc.Server();
        
        logger.info('Adding TicketService to gRPC server...');
        server.addService(ticketProto.TicketService.service, ticketService);

        const port = process.env.TICKET_GRPC_PORT || 50052;
        logger.info(`Attempting to bind Ticket gRPC server to port ${port}...`);
        
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
            if (err) {
                logger.error('Failed to start Ticket gRPC server:', err);
                return;
            }
            logger.info(`Ticket gRPC server running on port ${boundPort}`);
            server.start();
        });

        return server;
    } catch (error) {
        logger.error('Error starting Ticket gRPC server:', error);
        throw error;
    }
}

module.exports = { startGrpcServer };
