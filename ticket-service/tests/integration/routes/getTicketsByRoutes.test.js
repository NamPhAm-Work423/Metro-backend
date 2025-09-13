const request = require('supertest');
const app = require('../../../src/app');
const { Ticket } = require('../../../src/models/index.model');
const passengerIdTracingService = require('../../../src/services/ticket/handlers/passengerIdTracing');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
    authorizeRoles: (...allowedRoles) => [
        (req, res, next) => {
            // Mock different user types based on token
            let userRoles = [];
            if (req.headers.authorization?.includes('valid-admin-token')) {
                userRoles = ['admin'];
                req.user = { userId: 'admin-123', roles: userRoles };
            } else if (req.headers.authorization?.includes('valid-staff-token')) {
                userRoles = ['staff'];
                req.user = { userId: 'staff-123', roles: userRoles };
            } else if (req.headers.authorization?.includes('passenger-token')) {
                userRoles = ['passenger'];
                req.user = { userId: 'passenger-123', roles: userRoles };
            } else {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }

            // Check if user has required role
            const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
            if (!hasRequiredRole) {
                return res.status(403).json({ success: false, message: 'Forbidden' });
            }

            next();
        }
    ]
}));

// Mock dependencies
jest.mock('../../../src/services/ticket/handlers/passengerIdTracing');
jest.mock('../../../src/models/index.model', () => ({
    Ticket: {
        findAll: jest.fn()
    }
}));

describe('GET /v1/ticket/tickets/getTicketsByRoutes', () => {
    const validToken = 'valid-admin-token';
    const validStaffToken = 'valid-staff-token';
    const invalidToken = 'invalid-token';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication and Authorization', () => {
        it('should return 401 when no token provided', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(401);
        });

        it('should return 401 when invalid token provided', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${invalidToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(401);
        });

        it('should return 403 when user lacks required role', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer passenger-token`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(403);
        });

        it('should allow admin access', async () => {
            const mockResult = {
                tickets: [
                    {
                        ticketId: 'ticket-1',
                        passengerId: 'passenger-1',
                        status: 'active',
                        fareBreakdown: { segmentFares: [{ routeId: 'route-1' }] }
                    }
                ],
                totalCount: 1
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should allow staff access', async () => {
            const mockResult = {
                tickets: [],
                totalCount: 0
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validStaffToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('Input Validation', () => {
        it('should return 400 when routeIds is missing', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_ROUTE_IDS');
        });

        it('should return 400 when routeIds is empty', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: '' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('MISSING_ROUTE_IDS');
        });

        it('should return 400 when routeIds contains invalid format', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: '   ' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_ROUTE_ID_FORMAT');
        });

        it('should return 400 when statuses contains invalid values', async () => {
            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1', statuses: 'invalid-status' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error.code).toBe('INVALID_STATUS_VALUES');
        });

        it('should accept valid routeIds as single value', async () => {
            const mockResult = {
                tickets: [],
                totalCount: 0
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(200);
            expect(passengerIdTracingService.getTicketsByRoutes).toHaveBeenCalledWith(
                ['route-1'],
                ['active', 'inactive']
            );
        });

        it('should accept valid routeIds as comma-separated values', async () => {
            const mockResult = {
                tickets: [],
                totalCount: 0
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1,route-2,route-3' });

            expect(response.status).toBe(200);
            expect(passengerIdTracingService.getTicketsByRoutes).toHaveBeenCalledWith(
                ['route-1', 'route-2', 'route-3'],
                ['active', 'inactive']
            );
        });

        it('should accept valid statuses as comma-separated values', async () => {
            const mockResult = {
                tickets: [],
                totalCount: 0
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1', statuses: 'active,used,cancelled' });

            expect(response.status).toBe(200);
            expect(passengerIdTracingService.getTicketsByRoutes).toHaveBeenCalledWith(
                ['route-1'],
                ['active', 'used', 'cancelled']
            );
        });
    });

    describe('Successful Responses', () => {
        it('should return tickets when found', async () => {
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
                                tripPrice: 15000
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
                                    routeId: 'route-1',
                                    routeName: 'Route 1',
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

            const mockResult = {
                tickets: mockTickets,
                totalCount: 2
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Tickets retrieved successfully by routes',
                data: {
                    tickets: expect.arrayContaining([
                        expect.objectContaining({
                            ticketId: 'ticket-1',
                            passengerId: 'passenger-1',
                            status: 'active'
                        }),
                        expect.objectContaining({
                            ticketId: 'ticket-2',
                            passengerId: 'passenger-2',
                            status: 'inactive'
                        })
                    ]),
                    totalCount: 2,
                    routeIds: ['route-1'],
                    statuses: ['active', 'inactive']
                },
                count: 2
            });
        });

        it('should return empty array when no tickets found', async () => {
            const mockResult = {
                tickets: [],
                totalCount: 0
            };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'non-existent-route' });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: 'Tickets retrieved successfully by routes',
                data: {
                    tickets: [],
                    totalCount: 0,
                    routeIds: ['non-existent-route'],
                    statuses: ['active', 'inactive']
                },
                count: 0
            });
        });
    });

    describe('Error Handling', () => {
        it('should return 500 when service throws error', async () => {
            passengerIdTracingService.getTicketsByRoutes.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(500);
            expect(response.body).toMatchObject({
                success: false,
                message: 'Database connection failed',
                error: 'INTERNAL_ERROR_GET_TICKETS_BY_ROUTES'
            });
        });

        it('should handle service timeout gracefully', async () => {
            passengerIdTracingService.getTicketsByRoutes.mockRejectedValue(new Error('Service timeout'));

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-1' });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('INTERNAL_ERROR_GET_TICKETS_BY_ROUTES');
        });
    });

    describe('Edge Cases', () => {
        it('should handle large number of routeIds', async () => {
            const largeRouteIds = Array.from({ length: 100 }, (_, i) => `route-${i}`).join(',');
            const mockResult = { tickets: [], totalCount: 0 };

            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: largeRouteIds });

            expect(response.status).toBe(200);
            expect(passengerIdTracingService.getTicketsByRoutes).toHaveBeenCalledWith(
                expect.arrayContaining([expect.stringMatching(/^route-\d+$/)]),
                ['active', 'inactive']
            );
        });

        it('should handle special characters in routeIds', async () => {
            const mockResult = { tickets: [], totalCount: 0 };
            passengerIdTracingService.getTicketsByRoutes.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/v1/ticket/tickets/getTicketsByRoutes')
                .set('Authorization', `Bearer ${validToken}`)
                .query({ routeIds: 'route-with-special-chars-123' });

            expect(response.status).toBe(200);
            expect(passengerIdTracingService.getTicketsByRoutes).toHaveBeenCalledWith(
                ['route-with-special-chars-123'],
                ['active', 'inactive']
            );
        });
    });
});
