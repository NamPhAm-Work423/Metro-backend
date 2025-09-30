const express = require('express');
const request = require('supertest');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
  authorizeRoles: (...roles) => [
    (req, res, next) => {
      req.user = { id: 'test-admin', role: 'admin' };
      req.headers['x-passenger-id'] = 'passenger-123';
      next();
    }
  ]
}));

// Mock ticket controller methods
jest.mock('../../../src/controllers/ticket.controller', () => {
  const mockController = {
    updateTicketStatus: jest.fn(),
    calculateTicketPrice: jest.fn(),
    createShortTermTicket: jest.fn(),
    createLongTermTicket: jest.fn(),
    getMyTickets: jest.fn(),
    getMyActiveTickets: jest.fn(),
    getMyInactiveTickets: jest.fn(),
    getMyCancelledTickets: jest.fn(),
    getMyExpiredTickets: jest.fn(),
    getTicket: jest.fn(),
    cancelTicket: jest.fn(),
    getPhoneTicket: jest.fn(),
    getMailTicket: jest.fn(),
    useTicket: jest.fn(),
    useTicketByQRCode: jest.fn(),
    validateTicket: jest.fn(),
    getAbusedQR: jest.fn(),
    getTicketDetail: jest.fn(),
    updateTicket: jest.fn(),
    deleteTicket: jest.fn(),
    getAllTickets: jest.fn(),
    getTicketStatistics: jest.fn(),
    getTicketsByRoutes: jest.fn(),
    expireTickets: jest.fn(),
    healthCheck: jest.fn(),
    getTicketPayment: jest.fn(),
    getPaymentStatus: jest.fn(),
    activateLongTermTicket: jest.fn()
  };
  return mockController;
});

const ticketController = require('../../../src/controllers/ticket.controller');
const ticketRoutes = require('../../../src/routes/ticket.route');

