const passengerIdTracingService = require('../../../src/services/ticket/handlers/passengerIdTracing');
const { Ticket } = require('../../../src/models/index.model');

// Mock Sequelize models
jest.mock('../../../src/models/index.model', () => ({
    Ticket: {
        findAll: jest.fn(),
        findOne: jest.fn()
    }
}));

describe('PassengerIdTracingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkTicketContainsRoutes', () => {
        const mockFareBreakdown = {
            journeyDetails: {
                routeSegments: [
                    { routeId: 'route-1', routeName: 'Route 1' },
                    { routeId: 'route-2', routeName: 'Route 2' }
                ]
            },
            segmentFares: [
                { routeId: 'route-1', routeName: 'Route 1' },
                { routeId: 'route-3', routeName: 'Route 3' }
            ]
        };

        it('should return true when routeId found in segmentFares', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: mockFareBreakdown },
                ['route-1']
            );
            expect(result.isMatch).toBe(true);
            expect(result.matchedRoutes).toContain('route-1');
        });

        it('should return true when routeId found in routeSegments', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: mockFareBreakdown },
                ['route-2']
            );
            expect(result.isMatch).toBe(true);
            expect(result.matchedRoutes).toContain('route-2');
        });

        it('should return true when multiple routeIds found', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: mockFareBreakdown },
                ['route-1', 'route-2']
            );
            expect(result.isMatch).toBe(true);
            expect(result.matchedRoutes).toContain('route-1');
            expect(result.matchedRoutes).toContain('route-2');
        });

        it('should return false when routeId not found', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: mockFareBreakdown },
                ['route-999']
            );
            expect(result.isMatch).toBe(false);
            expect(result.matchedRoutes).toEqual([]);
        });

        it('should return false when fareBreakdown is null', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: null },
                ['route-1']
            );
            expect(result.isMatch).toBe(false);
            expect(result.matchedRoutes).toEqual([]);
        });

        it('should return false when fareBreakdown is empty', () => {
            const result = passengerIdTracingService.checkTicketContainsRoutes(
                { fareBreakdown: {} },
                ['route-1']
            );
            expect(result.isMatch).toBe(false);
            expect(result.matchedRoutes).toEqual([]);
        });
    });

    describe('extractUniquePassengerIds', () => {
        it('should extract unique passenger IDs from tickets', () => {
            const tickets = [
                { passengerId: 'passenger-1' },
                { passengerId: 'passenger-2' },
                { passengerId: 'passenger-1' }, // duplicate
                { passengerId: 'passenger-3' }
            ];

            const result = passengerIdTracingService.extractUniquePassengerIds(tickets);
            expect(result).toEqual(['passenger-1', 'passenger-2', 'passenger-3']);
        });

        it('should return empty array for empty tickets', () => {
            const result = passengerIdTracingService.extractUniquePassengerIds([]);
            expect(result).toEqual([]);
        });

        it('should handle tickets with null passengerId', () => {
            const tickets = [
                { passengerId: 'passenger-1' },
                { passengerId: null },
                { passengerId: 'passenger-2' }
            ];

            const result = passengerIdTracingService.extractUniquePassengerIds(tickets);
            expect(result).toEqual(['passenger-1', 'passenger-2']);
        });
    });

    describe('getTicketsWithFareBreakdown', () => {
        it('should query tickets with fareBreakdown and specified statuses', async () => {
            const mockTickets = [
                { ticketId: 'ticket-1', passengerId: 'passenger-1', fareBreakdown: {} },
                { ticketId: 'ticket-2', passengerId: 'passenger-2', fareBreakdown: {} }
            ];

            Ticket.findAll.mockResolvedValue(mockTickets);

            const result = await passengerIdTracingService.getTicketsWithFareBreakdown(['active', 'inactive']);

            expect(Ticket.findAll).toHaveBeenCalledWith({
                where: {
                    fareBreakdown: { [require('sequelize').Op.ne]: null },
                    isActive: true,
                    status: { [require('sequelize').Op.in]: ['active', 'inactive'] }
                },
                attributes: ['ticketId', 'passengerId', 'status', 'ticketType', 'fareBreakdown', 'createdAt', 'updatedAt']
            });
            expect(result).toEqual(mockTickets);
        });

        it('should handle database errors gracefully', async () => {
            Ticket.findAll.mockRejectedValue(new Error('Database error'));

            await expect(passengerIdTracingService.getTicketsWithFareBreakdown(['active']))
                .rejects.toThrow('Database error');
        });
    });

    describe('traceTicketsByRoutes', () => {
        const mockTickets = [
            {
                ticketId: 'ticket-1',
                passengerId: 'passenger-1',
                fareBreakdown: {
                    segmentFares: [{ routeId: 'route-1' }]
                }
            },
            {
                ticketId: 'ticket-2',
                passengerId: 'passenger-2',
                fareBreakdown: {
                    journeyDetails: {
                        routeSegments: [{ routeId: 'route-2' }]
                    }
                }
            },
            {
                ticketId: 'ticket-3',
                passengerId: 'passenger-3',
                fareBreakdown: {
                    segmentFares: [{ routeId: 'route-3' }]
                }
            }
        ];

        it('should return tickets containing specified routes', () => {
            const result = passengerIdTracingService.traceTicketsByRoutes(mockTickets, ['route-1', 'route-2']);
            
            expect(result.matchedTickets).toHaveLength(2);
            expect(result.matchedTickets[0].ticketId).toBe('ticket-1');
            expect(result.matchedTickets[1].ticketId).toBe('ticket-2');
            expect(result.traces).toHaveLength(2);
        });

        it('should return empty array when no routes match', () => {
            const result = passengerIdTracingService.traceTicketsByRoutes(mockTickets, ['route-999']);
            expect(result.matchedTickets).toEqual([]);
            expect(result.traces).toEqual([]);
        });

        it('should handle empty tickets array', () => {
            const result = passengerIdTracingService.traceTicketsByRoutes([], ['route-1']);
            expect(result.matchedTickets).toEqual([]);
            expect(result.traces).toEqual([]);
        });
    });

    describe('getPassengerIdsByRoutes', () => {
        it('should return unique passenger IDs for matching routes', async () => {
            const mockTickets = [
                {
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-1' }]
                    }
                },
                {
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    fareBreakdown: {
                        journeyDetails: {
                            routeSegments: [{ routeId: 'route-1' }]
                        }
                    }
                },
                {
                    ticketId: 'ticket-3',
                    passengerId: 'passenger-1', // duplicate
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-2' }]
                    }
                }
            ];

            Ticket.findAll.mockResolvedValue(mockTickets);

            const result = await passengerIdTracingService.getPassengerIdsByRoutes(['route-1', 'route-2'], ['active']);

            expect(result.passengerIds).toEqual(['passenger-1', 'passenger-2']);
            expect(result.totalCount).toBe(2);
            expect(result.traces).toHaveLength(3);
        });

        it('should return empty result when no tickets found', async () => {
            Ticket.findAll.mockResolvedValue([]);

            const result = await passengerIdTracingService.getPassengerIdsByRoutes(['route-1'], ['active']);

            expect(result.passengerIds).toEqual([]);
            expect(result.totalCount).toBe(0);
            expect(result.traces).toEqual([]);
        });
    });

    describe('getTicketsByRoutes', () => {
        it('should return tickets in gRPC format', async () => {
            const mockTickets = [
                {
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    status: 'active',
                    ticketType: 'short-term',
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-1' }]
                    },
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                }
            ];

            Ticket.findAll.mockResolvedValue(mockTickets);

            const result = await passengerIdTracingService.getTicketsByRoutes(['route-1'], ['active']);

            expect(result.tickets).toHaveLength(1);
            expect(result.tickets[0]).toMatchObject({
                ticketId: 'ticket-1',
                passengerId: 'passenger-1',
                status: 'active',
                ticketType: 'short-term'
            });
            expect(result.totalCount).toBe(1);
        });
    });

    describe('convertFareBreakdownToGrpc', () => {
        it('should convert fareBreakdown to gRPC format', () => {
            const fareBreakdown = {
                journeyDetails: {
                    isDirectJourney: false,
                    totalRoutes: 2,
                    totalStations: 6,
                    routeSegments: [
                        {
                            routeId: 'route-1',
                            routeName: 'Route 1',
                            originStationId: 'station-1',
                            destinationStationId: 'station-2',
                            stationCount: 4
                        }
                    ],
                    connectionPoints: ['station-2']
                },
                segmentFares: [
                    {
                        routeId: 'route-1',
                        routeName: 'Route 1',
                        basePrice: 10000,
                        tripPrice: 15000,
                        fareDetails: {
                            fareId: 'fare-1',
                            basePrice: '10000.00',
                            currency: 'VND'
                        }
                    }
                ],
                passengerBreakdown: [
                    {
                        type: 'adult',
                        count: 1,
                        pricePerPerson: 30000,
                        subtotal: 30000
                    }
                ],
                totalPassengers: 1
            };

            const result = passengerIdTracingService.convertFareBreakdownToGrpc(fareBreakdown);

            expect(result).toMatchObject({
                journeyDetails: {
                    isDirectJourney: false,
                    totalRoutes: 2,
                    totalStations: 6,
                    routeSegments: [
                        {
                            routeId: 'route-1',
                            routeName: 'Route 1',
                            originStationId: 'station-1',
                            destinationStationId: 'station-2',
                            stationCount: 4
                        }
                    ],
                    connectionPoints: ['station-2']
                },
                segmentFares: [
                    {
                        routeId: 'route-1',
                        routeName: 'Route 1',
                        basePrice: 10000,
                        tripPrice: 15000,
                        fareDetails: {
                            fareId: 'fare-1',
                            basePrice: '10000.00',
                            currency: 'VND'
                        }
                    }
                ],
                passengerBreakdown: [
                    {
                        type: 'adult',
                        count: 1,
                        pricePerPerson: 30000,
                        subtotal: 30000
                    }
                ],
                totalPassengers: 1
            });
        });

        it('should handle null fareBreakdown', () => {
            const result = passengerIdTracingService.convertFareBreakdownToGrpc(null);
            expect(result).toBeNull();
        });

        it('should handle empty fareBreakdown', () => {
            const result = passengerIdTracingService.convertFareBreakdownToGrpc({});
            expect(result).toMatchObject({
                journeyDetails: null,
                segmentFares: [],
                passengerBreakdown: [],
                totalPassengers: 0
            });
        });
    });
});
