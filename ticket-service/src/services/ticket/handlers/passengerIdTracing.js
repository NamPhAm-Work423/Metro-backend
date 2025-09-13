const { Ticket } = require('../../../models/index.model');
const { logger } = require('../../../config/logger');

/**
 * Passenger ID Tracing Service
 * Finds passenger IDs based on route IDs in fareBreakdown
 * Follows SOLID principles with single responsibility for route-based tracing
 */
class PassengerIdTracingService {
    /**
     * Get unique passenger IDs by route IDs
     * @param {Array<string>} routeIds - Array of route IDs to search for
     * @param {Array<string>} statuses - Array of ticket statuses to filter ['active', 'inactive']
     * @returns {Promise<Object>} Result with unique passengerIds and traces
     */
    async getPassengerIdsByRoutes(routeIds, statuses = ['active', 'inactive']) {
        try {
            logger.debug('Starting passenger ID tracing by routes', {
                routeIds,
                statuses,
                routeCount: routeIds.length
            });

            if (!routeIds || routeIds.length === 0) {
                return {
                    passengerIds: [],
                    totalCount: 0,
                    traces: []
                };
            }

            // Get all tickets with specified statuses
            const tickets = await this.getTicketsWithFareBreakdown(statuses);
            
            logger.debug('Retrieved tickets for tracing', {
                totalTickets: tickets.length
            });

            // Trace tickets that contain any of the specified routes
            const traceResult = this.traceTicketsByRoutes(tickets, routeIds);
            
            // Extract unique passenger IDs
            const uniquePassengerIds = this.extractUniquePassengerIds(traceResult.matchedTickets);

            const result = {
                passengerIds: uniquePassengerIds,
                totalCount: uniquePassengerIds.length,
                traces: traceResult.traces
            };

            logger.info('Passenger ID tracing completed', {
                requestedRoutes: routeIds.length,
                totalTicketsScanned: tickets.length,
                matchedTickets: traceResult.matchedTickets.length,
                uniquePassengers: uniquePassengerIds.length
            });

            return result;
        } catch (error) {
            logger.error('Failed to trace passenger IDs by routes', {
                routeIds,
                statuses,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get tickets with fareBreakdown for tracing
     * @param {Array<string>} statuses - Ticket statuses to filter
     * @returns {Promise<Array>} Array of tickets
     */
    async getTicketsWithFareBreakdown(statuses) {
        const { Op } = require('sequelize');
        
        return await Ticket.findAll({
            where: {
                status: {
                    [Op.in]: statuses
                },
                fareBreakdown: {
                    [Op.ne]: null
                },
                isActive: true
            },
            attributes: ['ticketId', 'passengerId', 'status', 'ticketType', 'fareBreakdown', 'createdAt', 'updatedAt']
        });
    }

    /**
     * Trace tickets that contain any of the specified routes
     * @param {Array} tickets - Array of tickets to search
     * @param {Array<string>} routeIds - Route IDs to match
     * @returns {Object} Tracing result with matched tickets and traces
     */
    traceTicketsByRoutes(tickets, routeIds) {
        const matchedTickets = [];
        const traces = [];

        tickets.forEach(ticket => {
            const matchResult = this.checkTicketContainsRoutes(ticket, routeIds);
            
            if (matchResult.isMatch) {
                matchedTickets.push(ticket);
                traces.push({
                    ticketId: ticket.ticketId,
                    passengerId: ticket.passengerId,
                    ticketType: ticket.ticketType,
                    matchedRouteIds: matchResult.matchedRoutes,
                    reason: matchResult.reason
                });
            }
        });

        return {
            matchedTickets,
            traces
        };
    }

    /**
     * Check if ticket's fareBreakdown contains any of the specified routes
     * @param {Object} ticket - Ticket object with fareBreakdown
     * @param {Array<string>} routeIds - Route IDs to check
     * @returns {Object} Match result with details
     */
    checkTicketContainsRoutes(ticket, routeIds) {
        const matchedRoutes = [];
        let reason = '';

        if (!ticket.fareBreakdown) {
            return {
                isMatch: false,
                matchedRoutes: [],
                reason: 'No fareBreakdown'
            };
        }

        const fareBreakdown = ticket.fareBreakdown;

        // Check in segmentFares
        if (fareBreakdown.segmentFares && Array.isArray(fareBreakdown.segmentFares)) {
            fareBreakdown.segmentFares.forEach(segment => {
                if (segment.routeId && routeIds.includes(segment.routeId)) {
                    if (!matchedRoutes.includes(segment.routeId)) {
                        matchedRoutes.push(segment.routeId);
                    }
                }
            });
        }

        // Check in journeyDetails.routeSegments
        if (fareBreakdown.journeyDetails?.routeSegments && Array.isArray(fareBreakdown.journeyDetails.routeSegments)) {
            fareBreakdown.journeyDetails.routeSegments.forEach(segment => {
                if (segment.routeId && routeIds.includes(segment.routeId)) {
                    if (!matchedRoutes.includes(segment.routeId)) {
                        matchedRoutes.push(segment.routeId);
                    }
                }
            });
        }

        // Build reason
        if (matchedRoutes.length > 0) {
            const segmentMatches = fareBreakdown.segmentFares?.some(s => routeIds.includes(s.routeId)) ? 'segmentFares' : '';
            const journeyMatches = fareBreakdown.journeyDetails?.routeSegments?.some(s => routeIds.includes(s.routeId)) ? 'routeSegments' : '';
            
            const sources = [segmentMatches, journeyMatches].filter(s => s).join(', ');
            reason = `Matched routes ${matchedRoutes.join(', ')} in ${sources}`;
        }

        return {
            isMatch: matchedRoutes.length > 0,
            matchedRoutes,
            reason: reason || 'No route match found'
        };
    }

    /**
     * Extract unique passenger IDs from matched tickets
     * @param {Array} tickets - Array of matched tickets
     * @returns {Array<string>} Unique passenger IDs
     */
    extractUniquePassengerIds(tickets) {
        const passengerIdSet = new Set();
        
        tickets.forEach(ticket => {
            if (ticket.passengerId) {
                passengerIdSet.add(ticket.passengerId);
            }
        });

        return Array.from(passengerIdSet);
    }

    /**
     * Get tickets by route IDs (including full ticket info)
     * @param {Array<string>} routeIds - Route IDs to search for
     * @param {Array<string>} statuses - Ticket statuses to filter
     * @returns {Promise<Object>} Result with tickets
     */
    async getTicketsByRoutes(routeIds, statuses = ['active', 'inactive']) {
        try {
            logger.debug('Getting tickets by routes', {
                routeIds,
                statuses,
                routeCount: routeIds.length
            });

            if (!routeIds || routeIds.length === 0) {
                return {
                    tickets: [],
                    totalCount: 0
                };
            }

            // Get all tickets with specified statuses
            const tickets = await this.getTicketsWithFareBreakdown(statuses);
            
            // Trace tickets that contain any of the specified routes
            const traceResult = this.traceTicketsByRoutes(tickets, routeIds);

            // Convert to gRPC format
            const grpcTickets = traceResult.matchedTickets.map(ticket => ({
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                status: ticket.status,
                ticketType: ticket.ticketType,
                fareBreakdown: this.convertFareBreakdownToGrpc(ticket.fareBreakdown),
                createdAt: ticket.createdAt?.toISOString() || '',
                updatedAt: ticket.updatedAt?.toISOString() || ''
            }));

            const result = {
                tickets: grpcTickets,
                totalCount: grpcTickets.length
            };

            logger.info('Get tickets by routes completed', {
                requestedRoutes: routeIds.length,
                totalTicketsScanned: tickets.length,
                matchedTickets: grpcTickets.length
            });

            return result;
        } catch (error) {
            logger.error('Failed to get tickets by routes', {
                routeIds,
                statuses,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Convert fareBreakdown to gRPC format
     * @param {Object} fareBreakdown - Original fareBreakdown
     * @returns {Object} gRPC formatted fareBreakdown
     */
    convertFareBreakdownToGrpc(fareBreakdown) {
        if (!fareBreakdown) return null;

        return {
            journeyDetails: fareBreakdown.journeyDetails ? {
                isDirectJourney: fareBreakdown.journeyDetails.isDirectJourney || false,
                totalRoutes: fareBreakdown.journeyDetails.totalRoutes || 0,
                totalStations: fareBreakdown.journeyDetails.totalStations || 0,
                routeSegments: (fareBreakdown.journeyDetails.routeSegments || []).map(segment => ({
                    routeId: segment.routeId || '',
                    routeName: segment.routeName || '',
                    originStationId: segment.originStationId || '',
                    destinationStationId: segment.destinationStationId || '',
                    stationCount: segment.stationCount || 0
                })),
                connectionPoints: fareBreakdown.journeyDetails.connectionPoints || []
            } : null,
            segmentFares: (fareBreakdown.segmentFares || []).map(segment => ({
                routeId: segment.routeId || '',
                routeName: segment.routeName || '',
                originStationId: segment.originStationId || '',
                destinationStationId: segment.destinationStationId || '',
                stationCount: segment.stationCount || 0,
                basePrice: segment.basePrice || 0,
                tripPrice: segment.tripPrice || 0,
                fareDetails: segment.fareDetails ? {
                    fareId: segment.fareDetails.fareId || '',
                    basePrice: segment.fareDetails.basePrice || '',
                    currency: segment.fareDetails.currency || 'VND'
                } : null
            })),
            passengerBreakdown: (fareBreakdown.passengerBreakdown || []).map(passenger => ({
                type: passenger.type || '',
                count: passenger.count || 0,
                pricePerPerson: passenger.pricePerPerson || 0,
                subtotal: passenger.subtotal || 0
            })),
            totalPassengers: fareBreakdown.totalPassengers || 0
        };
    }
}

module.exports = new PassengerIdTracingService();
