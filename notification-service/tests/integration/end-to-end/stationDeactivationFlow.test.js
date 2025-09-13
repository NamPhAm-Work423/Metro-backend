const TransportEventConsumer = require('../../../src/events/transport.consumer');
const ticketGrpcClient = require('../../../src/grpc/ticket.client');
const userGrpcClient = require('../../../src/grpc/user.client');
const templateService = require('../../../src/services/template.service');
const { 
    mockStationDeactivationEvent,
    mockGrpcResponses,
    testScenarios,
    mockRenderedSms
} = require('../../fixtures/testData');

// Mock external dependencies
jest.mock('../../../src/grpc/ticket.client');
jest.mock('../../../src/grpc/user.client');
jest.mock('../../../src/services/template.service');

describe('Station Deactivation End-to-End Flow', () => {
    let consumer;
    let mockNotificationService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNotificationService = {
            sendSms: jest.fn().mockResolvedValue({ success: true, id: 'sms-123', status: 'sent' })
        };
        consumer = new TransportEventConsumer(mockNotificationService);
    });

    describe('Complete Flow: RouteIds → Tickets → Passengers → SMS', () => {
        it('should complete full flow for normal scenario', async () => {
            const scenario = testScenarios.normalFlow;
            const eventData = mockStationDeactivationEvent;

            // Mock gRPC responses
            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockGrpcResponses.ticketsByRoutes);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(scenario.expectedPassengerIds);
            
            userGrpcClient.getPassengerPhoneNumbers.mockResolvedValue(mockGrpcResponses.passengerContacts);
            userGrpcClient.filterSmsEnabledContacts.mockReturnValue(
                mockGrpcResponses.passengerContacts.contacts.filter(c => c.smsEnabled)
            );
            userGrpcClient.convertContactsToUsers.mockReturnValue([
                { passengerId: 'passenger-001', phoneNumber: '+84901234567', name: 'Nguyễn Văn An' },
                { passengerId: 'passenger-002', phoneNumber: '+84907654321', name: 'Trần Thị Bình' }
            ]);

            consumer.templateService.render.mockResolvedValue(mockRenderedSms);

            // Execute the flow
            await consumer.handleStationDeactivation(eventData);

            // Verify the complete flow
            
            // Step 1: Verify tickets were queried with correct routeIds
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalledWith(
                ['tuyen-metro-so-1-ben-thanh-suoi-tien', 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai'],
                ['active', 'inactive']
            );

            // Step 2: Verify passenger IDs were extracted
            expect(ticketGrpcClient.extractUniquePassengerIds).toHaveBeenCalled();

            // Step 3: Verify passenger phone numbers were retrieved
            expect(userGrpcClient.getPassengerPhoneNumbers).toHaveBeenCalledWith(
                scenario.expectedPassengerIds
            );

            // Step 4: Verify SMS filtering and conversion
            expect(userGrpcClient.filterSmsEnabledContacts).toHaveBeenCalled();
            expect(userGrpcClient.convertContactsToUsers).toHaveBeenCalled();

            // Step 5: Verify template rendering
            expect(consumer.templateService.render).toHaveBeenCalledWith(
                'sms/transport_template/station_deactivation.hbs',
                expect.objectContaining({
                    stationName: 'Ga Bến Thành',
                    location: 'Quận 1, TP.HCM',
                    reason: 'Bảo trì hệ thống',
                    affectedRoutes: expect.any(Array)
                })
            );
        });

        it('should handle no matching tickets scenario', async () => {
            const scenario = testScenarios.noMatchingTickets;
            const eventData = {
                data: {
                    ...mockStationDeactivationEvent.data,
                    affectedRoutes: [
                        { routeId: 'non-existent-route', routeName: 'Non-existent Route' }
                    ]
                }
            };

            // Mock empty response
            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({ tickets: [], totalCount: 0 });

            await consumer.handleStationDeactivation(eventData);
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalledWith(
                ['non-existent-route'],
                ['active', 'inactive']
            );
            
            // Should not proceed to user service calls
            expect(userGrpcClient.getPassengerPhoneNumbers).not.toHaveBeenCalled();
            expect(consumer.templateService.renderTemplate).not.toHaveBeenCalled();
        });

        it('should handle mixed SMS preferences scenario', async () => {
            const scenario = testScenarios.mixedSmsPreferences;
            const eventData = mockStationDeactivationEvent;

            // Mock responses with mixed SMS preferences
            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({
                tickets: [mockGrpcResponses.ticketsByRoutes.tickets[0]], // Only first ticket
                totalCount: 1
            });
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-001']);
            
            userGrpcClient.getPassengerPhoneNumbers.mockResolvedValue({
                contacts: [
                    {
                        passengerId: 'passenger-001',
                        phoneNumber: '+84901234567',
                        smsEnabled: true,
                        name: 'Nguyễn Văn An'
                    }
                ]
            });
            userGrpcClient.filterSmsEnabledContacts.mockReturnValue([
                {
                    passengerId: 'passenger-001',
                    phoneNumber: '+84901234567',
                    smsEnabled: true,
                    name: 'Nguyễn Văn An'
                }
            ]);
            userGrpcClient.convertContactsToUsers.mockReturnValue([
                { passengerId: 'passenger-001', phoneNumber: '+84901234567', name: 'Nguyễn Văn An' }
            ]);

            consumer.templateService.render.mockResolvedValue(mockRenderedSms);

            await consumer.handleStationDeactivation(eventData);
            expect(userGrpcClient.filterSmsEnabledContacts).toHaveBeenCalled();
            expect(consumer.templateService.render).toHaveBeenCalled();
        });

        it('should handle duplicate passenger IDs correctly', async () => {
            const scenario = testScenarios.duplicatePassengerIds;
            const eventData = mockStationDeactivationEvent;

            // Mock tickets with duplicate passenger IDs
            const ticketsWithDuplicates = [
                mockGrpcResponses.ticketsByRoutes.tickets[0], // passenger-001
                mockGrpcResponses.ticketsByRoutes.tickets[2]  // passenger-001 (duplicate)
            ];

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({
                tickets: ticketsWithDuplicates,
                totalCount: 2
            });
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-001']); // Should be unique
            
            userGrpcClient.getPassengerPhoneNumbers.mockResolvedValue({
                contacts: [
                    {
                        passengerId: 'passenger-001',
                        phoneNumber: '+84901234567',
                        smsEnabled: true,
                        name: 'Nguyễn Văn An'
                    }
                ]
            });
            userGrpcClient.filterSmsEnabledContacts.mockReturnValue([
                {
                    passengerId: 'passenger-001',
                    phoneNumber: '+84901234567',
                    smsEnabled: true,
                    name: 'Nguyễn Văn An'
                }
            ]);
            userGrpcClient.convertContactsToUsers.mockReturnValue([
                { passengerId: 'passenger-001', phoneNumber: '+84901234567', name: 'Nguyễn Văn An' }
            ]);

            consumer.templateService.render.mockResolvedValue(mockRenderedSms);

            await consumer.handleStationDeactivation(eventData);
            
            // Verify that extractUniquePassengerIds was called and returned unique IDs
            expect(ticketGrpcClient.extractUniquePassengerIds).toHaveBeenCalledWith(ticketsWithDuplicates);
            
            // Verify user service was called with unique passenger IDs only
            expect(userGrpcClient.getPassengerPhoneNumbers).toHaveBeenCalledWith(['passenger-001']);
        });
    });

    describe('Error Handling and Resilience', () => {
        it('should handle ticket service gRPC errors gracefully', async () => {
            const eventData = mockStationDeactivationEvent;

            ticketGrpcClient.getTicketsByRoutes.mockRejectedValue(new Error('Ticket service unavailable'));

            await consumer.handleStationDeactivation(eventData);
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalled();
            
            // Should not proceed to user service calls
            expect(userGrpcClient.getPassengerPhoneNumbers).not.toHaveBeenCalled();
        });

        it('should handle user service gRPC errors gracefully', async () => {
            const eventData = mockStationDeactivationEvent;

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockGrpcResponses.ticketsByRoutes);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-001']);
            
            userGrpcClient.getPassengerPhoneNumbers.mockRejectedValue(new Error('User service unavailable'));

            await consumer.handleStationDeactivation(eventData);
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalled();
            expect(userGrpcClient.getPassengerPhoneNumbers).toHaveBeenCalled();
        });

        it('should handle template rendering errors with fallback', async () => {
            const eventData = mockStationDeactivationEvent;

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue(mockGrpcResponses.ticketsByRoutes);
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(['passenger-001']);
            
            userGrpcClient.getPassengerPhoneNumbers.mockResolvedValue(mockGrpcResponses.passengerContacts);
            userGrpcClient.filterSmsEnabledContacts.mockReturnValue(
                mockGrpcResponses.passengerContacts.contacts.filter(c => c.smsEnabled)
            );
            userGrpcClient.convertContactsToUsers.mockReturnValue([
                { passengerId: 'passenger-001', phoneNumber: '+84901234567', name: 'Nguyễn Văn An' }
            ]);

            consumer.templateService.renderTemplate.mockRejectedValue(new Error('Template rendering failed'));

            await consumer.handleStationDeactivation(eventData);
            expect(consumer.templateService.render).toHaveBeenCalled();
        });

        it('should handle empty affected routes gracefully', async () => {
            const eventData = {
                data: {
                    ...mockStationDeactivationEvent.data,
                    affectedRoutes: []
                }
            };

            await consumer.handleStationDeactivation(eventData);
            
            // Should not make any gRPC calls
            expect(ticketGrpcClient.getTicketsByRoutes).not.toHaveBeenCalled();
            expect(userGrpcClient.getPassengerPhoneNumbers).not.toHaveBeenCalled();
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large number of routeIds efficiently', async () => {
            const largeRouteIds = Array.from({ length: 100 }, (_, i) => `route-${i}`);
            const eventData = {
                data: {
                    ...mockStationDeactivationEvent.data,
                    affectedRoutes: largeRouteIds.map(routeId => ({
                        routeId,
                        routeName: `Route ${routeId}`,
                        sequence: 1
                    }))
                }
            };

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({ tickets: [], totalCount: 0 });

            const startTime = Date.now();
            await consumer.handleStationDeactivation(eventData);
            const endTime = Date.now();
            expect(ticketGrpcClient.getTicketsByRoutes).toHaveBeenCalledWith(
                largeRouteIds,
                ['active', 'inactive']
            );
            
            // Should complete within reasonable time (adjust threshold as needed)
            expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
        });

        it('should handle large number of passengers efficiently', async () => {
            const largePassengerIds = Array.from({ length: 1000 }, (_, i) => `passenger-${i}`);
            const eventData = mockStationDeactivationEvent;

            ticketGrpcClient.getTicketsByRoutes.mockResolvedValue({
                tickets: largePassengerIds.map(id => ({
                    ticketId: `ticket-${id}`,
                    passengerId: id,
                    status: 'active',
                    fareBreakdown: { segmentFares: [{ routeId: 'route-1' }] }
                })),
                totalCount: largePassengerIds.length
            });
            ticketGrpcClient.ticketContainsRoutes.mockReturnValue(true);
            ticketGrpcClient.extractUniquePassengerIds.mockReturnValue(largePassengerIds);
            
            userGrpcClient.getPassengerPhoneNumbers.mockResolvedValue({
                contacts: largePassengerIds.map(id => ({
                    passengerId: id,
                    phoneNumber: `+8490${id.slice(-7)}`,
                    smsEnabled: true,
                    name: `User ${id}`
                }))
            });
            userGrpcClient.filterSmsEnabledContacts.mockReturnValue(
                largePassengerIds.map(id => ({
                    passengerId: id,
                    phoneNumber: `+8490${id.slice(-7)}`,
                    smsEnabled: true,
                    name: `User ${id}`
                }))
            );
            userGrpcClient.convertContactsToUsers.mockReturnValue(
                largePassengerIds.map(id => ({
                    passengerId: id,
                    phoneNumber: `+8490${id.slice(-7)}`,
                    name: `User ${id}`
                }))
            );

            consumer.templateService.render.mockResolvedValue(mockRenderedSms);

            const startTime = Date.now();
            await consumer.handleStationDeactivation(eventData);
            const endTime = Date.now();
            expect(userGrpcClient.getPassengerPhoneNumbers).toHaveBeenCalledWith(largePassengerIds);
            
            // Should complete within reasonable time
            expect(endTime - startTime).toBeLessThan(10000); // 10 seconds
        });
    });
});
