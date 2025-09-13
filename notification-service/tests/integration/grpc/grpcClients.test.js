const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const ticketGrpcClient = require('../../../src/grpc/ticket.client');
const userGrpcClient = require('../../../src/grpc/user.client');

// Load protos
const ticketProtoPath = path.join(__dirname, '../../../src/proto/ticket.proto');
const userProtoPath = path.join(__dirname, '../../../src/proto/user.proto');

const ticketPackageDefinition = protoLoader.loadSync(ticketProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const ticketProto = grpc.loadPackageDefinition(ticketPackageDefinition).ticket;

const userPackageDefinition = protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user;

describe('gRPC Clients Integration Tests', () => {
    let ticketClient;
    let userClient;

    beforeAll(async () => {
        // Initialize clients
        await ticketGrpcClient.initialize();
        await userGrpcClient.initialize();
        
        ticketClient = ticketGrpcClient;
        userClient = userGrpcClient;
    }, 10000);

    afterAll(async () => {
        if (ticketClient) {
            ticketClient.close();
        }
        if (userClient) {
            userClient.close();
        }
    });

    describe('Ticket gRPC Client', () => {
        describe('getTicketsByRoutes', () => {
            it('should call ticket service and return tickets', async () => {
                const routeIds = ['route-1', 'route-2'];
                const statuses = ['active', 'inactive'];

                const result = await ticketClient.getTicketsByRoutes(routeIds, statuses);

                expect(result).toBeDefined();
                expect(result.tickets).toBeDefined();
                expect(Array.isArray(result.tickets)).toBe(true);
                expect(result.totalCount).toBeDefined();
                expect(typeof result.totalCount).toBe('number');
            });

            it('should handle empty routeIds', async () => {
                const result = await ticketClient.getTicketsByRoutes([], ['active']);

                expect(result).toBeDefined();
                expect(result.tickets).toEqual([]);
                expect(result.totalCount).toBe(0);
            });

            it('should handle connection errors gracefully', async () => {
                // Close client to simulate connection error
                ticketClient.close();
                
                try {
                    await ticketClient.getTicketsByRoutes(['route-1'], ['active']);
                } catch (error) {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('ticketContainsRoutes', () => {
            it('should return true when routeId found in segmentFares', () => {
                const ticket = {
                    fareBreakdown: {
                        segmentFares: [
                            { routeId: 'route-1', routeName: 'Route 1' },
                            { routeId: 'route-2', routeName: 'Route 2' }
                        ]
                    }
                };

                const result = ticketClient.ticketContainsRoutes(ticket.fareBreakdown, ['route-1']);
                expect(result).toBe(true);
            });

            it('should return true when routeId found in routeSegments', () => {
                const ticket = {
                    fareBreakdown: {
                        journeyDetails: {
                            routeSegments: [
                                { routeId: 'route-1', routeName: 'Route 1' },
                                { routeId: 'route-2', routeName: 'Route 2' }
                            ]
                        }
                    }
                };

                const result = ticketClient.ticketContainsRoutes(ticket.fareBreakdown, ['route-2']);
                expect(result).toBe(true);
            });

            it('should return false when routeId not found', () => {
                const ticket = {
                    fareBreakdown: {
                        segmentFares: [{ routeId: 'route-1', routeName: 'Route 1' }]
                    }
                };

                const result = ticketClient.ticketContainsRoutes(ticket.fareBreakdown, ['route-999']);
                expect(result).toBe(false);
            });

            it('should handle null fareBreakdown', () => {
                const result = ticketClient.ticketContainsRoutes(null, ['route-1']);
                expect(result).toBe(false);
            });
        });

        describe('extractUniquePassengerIds', () => {
            it('should extract unique passenger IDs', () => {
                const tickets = [
                    { passengerId: 'passenger-1' },
                    { passengerId: 'passenger-2' },
                    { passengerId: 'passenger-1' }, // duplicate
                    { passengerId: 'passenger-3' }
                ];

                const result = ticketClient.extractUniquePassengerIds(tickets);
                expect(result).toEqual(['passenger-1', 'passenger-2', 'passenger-3']);
            });

            it('should handle empty tickets array', () => {
                const result = ticketClient.extractUniquePassengerIds([]);
                expect(result).toEqual([]);
            });

            it('should filter out null passengerIds', () => {
                const tickets = [
                    { passengerId: 'passenger-1' },
                    { passengerId: null },
                    { passengerId: 'passenger-2' }
                ];

                const result = ticketClient.extractUniquePassengerIds(tickets);
                expect(result).toEqual(['passenger-1', 'passenger-2']);
            });
        });
    });

    describe('User gRPC Client', () => {
        describe('getPassengerPhoneNumbers', () => {
            it('should call user service and return contacts', async () => {
                const passengerIds = ['passenger-1', 'passenger-2'];

                const result = await userClient.getPassengerPhoneNumbers(passengerIds);

                expect(result).toBeDefined();
                expect(result.contacts).toBeDefined();
                expect(Array.isArray(result.contacts)).toBe(true);
            });

            it('should handle empty passengerIds', async () => {
                const result = await userClient.getPassengerPhoneNumbers([]);

                expect(result).toBeDefined();
                expect(result.contacts).toEqual([]);
            });

            it('should handle connection errors gracefully', async () => {
                // Close client to simulate connection error
                userClient.close();
                
                try {
                    await userClient.getPassengerPhoneNumbers(['passenger-1']);
                } catch (error) {
                    expect(error).toBeDefined();
                }
            });
        });

        describe('filterSmsEnabledContacts', () => {
            it('should filter contacts with SMS enabled', () => {
                const contacts = [
                    {
                        passengerId: 'passenger-1',
                        phoneNumber: '+84901234567',
                        smsEnabled: true,
                        name: 'John Doe'
                    },
                    {
                        passengerId: 'passenger-2',
                        phoneNumber: '+84907654321',
                        smsEnabled: false,
                        name: 'Jane Smith'
                    },
                    {
                        passengerId: 'passenger-3',
                        phoneNumber: '+84905555555',
                        smsEnabled: true,
                        name: 'Bob Wilson'
                    }
                ];

                const result = userClient.filterSmsEnabledContacts(contacts);

                expect(result).toHaveLength(2);
                expect(result[0].passengerId).toBe('passenger-1');
                expect(result[1].passengerId).toBe('passenger-3');
            });

            it('should handle empty contacts array', () => {
                const result = userClient.filterSmsEnabledContacts([]);
                expect(result).toEqual([]);
            });

            it('should handle contacts without smsEnabled field', () => {
                const contacts = [
                    {
                        passengerId: 'passenger-1',
                        phoneNumber: '+84901234567',
                        name: 'John Doe'
                        // smsEnabled field missing
                    }
                ];

                const result = userClient.filterSmsEnabledContacts(contacts);
                expect(result).toEqual([]);
            });
        });

        describe('convertContactsToUsers', () => {
            it('should convert contacts to user objects', () => {
                const contacts = [
                    {
                        passengerId: 'passenger-1',
                        phoneNumber: '+84901234567',
                        smsEnabled: true,
                        name: 'John Doe'
                    },
                    {
                        passengerId: 'passenger-2',
                        phoneNumber: '+84907654321',
                        smsEnabled: true,
                        name: 'Jane Smith'
                    }
                ];

                const result = userClient.convertContactsToUsers(contacts);

                expect(result).toHaveLength(2);
                expect(result[0]).toMatchObject({
                    passengerId: 'passenger-1',
                    phoneNumber: '+84901234567',
                    name: 'John Doe'
                });
                expect(result[1]).toMatchObject({
                    passengerId: 'passenger-2',
                    phoneNumber: '+84907654321',
                    name: 'Jane Smith'
                });
            });

            it('should handle empty contacts array', () => {
                const result = userClient.convertContactsToUsers([]);
                expect(result).toEqual([]);
            });

            it('should handle contacts with missing fields', () => {
                const contacts = [
                    {
                        passengerId: 'passenger-1',
                        phoneNumber: '+84901234567',
                        smsEnabled: true
                        // name field missing
                    }
                ];

                const result = userClient.convertContactsToUsers(contacts);

                expect(result).toHaveLength(1);
                expect(result[0]).toMatchObject({
                    passengerId: 'passenger-1',
                    phoneNumber: '+84901234567',
                    name: 'Unknown'
                });
            });
        });
    });

    describe('End-to-End Integration', () => {
        it('should complete full flow from routeIds to users', async () => {
            const routeIds = ['route-1', 'route-2'];
            const statuses = ['active', 'inactive'];

            // Step 1: Get tickets by routes
            const ticketsResponse = await ticketClient.getTicketsByRoutes(routeIds, statuses);
            expect(ticketsResponse).toBeDefined();

            // Step 2: Filter tickets that contain the routes
            const relevantTickets = ticketsResponse.tickets.filter(ticket => {
                if (!ticket.fareBreakdown) return false;
                return ticketClient.ticketContainsRoutes(ticket.fareBreakdown, routeIds);
            });

            // Step 3: Extract unique passenger IDs
            const uniquePassengerIds = ticketClient.extractUniquePassengerIds(relevantTickets);

            if (uniquePassengerIds.length > 0) {
                // Step 4: Get passenger phone numbers
                const contactsResponse = await userClient.getPassengerPhoneNumbers(uniquePassengerIds);
                expect(contactsResponse).toBeDefined();

                // Step 5: Filter SMS-enabled contacts
                const smsEnabledContacts = userClient.filterSmsEnabledContacts(contactsResponse.contacts);

                // Step 6: Convert to user objects
                const users = userClient.convertContactsToUsers(smsEnabledContacts);

                expect(Array.isArray(users)).toBe(true);
                // Each user should have required fields
                users.forEach(user => {
                    expect(user).toHaveProperty('passengerId');
                    expect(user).toHaveProperty('phoneNumber');
                    expect(user).toHaveProperty('name');
                });
            }
        });
    });
});
