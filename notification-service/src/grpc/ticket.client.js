const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

/**
 * Ticket Service gRPC Client
 * Handles communication with ticket-service via gRPC
 */
class TicketGrpcClient {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    /**
     * Initialize gRPC client
     */
    async initialize() {
        try {
            const PROTO_PATH = path.join(__dirname, '../proto/ticket.proto');
            
            const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });

            const ticketProto = grpc.loadPackageDefinition(packageDefinition).ticket;
            
            const ticketServiceUrl = process.env.TICKET_SERVICE_GRPC_URL || 'localhost:50051';
            
            this.client = new ticketProto.TicketService(
                ticketServiceUrl,
                grpc.credentials.createInsecure()
            );

            this.initialized = true;
            logger.info('Ticket gRPC client initialized successfully', {
                serviceUrl: ticketServiceUrl
            });
        } catch (error) {
            logger.error('Failed to initialize Ticket gRPC client', {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Ensure client is initialized
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * Get tickets by route IDs
     * @param {Array<string>} routeIds - Array of route IDs
     * @param {Array<string>} statuses - Array of ticket statuses ['active', 'inactive']
     * @returns {Promise<Object>} Tickets response
     */
    async getTicketsByRoutes(routeIds, statuses = ['active', 'inactive']) {
        try {
            await this.ensureInitialized();

            const request = {
                routeIds: routeIds,
                statuses: statuses
            };

            logger.debug('Calling getTicketsByRoutes gRPC', {
                routeIds,
                statuses
            });

            return new Promise((resolve, reject) => {
                this.client.getTicketsByRoutes(request, (error, response) => {
                    if (error) {
                        logger.error('gRPC getTicketsByRoutes failed', {
                            error: error.message,
                            code: error.code,
                            details: error.details
                        });
                        reject(error);
                    } else {
                        logger.debug('gRPC getTicketsByRoutes success', {
                            ticketCount: response.tickets?.length || 0,
                            totalCount: response.totalCount
                        });
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to call getTicketsByRoutes', {
                error: error.message,
                routeIds,
                statuses
            });
            throw error;
        }
    }

    /**
     * Get tickets by passenger IDs
     * @param {Array<string>} passengerIds - Array of passenger IDs
     * @returns {Promise<Object>} Tickets response
     */
    async getTicketsByPassengerIds(passengerIds) {
        try {
            await this.ensureInitialized();

            const request = {
                passengerIds: passengerIds
            };

            logger.debug('Calling getTicketsByPassengerIds gRPC', {
                passengerIds: passengerIds.length
            });

            return new Promise((resolve, reject) => {
                this.client.getTicketsByPassengerIds(request, (error, response) => {
                    if (error) {
                        logger.error('gRPC getTicketsByPassengerIds failed', {
                            error: error.message,
                            code: error.code,
                            details: error.details
                        });
                        reject(error);
                    } else {
                        logger.debug('gRPC getTicketsByPassengerIds success', {
                            ticketCount: response.tickets?.length || 0
                        });
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.error('Failed to call getTicketsByPassengerIds', {
                error: error.message,
                passengerIdsCount: passengerIds.length
            });
            throw error;
        }
    }

    /**
     * Extract unique passenger IDs from tickets
     * @param {Array} tickets - Array of ticket objects
     * @returns {Array<string>} Unique passenger IDs
     */
    extractUniquePassengerIds(tickets) {
        const passengerIds = new Set();
        
        tickets.forEach(ticket => {
            if (ticket.passengerId) {
                passengerIds.add(ticket.passengerId);
            }
        });

        const uniqueIds = Array.from(passengerIds);
        logger.debug('Extracted unique passenger IDs', {
            totalTickets: tickets.length,
            uniquePassengers: uniqueIds.length
        });

        return uniqueIds;
    }

    /**
     * Check if ticket's fare breakdown contains any of the specified route IDs
     * @param {Object} fareBreakdown - Ticket fare breakdown
     * @param {Array<string>} routeIds - Route IDs to check
     * @returns {boolean} True if any route ID is found
     */
    ticketContainsRoutes(fareBreakdown, routeIds) {
        if (!fareBreakdown) return false;

        // Check in segmentFares
        if (fareBreakdown.segmentFares) {
            for (const segment of fareBreakdown.segmentFares) {
                if (routeIds.includes(segment.routeId)) {
                    return true;
                }
            }
        }

        // Check in journeyDetails.routeSegments
        if (fareBreakdown.journeyDetails?.routeSegments) {
            for (const segment of fareBreakdown.journeyDetails.routeSegments) {
                if (routeIds.includes(segment.routeId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Close gRPC client connection
     */
    close() {
        if (this.client) {
            this.client.close();
            this.initialized = false;
            logger.info('Ticket gRPC client closed');
        }
    }
}

module.exports = new TicketGrpcClient();
