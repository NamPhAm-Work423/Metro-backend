const ticketController = require('../../../src/controllers/ticket.controller');
const ticketService = require('../../../src/services/ticket.service');

// Mock dependent modules
jest.mock('../../../src/services/ticket.service');
jest.mock('../../../src/helpers/errorHandler.helper', () => (fn) => fn);

describe('Ticket Controller - updateTicketStatus', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { id: 'ticket-123' },
      body: {},
      user: { id: 'admin-123', role: 'admin' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe('Successful status updates', () => {
    it('should successfully update ticket status to active', async () => {
      req.body = { status: 'active', reason: 'Payment completed' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'active',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      };
      
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-123',
        'active',
        'Payment completed',
        'admin-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket status updated successfully',
        data: {
          ticketId: 'ticket-123',
          oldStatus: 'unknown',
          newStatus: 'active',
          reason: 'Payment completed',
          updatedBy: 'admin-123',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should successfully update ticket status without reason', async () => {
      req.body = { status: 'cancelled' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'cancelled',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      };
      
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-123',
        'cancelled',
        undefined,
        'admin-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket status updated successfully',
        data: {
          ticketId: 'ticket-123',
          oldStatus: 'unknown',
          newStatus: 'cancelled',
          reason: null,
          updatedBy: 'admin-123',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle staff user updating status', async () => {
      req.user = { id: 'staff-456', role: 'staff' };
      req.body = { status: 'used' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'used',
        updatedAt: new Date('2024-01-01T10:00:00Z')
      };
      
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-123',
        'used',
        undefined,
        'staff-456'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 when status is missing', async () => {
      req.body = { reason: 'Some reason' };

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Status is required',
        error: 'MISSING_STATUS'
      });
      expect(ticketService.updateTicketStatus).not.toHaveBeenCalled();
    });

    it('should return 400 when status is invalid', async () => {
      req.body = { status: 'invalid_status' };

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid status. Must be one of: active, inactive, pending_payment, used, expired, cancelled',
        error: 'INVALID_STATUS'
      });
      expect(ticketService.updateTicketStatus).not.toHaveBeenCalled();
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = ['active', 'inactive', 'pending_payment', 'used', 'expired', 'cancelled'];
      
      for (const status of validStatuses) {
        req.body = { status };
        ticketService.updateTicketStatus.mockResolvedValue({
          ticketId: 'ticket-123',
          status,
          updatedAt: new Date()
        });

        await ticketController.updateTicketStatus(req, res, next);

        expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
          'ticket-123',
          status,
          undefined,
          'admin-123'
        );
        expect(res.status).toHaveBeenCalledWith(200);
        
        jest.clearAllMocks();
      }
    });
  });

  describe('Service errors', () => {
    it('should return 400 for invalid status transition', async () => {
      req.body = { status: 'used' };
      const transitionError = new Error('Invalid status transition from \'pending_payment\' to \'used\'');
      ticketService.updateTicketStatus.mockRejectedValue(transitionError);

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid status transition from \'pending_payment\' to \'used\'',
        error: 'INVALID_STATUS_TRANSITION'
      });
    });

    it('should return 404 when ticket not found', async () => {
      req.body = { status: 'active' };
      const notFoundError = new Error('Ticket not found');
      ticketService.updateTicketStatus.mockRejectedValue(notFoundError);

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Ticket not found',
        error: 'TICKET_NOT_FOUND'
      });
    });

    it('should return 500 for other service errors', async () => {
      req.body = { status: 'active' };
      const serviceError = new Error('Database connection failed');
      ticketService.updateTicketStatus.mockRejectedValue(serviceError);

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed',
        error: 'INTERNAL_ERROR_UPDATE_TICKET_STATUS'
      });
    });

    it('should handle service error without message', async () => {
      req.body = { status: 'active' };
      const serviceError = new Error();
      ticketService.updateTicketStatus.mockRejectedValue(serviceError);

      await ticketController.updateTicketStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: '',
        error: 'INTERNAL_ERROR_UPDATE_TICKET_STATUS'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle missing user ID', async () => {
      req.user = {};
      req.body = { status: 'active' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'active',
        updatedAt: new Date()
      };
      
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-123',
        'active',
        undefined,
        undefined
      );
    });

    it('should handle empty reason string', async () => {
      req.body = { status: 'cancelled', reason: '' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'cancelled',
        updatedAt: new Date()
      };
      
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.updateTicketStatus).toHaveBeenCalledWith(
        'ticket-123',
        'cancelled',
        '',
        'admin-123'
      );
    });

    it('should get oldStatus from database before update', async () => {
      req.body = { status: 'active' };
      
      const mockCurrentTicket = {
        ticketId: 'ticket-123',
        status: 'pending_payment'
      };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'active',
        updatedAt: new Date()
      };
      
      ticketService.getTicketById.mockResolvedValue(mockCurrentTicket);
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.getTicketById).toHaveBeenCalledWith('ticket-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket status updated successfully',
        data: {
          ticketId: 'ticket-123',
          oldStatus: 'pending_payment',
          newStatus: 'active',
          reason: null,
          updatedBy: 'admin-123',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle case when ticket not found for oldStatus', async () => {
      req.body = { status: 'active' };
      
      const mockUpdatedTicket = {
        ticketId: 'ticket-123',
        status: 'active',
        updatedAt: new Date()
      };
      
      ticketService.getTicketById.mockResolvedValue(null);
      ticketService.updateTicketStatus.mockResolvedValue(mockUpdatedTicket);

      await ticketController.updateTicketStatus(req, res, next);

      expect(ticketService.getTicketById).toHaveBeenCalledWith('ticket-123');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket status updated successfully',
        data: {
          ticketId: 'ticket-123',
          oldStatus: 'unknown',
          newStatus: 'active',
          reason: null,
          updatedBy: 'admin-123',
          updatedAt: expect.any(Date)
        }
      });
    });
  });
});
