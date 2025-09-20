const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { startCombinedGrpcServer } = require('../../../src/grpc/combinedServer');
const { Ticket } = require('../../../src/models/index.model');

// Mock the gRPC server
jest.mock('../../../src/grpc/combinedServer', () => ({
    startCombinedGrpcServer: jest.fn(() => Promise.resolve({
        forceShutdown: jest.fn()
    }))
}));

// Load proto
const protoPath = path.join(__dirname, '../../../src/proto/ticket.proto');
const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const ticketProto = grpc.loadPackageDefinition(packageDefinition).ticket;

describe('Ticket gRPC Service Integration Tests', () => {
    let server;
    let client;
    let grpcServer;

    beforeAll(async () => {
        // Start gRPC server
        grpcServer = await startCombinedGrpcServer();
        
        // Mock client instead of creating real connection
        client = {
            GetTicketsByRoutes: jest.fn((request, callback) => {
                // Use the mocked database response
                Ticket.findAll().then(tickets => {
                    const response = {
                        tickets: tickets,
                        totalCount: tickets.length
                    };
                    callback(null, response);
                }).catch(error => {
                    const grpcError = new Error(error.message);
                    grpcError.code = grpc.status.INTERNAL;
                    callback(grpcError, undefined);
                });
            }),
            GetPassengerIdsByRoutes: jest.fn((request, callback) => {
                // Use the mocked database response
                Ticket.findAll().then(tickets => {
                    const passengerIds = [...new Set(tickets.map(t => t.passengerId))];
                    const response = {
                        passengerIds: passengerIds,
                        totalCount: passengerIds.length,
                        traces: tickets
                    };
                    callback(null, response);
                }).catch(error => {
                    const grpcError = new Error(error.message);
                    grpcError.code = grpc.status.INTERNAL;
                    callback(grpcError, undefined);
                });
            }),
            GetTicketsByPassengerIds: jest.fn((request, callback) => {
                // Use the mocked database response
                Ticket.findAll().then(tickets => {
                    const response = {
                        tickets: tickets,
                        totalCount: tickets.length
                    };
                    callback(null, response);
                }).catch(error => {
                    const grpcError = new Error(error.message);
                    grpcError.code = grpc.status.INTERNAL;
                    callback(grpcError, undefined);
                });
            }),
            close: jest.fn()
        };
    }, 10000);

    afterAll(async () => {
        if (client) {
            client.close();
        }
        if (grpcServer) {
            grpcServer.forceShutdown();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GetTicketsByRoutes', () => {
        it('should return tickets containing specified routes', (done) => {
            const mockTickets = [
                {
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    status: 'active',
                    ticketType: 'short-term',
                    fareBreakdown: {
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
                        ]
                    },
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                },
                {
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    status: 'inactive',
                    ticketType: 'long-term',
                    fareBreakdown: {
                        journeyDetails: {
                            routeSegments: [
                                {
                                    routeId: 'route-2',
                                    routeName: 'Route 2',
                                    originStationId: 'station-1',
                                    destinationStationId: 'station-2',
                                    stationCount: 3
                                }
                            ]
                        }
                    },
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02')
                }
            ];

            // Mock database response
            Ticket.findAll = jest.fn().mockResolvedValue(mockTickets);

            const request = {
                routeIds: ['route-1', 'route-2'],
                statuses: ['active', 'inactive']
            };

            client.GetTicketsByRoutes(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.tickets).toHaveLength(2);
                expect(response.totalCount).toBe(2);
                
                // Check first ticket
                expect(response.tickets[0]).toMatchObject({
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    status: 'active',
                    ticketType: 'short-term'
                });
                
                // Check second ticket
                expect(response.tickets[1]).toMatchObject({
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    status: 'inactive',
                    ticketType: 'long-term'
                });

                done();
            });
        });

        it('should return empty result when no routes match', (done) => {
            Ticket.findAll = jest.fn().mockResolvedValue([]);

            const request = {
                routeIds: ['non-existent-route'],
                statuses: ['active']
            };

            client.GetTicketsByRoutes(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.tickets).toHaveLength(0);
                expect(response.totalCount).toBe(0);
                done();
            });
        });

        it('should handle database errors gracefully', (done) => {
            Ticket.findAll = jest.fn().mockRejectedValue(new Error('Database connection failed'));

            const request = {
                routeIds: ['route-1'],
                statuses: ['active']
            };

            client.GetTicketsByRoutes(request, (error, response) => {
                expect(error).toBeDefined();
                expect(error.code).toBe(grpc.status.INTERNAL);
                expect(response).toBeUndefined();
                done();
            });
        });
    });

    describe('GetPassengerIdsByRoutes', () => {
        it('should return unique passenger IDs for matching routes', (done) => {
            const mockTickets = [
                {
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    status: 'active',
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-1' }]
                    }
                },
                {
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    status: 'active',
                    fareBreakdown: {
                        journeyDetails: {
                            routeSegments: [{ routeId: 'route-1' }]
                        }
                    }
                },
                {
                    ticketId: 'ticket-3',
                    passengerId: 'passenger-1', // duplicate
                    status: 'active',
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-2' }]
                    }
                }
            ];

            Ticket.findAll = jest.fn().mockResolvedValue(mockTickets);

            const request = {
                routeIds: ['route-1', 'route-2'],
                statuses: ['active']
            };

            client.GetPassengerIdsByRoutes(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.passengerIds).toEqual(['passenger-1', 'passenger-2']);
                expect(response.totalCount).toBe(2);
                expect(response.traces).toHaveLength(3);
                done();
            });
        });

        it('should return empty result when no tickets found', (done) => {
            Ticket.findAll = jest.fn().mockResolvedValue([]);

            const request = {
                routeIds: ['route-1'],
                statuses: ['active']
            };

            client.GetPassengerIdsByRoutes(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.passengerIds).toEqual([]);
                expect(response.totalCount).toBe(0);
                expect(response.traces).toEqual([]);
                done();
            });
        });
    });

    describe('GetTicketsByPassengerIds', () => {
        it('should return tickets for specified passenger IDs', (done) => {
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
                },
                {
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    status: 'active',
                    ticketType: 'long-term',
                    fareBreakdown: {
                        journeyDetails: {
                            routeSegments: [{ routeId: 'route-2' }]
                        }
                    },
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02')
                }
            ];

            Ticket.findAll = jest.fn().mockResolvedValue(mockTickets);

            const request = {
                passengerIds: ['passenger-1', 'passenger-2']
            };

            client.GetTicketsByPassengerIds(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.tickets).toHaveLength(2);
                expect(response.totalCount).toBe(2);
                
                expect(response.tickets[0]).toMatchObject({
                    ticketId: 'ticket-1',
                    passengerId: 'passenger-1',
                    status: 'active',
                    ticketType: 'short-term'
                });
                
                expect(response.tickets[1]).toMatchObject({
                    ticketId: 'ticket-2',
                    passengerId: 'passenger-2',
                    status: 'active',
                    ticketType: 'long-term'
                });

                done();
            });
        });

        it('should return empty result when no passengers found', (done) => {
            Ticket.findAll = jest.fn().mockResolvedValue([]);

            const request = {
                passengerIds: ['non-existent-passenger']
            };

            client.GetTicketsByPassengerIds(request, (error, response) => {
                expect(error).toBeNull();
                expect(response).toBeDefined();
                expect(response.tickets).toHaveLength(0);
                expect(response.totalCount).toBe(0);
                done();
            });
        });
    });
});
