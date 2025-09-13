const TransportEventConsumer = require('../../../src/events/transport.consumer');
const ticketGrpcClient = require('../../../src/grpc/ticket.client');
const userGrpcClient = require('../../../src/grpc/user.client');
const templateService = require('../../../src/services/template.service');

// Mock dependencies
jest.mock('../../../src/grpc/ticket.client');
jest.mock('../../../src/grpc/user.client');
jest.mock('../../../src/services/template.service');

describe('TransportEventConsumer', () => {
    let consumer;
    let mockNotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNotificationService = {
            sendEmail: jest.fn().mockResolvedValue({ success: true, id: 'email-123', status: 'sent' })
        };
        consumer = new TransportEventConsumer(mockNotificationService);
    });

    describe('handleStationDeactivation', () => {
        const mockEventData = {
            data: {
                stationId: 'station-1',
                stationName: 'Ben Thanh Station',
                location: 'District 1, HCMC',
                reason: 'Maintenance',
                affectedRoutes: [
                    {
                        routeId: 'route-1',
                        routeName: 'Route 1',
                        sequence: 1,
                        originId: 'origin-1',
                        destinationId: 'dest-1'
                    },
                    {
                        routeId: 'route-2',
                        routeName: 'Route 2',
                        sequence: 2,
                        originId: 'origin-2',
                        destinationId: 'dest-2'
                    }
                ],
                timestamp: '2024-01-01T10:00:00Z'
            }
        };

        it('should process station deactivation event successfully', async () => {
            // Mock gRPC responses
            const mockTicketsResponse = {
                tickets: [
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
                        status: 'inactive',
                        fareBreakdown: {
                            journeyDetails: {
                                routeSegments: [{ routeId: 'route-2' }]
                            }
                        }
                    }
                ]
            };

            const mockPassengersResponse = {
                passengers: [
                    {
                        passengerId: 'passenger-1',
                        email: 'john@example.com',
                        emailNotifications: true,
                        name: 'John Doe'
                    },
                    {
                        passengerId: 'passenger-2',
                        email: 'jane@example.com',
                        emailNotifications: true,
                        name: 'Jane Smith'
                    }
                ]
            };

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockTicketsResponse);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-1', 'passenger-2']);
            userGrpcClient.getPassengerEmails.mockResolvedValue(mockPassengersResponse);
            userGrpcClient.filterEmailEnabledPassengers.mockReturnValue(mockPassengersResponse.passengers);
            userGrpcClient.convertPassengersToUsers.mockReturnValue([
                { userId: 'passenger-1', email: 'john@example.com', name: 'John Doe' },
                { userId: 'passenger-2', email: 'jane@example.com', name: 'Jane Smith' }
            ]);

            consumer.templateService.render.mockResolvedValue('🚨 THÔNG BÁO TẠM NGỪNG GA\nGa: Ben Thanh Station');

            await consumer.handleStationDeactivation(mockEventData);
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalledWith(
                ['route-1', 'route-2'],
                ['active', 'inactive']
            );
            expect(userGrpcClient.getPassengerEmails).toHaveBeenCalledWith(['passenger-1', 'passenger-2']);
            expect(mockNotificationService.sendEmail).toHaveBeenCalled();
        });

        it('should handle empty affected routes gracefully', async () => {
            const eventDataWithNoRoutes = {
                data: {
                    ...mockEventData.data,
                    affectedRoutes: []
                }
            };

            await consumer.handleStationDeactivation(eventDataWithNoRoutes);
            expect(ticketGrpcClient.getTicketsByRoutes).not.toHaveBeenCalled();
            expect(userGrpcClient.getPassengerEmails).not.toHaveBeenCalled();
        });

        it('should handle gRPC errors gracefully', async () => {
            ticketGrpcClient.getTicketsByRoutes.mockRejectedValue(new Error('gRPC connection failed'));

            await consumer.handleStationDeactivation(mockEventData);
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalled();
        });

        it('should handle template rendering errors with fallback', async () => {
            const mockTicketsResponse = {
                tickets: [
                    {
                        ticketId: 'ticket-1',
                        passengerId: 'passenger-1',
                        status: 'active',
                        fareBreakdown: {
                            segmentFares: [{ routeId: 'route-1' }]
                        }
                    }
                ]
            };

            const mockPassengersResponse = {
                passengers: [
                    {
                        passengerId: 'passenger-1',
                        email: 'john@example.com',
                        emailNotifications: true,
                        name: 'John Doe'
                    }
                ]
            };

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockTicketsResponse);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-1']);
            userGrpcClient.getPassengerEmails.mockResolvedValue(mockPassengersResponse);
            userGrpcClient.filterEmailEnabledPassengers.mockReturnValue(mockPassengersResponse.passengers);
            userGrpcClient.convertPassengersToUsers.mockReturnValue([
                { userId: 'passenger-1', email: 'john@example.com', name: 'John Doe' }
            ]);

            await consumer.handleStationDeactivation(mockEventData);
            expect(mockNotificationService.sendEmail).toHaveBeenCalled();
        });
    });

    describe('getUsersToNotifyForStationDeactivation', () => {
        const mockAffectedRoutes = [
            { routeId: 'route-1', routeName: 'Route 1' },
            { routeId: 'route-2', routeName: 'Route 2' }
        ];

        it('should return users with email-enabled contacts', async () => {
            const mockTicketsResponse = {
                tickets: [
                    {
                        ticketId: 'ticket-1',
                        passengerId: 'passenger-1',
                        fareBreakdown: {
                            segmentFares: [{ routeId: 'route-1' }]
                        }
                    }
                ]
            };

            const mockPassengersResponse = {
                passengers: [
                    {
                        passengerId: 'passenger-1',
                        email: 'john@example.com',
                        emailNotifications: true,
                        name: 'John Doe'
                    }
                ]
            };

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockTicketsResponse);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-1']);
            userGrpcClient.getPassengerEmails.mockResolvedValue(mockPassengersResponse);
            userGrpcClient.filterEmailEnabledPassengers.mockReturnValue(mockPassengersResponse.passengers);
            userGrpcClient.convertPassengersToUsers.mockReturnValue([
                { userId: 'passenger-1', email: 'john@example.com', name: 'John Doe' }
            ]);

            const result = await consumer.getUsersToNotifyForStationDeactivation(
                'station-1',
                mockAffectedRoutes
            );

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                userId: 'passenger-1',
                email: 'john@example.com',
                name: 'John Doe'
            });
        });

        it('should filter out email-disabled contacts', async () => {
            const mockTicketsResponse = {
                tickets: [
                    {
                        ticketId: 'ticket-1',
                        passengerId: 'passenger-1',
                        fareBreakdown: {
                            segmentFares: [{ routeId: 'route-1' }]
                        }
                    }
                ]
            };

            const mockPassengersResponse = {
                passengers: [
                    {
                        passengerId: 'passenger-1',
                        email: 'john@example.com',
                        emailNotifications: false,
                        name: 'John Doe'
                    }
                ]
            };

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockTicketsResponse);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-1']);
            userGrpcClient.getPassengerEmails.mockResolvedValue(mockPassengersResponse);
            userGrpcClient.filterEmailEnabledPassengers.mockReturnValue([]);
            userGrpcClient.convertPassengersToUsers.mockReturnValue([]);

            const result = await consumer.getUsersToNotifyForStationDeactivation(
                'station-1',
                mockAffectedRoutes
            );

            expect(result).toHaveLength(0);
        });

        it('should return empty array when no tickets found', async () => {
            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({ tickets: [] });

            const result = await consumer.getUsersToNotifyForStationDeactivation(
                'station-1',
                mockAffectedRoutes
            );

            expect(result).toEqual([]);
        });

        it('should handle gRPC errors and return empty array', async () => {
            ticketGrpcClient.getTicketsByRoutes.mockRejectedValue(new Error('gRPC error'));

            const result = await consumer.getUsersToNotifyForStationDeactivation(
                'station-1',
                mockAffectedRoutes
            );

            expect(result).toEqual([]);
        });
    });

    describe('createStationDeactivationEmail', () => {
        const mockEventData = {
            stationId: 'station-1',
            stationName: 'Ben Thanh Station',
            location: 'District 1, HCMC',
            reason: 'Maintenance',
            affectedRoutes: [
                { routeId: 'route-1', routeName: 'Route 1' }
            ]
        };

        const mockUser = {
            userId: 'passenger-1',
            email: 'john@example.com',
            name: 'John Doe'
        };

        it('should create email with template content', async () => {
            const result = await consumer.createStationDeactivationEmail(mockUser, mockEventData);

            expect(result).toMatchObject({
                success: true,
                id: 'email-123',
                status: 'sent'
            });

            expect(mockNotificationService.sendEmail).toHaveBeenCalledWith({
                to: 'john@example.com',
                subject: '🚨 Thông báo tạm ngừng hoạt động ga Ben Thanh Station',
                template: 'transport_template/station_deactivation',
                variables: expect.objectContaining({
                    stationName: 'Ben Thanh Station',
                    location: 'District 1, HCMC',
                    reason: 'Maintenance',
                    affectedRoutes: expect.any(Array)
                }),
                userId: 'passenger-1',
                category: 'station_alert'
            });
        });

        it('should handle email sending errors', async () => {
            mockNotificationService.sendEmail.mockRejectedValue(new Error('Email sending failed'));

            await expect(consumer.createStationDeactivationEmail(mockUser, mockEventData))
                .rejects.toThrow('Email sending failed');
        });
    });

});
