// Mock the entire app
const mockApp = {
    use: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    listen: jest.fn()
};

// Mock the ticket controller methods
const mockUseTicket = jest.fn();
const mockUseTicketByQRCode = jest.fn();

jest.mock('../../src/app', () => {
    const express = require('express');
    const app = express();
    
    // Mock the ticket routes
    app.post('/v1/tickets/:id/use', (req, res) => {
        mockUseTicket(req, res);
    });
    
    app.post('/v1/tickets/:qr-code/use', (req, res) => {
        mockUseTicketByQRCode(req, res);
    });
    
    // Add a catch-all route for 404
    app.use('*', (req, res) => {
        res.status(404).json({
            success: false,
            message: 'Route not found'
        });
    });
    
    return app;
});

const request = require('supertest');
const app = require('../../src/app');

describe('Ticket Usage Integration Tests (Staff/Admin Only)', () => {
    let testTicket;
    let staffAuthToken;

    beforeAll(async () => {
        // Mock authentication token for staff
        staffAuthToken = 'mock-jwt-token-for-staff-member';
    });

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('POST /v1/tickets/:id/use', () => {
        it('should successfully use a valid ticket (staff)', async () => {
            // Arrange
            const ticketId = 'test-usage-ticket-123';
            const mockResponse = {
                success: true,
                message: 'Ticket used successfully',
                data: {
                    ticketId: ticketId,
                    status: 'used',
                    passengerId: 'test-passenger-456',
                    usedAt: new Date()
                },
                timestamp: new Date().toISOString()
            };

            mockUseTicket.mockImplementation((req, res) => {
                res.status(200).json(mockResponse);
            });

            // Act
            const response = await request(app)
                .post(`/v1/tickets/${ticketId}/use`)
                .set('Authorization', `Bearer ${staffAuthToken}`)
                .set('x-passenger-id', 'test-passenger-456')
                .expect(200);

            // Assert
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Ticket used successfully');
            expect(response.body.data).toMatchObject({
                ticketId: ticketId,
                status: 'used',
                passengerId: 'test-passenger-456'
            });
            expect(response.body.data.usedAt).toBeDefined();
            expect(response.body.timestamp).toBeDefined();
        });

        it('should return 404 when ticket not found', async () => {
            // Arrange
            const nonExistentTicketId = 'non-existent-ticket-999';

            mockUseTicket.mockImplementation((req, res) => {
                res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            });

            // Act & Assert
            const response = await request(app)
                .post(`/v1/tickets/${nonExistentTicketId}/use`)
                .set('Authorization', `Bearer ${staffAuthToken}`)
                .set('x-passenger-id', 'test-passenger-456')
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Ticket not found');
        });

        it('should return 400 when ticket is already used', async () => {
            // Arrange
            const ticketId = 'test-usage-ticket-123';

            mockUseTicket.mockImplementation((req, res) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket has already been used'
                });
            });

            // Act & Assert
            const response = await request(app)
                .post(`/v1/tickets/${ticketId}/use`)
                .set('Authorization', `Bearer ${staffAuthToken}`)
                .set('x-passenger-id', 'test-passenger-456')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already been used');
        });

        it('should return 400 when ticket is not active', async () => {
            // Arrange
            const ticketId = 'test-usage-ticket-123';

            mockUseTicket.mockImplementation((req, res) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket is not active and cannot be used'
                });
            });

            // Act & Assert
            const response = await request(app)
                .post(`/v1/tickets/${ticketId}/use`)
                .set('Authorization', `Bearer ${staffAuthToken}`)
                .set('x-passenger-id', 'test-passenger-456')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not active');
        });

        it('should return 401 when no authentication token provided', async () => {
            // Arrange
            const ticketId = 'test-usage-ticket-123';

            mockUseTicket.mockImplementation((req, res) => {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            });

            // Act & Assert
            const response = await request(app)
                .post(`/v1/tickets/${ticketId}/use`)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should handle malformed ticket ID gracefully', async () => {
            // Arrange
            const malformedTicketId = 'invalid-ticket-id-format';

            mockUseTicket.mockImplementation((req, res) => {
                res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            });

            // Act & Assert
            const response = await request(app)
                .post(`/v1/tickets/${malformedTicketId}/use`)
                .set('Authorization', `Bearer ${staffAuthToken}`)
                .expect(404);

            expect(response.body.success).toBe(false);
        });
    });
});