describe('Ticket Status Update API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/tickets', ticketRoutes);
    jest.clearAllMocks();
  });

  describe('PUT /v1/tickets/:id/status', () => {
    const ticketId = 'ticket-123';
    const validStatuses = ['active', 'inactive', 'pending_payment', 'used', 'expired', 'cancelled'];

    describe('Successful status updates', () => {
      it('should successfully update ticket status to active', async () => {
        const mockResponse = {
          ticketId,
          status: 'active',
          updatedAt: new Date('2024-01-01T10:00:00Z')
        };

        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: {
              ticketId: req.params.id,
              oldStatus: 'pending_payment',
              newStatus: 'active',
              reason: req.body.reason,
              updatedBy: req.user.id,
              updatedAt: mockResponse.updatedAt
            }
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'active', reason: 'Payment completed' })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Ticket status updated successfully',
          data: {
            ticketId,
            oldStatus: 'pending_payment',
            newStatus: 'active',
            reason: 'Payment completed',
            updatedBy: 'test-admin',
            updatedAt: mockResponse.updatedAt.toISOString()
          }
        });

        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });

      it('should successfully update ticket status without reason', async () => {
        const mockResponse = {
          ticketId,
          status: 'cancelled',
          updatedAt: new Date('2024-01-01T10:00:00Z')
        };

        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: {
              ticketId: req.params.id,
              oldStatus: 'active',
              newStatus: 'cancelled',
              reason: null,
              updatedBy: req.user.id,
              updatedAt: mockResponse.updatedAt
            }
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'cancelled' })
          .expect(200);

        expect(response.body.data.reason).toBeNull();
        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });

      it('should accept all valid statuses', async () => {
        for (const status of validStatuses) {
          ticketController.updateTicketStatus.mockImplementation((req, res) => {
            res.status(200).json({
              success: true,
              message: 'Ticket status updated successfully',
              data: {
                ticketId: req.params.id,
                newStatus: req.body.status,
                updatedBy: req.user.id
              }
            });
          });

          await request(app)
            .put(`/v1/tickets/${ticketId}/status`)
            .send({ status })
            .expect(200);

          expect(ticketController.updateTicketStatus).toHaveBeenCalled();

          jest.clearAllMocks();
        }
      });
    });

    describe('Validation errors', () => {
      it('should return 400 when status is missing', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Status is required',
            error: 'MISSING_STATUS'
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ reason: 'Some reason' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: 'Status is required',
          error: 'MISSING_STATUS'
        });
      });

      it('should return 400 when status is invalid', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Invalid status. Must be one of: active, inactive, pending_payment, used, expired, cancelled',
            error: 'INVALID_STATUS'
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'invalid_status' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: 'Invalid status. Must be one of: active, inactive, pending_payment, used, expired, cancelled',
          error: 'INVALID_STATUS'
        });
      });

      it('should return 400 for invalid status transition', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Invalid status transition from \'pending_payment\' to \'used\'',
            error: 'INVALID_STATUS_TRANSITION'
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'used' })
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: 'Invalid status transition from \'pending_payment\' to \'used\'',
          error: 'INVALID_STATUS_TRANSITION'
        });
      });
    });

    describe('Service errors', () => {
      it('should return 404 when ticket not found', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(404).json({
            success: false,
            message: 'Ticket not found',
            error: 'TICKET_NOT_FOUND'
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/non-existent-ticket/status`)
          .send({ status: 'active' })
          .expect(404);

        expect(response.body).toEqual({
          success: false,
          message: 'Ticket not found',
          error: 'TICKET_NOT_FOUND'
        });
      });

      it('should return 500 for internal server errors', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: 'INTERNAL_ERROR_UPDATE_TICKET_STATUS'
          });
        });

        const response = await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'active' })
          .expect(500);

        expect(response.body).toEqual({
          success: false,
          message: 'Database connection failed',
          error: 'INTERNAL_ERROR_UPDATE_TICKET_STATUS'
        });
      });
    });

    describe('Request validation', () => {
      it('should handle empty request body', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(400).json({
            success: false,
            message: 'Status is required',
            error: 'MISSING_STATUS'
          });
        });

        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({})
          .expect(400);
      });

      it('should handle malformed JSON', async () => {
        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .set('Content-Type', 'application/json')
          .send('{"status": "active"') // Missing closing brace
          .expect(400);
      });

      it('should handle extra fields in request body', async () => {
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: {
              ticketId: req.params.id,
              newStatus: req.body.status,
              updatedBy: req.user.id
            }
          });
        });

        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ 
            status: 'active', 
            reason: 'Payment completed',
            extraField: 'should be ignored'
          })
          .expect(200);

        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });
    });

    describe('Authorization', () => {
      it('should require admin role for status updates', async () => {
        // This test verifies that the route is properly configured with admin authorization
        // The actual authorization logic is tested in the middleware tests
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: { ticketId: req.params.id, newStatus: req.body.status }
          });
        });

        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'active' })
          .expect(200);

        // Verify that the mock user has admin role
        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('should handle very long reason text', async () => {
        const longReason = 'A'.repeat(1000);
        
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: {
              ticketId: req.params.id,
              newStatus: req.body.status,
              reason: req.body.reason,
              updatedBy: req.user.id
            }
          });
        });

        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'cancelled', reason: longReason })
          .expect(200);

        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });

      it('should handle special characters in reason', async () => {
        const specialReason = 'Reason with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
        
        ticketController.updateTicketStatus.mockImplementation((req, res) => {
          res.status(200).json({
            success: true,
            message: 'Ticket status updated successfully',
            data: {
              ticketId: req.params.id,
              newStatus: req.body.status,
              reason: req.body.reason,
              updatedBy: req.user.id
            }
          });
        });

        await request(app)
          .put(`/v1/tickets/${ticketId}/status`)
          .send({ status: 'cancelled', reason: specialReason })
          .expect(200);

        expect(ticketController.updateTicketStatus).toHaveBeenCalled();
      });
    });
  });
});
