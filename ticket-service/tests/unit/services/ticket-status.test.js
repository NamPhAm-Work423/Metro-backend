const TicketStatusService = require('../../../src/services/ticket/services/TicketStatusService');
const { Ticket } = require('../../../src/models/index.model');

// Mock the Ticket model
jest.mock('../../../src/models/index.model', () => ({
  Ticket: {
    findByPk: jest.fn(),
    calculateValidityPeriod: jest.fn()
  }
}));

// Mock logger
jest.mock('../../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

describe('TicketStatusService', () => {
  let mockTicket;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTicket = {
      ticketId: 'ticket-123',
      status: 'pending_payment',
      ticketType: 'oneway',
      passengerId: 'passenger-123',
      validFrom: null,
      validUntil: null,
      usedList: [],
      update: jest.fn()
    };

    Ticket.findByPk.mockResolvedValue(mockTicket);
    Ticket.calculateValidityPeriod.mockReturnValue({
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-01-31')
    });
  });

  describe('getValidStatuses', () => {
    it('should return all valid statuses', () => {
      const statuses = TicketStatusService.getValidStatuses();
      expect(statuses).toEqual([
        'active', 'inactive', 'pending_payment', 'used', 'expired', 'cancelled'
      ]);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for pending_payment status', () => {
      const transitions = TicketStatusService.getValidTransitions('pending_payment');
      expect(transitions).toEqual(['active', 'cancelled']);
    });

    it('should return valid transitions for active status', () => {
      const transitions = TicketStatusService.getValidTransitions('active');
      expect(transitions).toEqual(['used', 'expired', 'cancelled']);
    });

    it('should return empty array for cancelled status', () => {
      const transitions = TicketStatusService.getValidTransitions('cancelled');
      expect(transitions).toEqual([]);
    });

    it('should return empty array for invalid status', () => {
      const transitions = TicketStatusService.getValidTransitions('invalid_status');
      expect(transitions).toEqual([]);
    });
  });

  describe('validateStatusTransition', () => {
    it('should return true for valid transition', () => {
      const isValid = TicketStatusService.validateStatusTransition('pending_payment', 'active');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid transition', () => {
      const isValid = TicketStatusService.validateStatusTransition('pending_payment', 'used');
      expect(isValid).toBe(false);
    });

    it('should return false for transition from cancelled', () => {
      const isValid = TicketStatusService.validateStatusTransition('cancelled', 'active');
      expect(isValid).toBe(false);
    });
  });

  describe('updateTicketStatus', () => {
    it('should successfully update ticket status from pending_payment to active', async () => {
      const updatedTicket = {
        ...mockTicket,
        status: 'active',
        updatedAt: new Date()
      };
      mockTicket.update.mockResolvedValue(updatedTicket);

      const result = await TicketStatusService.updateTicketStatus(
        'ticket-123',
        'active',
        'Payment completed',
        'admin-123'
      );

      expect(Ticket.findByPk).toHaveBeenCalledWith('ticket-123');
      expect(mockTicket.update).toHaveBeenCalledWith({
        status: 'active',
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(updatedTicket);
    });

    it('should successfully update ticket status to used and add to usedList', async () => {
      // Change ticket status to active first to allow transition to used
      mockTicket.status = 'active';
      
      const updatedTicket = {
        ...mockTicket,
        status: 'used',
        usedList: [new Date()],
        updatedAt: new Date()
      };
      mockTicket.update.mockResolvedValue(updatedTicket);

      const result = await TicketStatusService.updateTicketStatus(
        'ticket-123',
        'used',
        null,
        'staff-123'
      );

      expect(mockTicket.update).toHaveBeenCalledWith({
        status: 'used',
        usedList: [expect.any(Date)],
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(updatedTicket);
    });

    it('should successfully update ticket status to cancelled with reason', async () => {
      const updatedTicket = {
        ...mockTicket,
        status: 'cancelled',
        isActive: false,
        cancelledAt: new Date(),
        cancellationReason: 'Customer request',
        updatedAt: new Date()
      };
      mockTicket.update.mockResolvedValue(updatedTicket);

      const result = await TicketStatusService.updateTicketStatus(
        'ticket-123',
        'cancelled',
        'Customer request',
        'admin-123'
      );

      expect(mockTicket.update).toHaveBeenCalledWith({
        status: 'cancelled',
        isActive: false,
        cancelledAt: expect.any(Date),
        cancellationReason: 'Customer request',
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(updatedTicket);
    });

    it('should activate long-term ticket and set validity period', async () => {
      mockTicket.status = 'inactive';
      mockTicket.ticketType = 'monthly_pass';
      mockTicket.validFrom = null;

      const updatedTicket = {
        ...mockTicket,
        status: 'active',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-31'),
        activatedAt: new Date(),
        updatedAt: new Date()
      };
      mockTicket.update.mockResolvedValue(updatedTicket);

      const result = await TicketStatusService.updateTicketStatus(
        'ticket-123',
        'active',
        'Manual activation',
        'admin-123'
      );

      expect(Ticket.calculateValidityPeriod).toHaveBeenCalledWith('monthly_pass');
      expect(mockTicket.update).toHaveBeenCalledWith({
        status: 'active',
        validFrom: new Date('2024-01-01'),
        validUntil: new Date('2024-01-31'),
        activatedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(updatedTicket);
    });

    it('should throw error for invalid status', async () => {
      await expect(
        TicketStatusService.updateTicketStatus('ticket-123', 'invalid_status')
      ).rejects.toThrow('Invalid status. Must be one of: active, inactive, pending_payment, used, expired, cancelled');
    });

    it('should throw error when ticket not found', async () => {
      Ticket.findByPk.mockResolvedValue(null);

      await expect(
        TicketStatusService.updateTicketStatus('ticket-123', 'active')
      ).rejects.toThrow('Ticket not found');
    });

    it('should throw error for invalid status transition', async () => {
      await expect(
        TicketStatusService.updateTicketStatus('ticket-123', 'used')
      ).rejects.toThrow("Invalid status transition from 'pending_payment' to 'used'");
    });

    it('should throw error for transition from cancelled status', async () => {
      mockTicket.status = 'cancelled';

      await expect(
        TicketStatusService.updateTicketStatus('ticket-123', 'active')
      ).rejects.toThrow("Invalid status transition from 'cancelled' to 'active'");
    });

    it('should handle database update error', async () => {
      const dbError = new Error('Database connection failed');
      mockTicket.update.mockRejectedValue(dbError);

      await expect(
        TicketStatusService.updateTicketStatus('ticket-123', 'active')
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle usedList properly for return tickets', async () => {
      // Change ticket status to active first to allow transition to used
      mockTicket.status = 'active';
      mockTicket.usedList = [new Date('2024-01-01')];
      
      const updatedTicket = {
        ...mockTicket,
        status: 'used',
        usedList: [new Date('2024-01-01'), new Date()],
        updatedAt: new Date()
      };
      mockTicket.update.mockResolvedValue(updatedTicket);

      await TicketStatusService.updateTicketStatus('ticket-123', 'used');

      expect(mockTicket.update).toHaveBeenCalledWith({
        status: 'used',
        usedList: [new Date('2024-01-01'), expect.any(Date)],
        updatedAt: expect.any(Date)
      });
    });
  });
});
