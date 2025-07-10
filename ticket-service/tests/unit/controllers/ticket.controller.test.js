const ticketController = require('../../../src/controllers/ticket.controller');
const ticketService = require('../../../src/services/ticket.service');
const passengerCacheService = require('../../../src/services/passengerCache.service');

// Mock ticket service
jest.mock('../../../src/services/ticket.service');
jest.mock('../../../src/services/passengerCache.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Ticket Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { id: 'test-user-id' },
      headers: { 'x-passenger-id': 'passenger-123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createShortTermTicket', () => {
    beforeEach(() => {
      passengerCacheService.getPassenger.mockResolvedValue({
        passengerId: 'passenger-123',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01'
      });
    });

    it('should create short-term ticket successfully', async () => {
      const mockTicket = {
        ticketId: 'ticket-123',
        ticketType: 'oneway',
        finalPrice: 25000,
        originStationId: 'station-a',
        destinationStationId: 'station-b',
        stationCount: 3
      };
      
      req.body = {
        routeId: 'route-123',
        originStationId: 'station-a',
        destinationStationId: 'station-b',
        tripType: 'Oneway',
        paymentMethod: 'card'
      };

      ticketService.createShortTermTicket.mockResolvedValue(mockTicket);

      await ticketController.createShortTermTicket(req, res, next);

      expect(passengerCacheService.getPassenger).toHaveBeenCalledWith('passenger-123');
      expect(ticketService.createShortTermTicket).toHaveBeenCalledWith({
        ...req.body,
        passengerId: 'passenger-123',
        passengerInfo: expect.any(Object)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket created successfully',
        data: mockTicket
      });
    });

    it('should create return ticket successfully', async () => {
      const mockTicket = {
        ticketId: 'ticket-124',
        ticketType: 'return',
        finalPrice: 37500,
        originStationId: 'station-a',
        destinationStationId: 'station-b',
        stationCount: 3
      };
      
      req.body = {
        routeId: 'route-123',
        originStationId: 'station-a',
        destinationStationId: 'station-b',
        tripType: 'Return',
        paymentMethod: 'card'
      };

      ticketService.createShortTermTicket.mockResolvedValue(mockTicket);

      await ticketController.createShortTermTicket(req, res, next);

      expect(ticketService.createShortTermTicket).toHaveBeenCalledWith({
        ...req.body,
        passengerId: 'passenger-123',
        passengerInfo: expect.any(Object)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket created successfully',
        data: mockTicket
      });
    });

    it('should handle passenger not found in cache', async () => {
      passengerCacheService.getPassenger.mockResolvedValue(null);
      
      req.body = {
        routeId: 'route-123',
        originStationId: 'station-a',
        destinationStationId: 'station-b',
        tripType: 'Oneway'
      };

      await expect(ticketController.createShortTermTicket(req, res, next))
        .rejects
        .toThrow('Passenger not found in cache. Please authenticate again.');
    });

    it('should handle missing passenger ID', async () => {
      req.headers = {}; // No passenger ID in headers
      
      await expect(ticketController.createShortTermTicket(req, res, next))
        .rejects
        .toThrow('Passenger ID not found in request');
    });
  });

  describe('createLongTermTicket', () => {
    beforeEach(() => {
      passengerCacheService.getPassenger.mockResolvedValue({
        passengerId: 'passenger-123',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01'
      });
    });

    it('should create monthly pass successfully', async () => {
      const mockTicket = {
        ticketId: 'ticket-125',
        ticketType: 'monthly_pass',
        finalPrice: 500000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      req.body = {
        passType: 'monthly_pass',
        paymentMethod: 'card'
      };

      ticketService.createLongTermTicket.mockResolvedValue(mockTicket);

      await ticketController.createLongTermTicket(req, res, next);

      expect(ticketService.createLongTermTicket).toHaveBeenCalledWith({
        ...req.body,
        passengerId: 'passenger-123',
        passengerInfo: expect.any(Object)
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket created successfully',
        data: mockTicket
      });
    });

    it('should create yearly pass successfully', async () => {
      const mockTicket = {
        ticketId: 'ticket-126',
        ticketType: 'yearly_pass',
        finalPrice: 5000000,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      };
      
      req.body = {
        passType: 'yearly_pass',
        paymentMethod: 'card'
      };

      ticketService.createLongTermTicket.mockResolvedValue(mockTicket);

      await ticketController.createLongTermTicket(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket created successfully',
        data: mockTicket
      });
    });
  });

  describe('getMyTickets', () => {
    beforeEach(() => {
      passengerCacheService.getPassenger.mockResolvedValue({
        passengerId: 'passenger-123'
      });
    });

    it('should return my tickets successfully', async () => {
      const mockTickets = [
        { ticketId: 'ticket-1', ticketType: 'oneway', status: 'active' },
        { ticketId: 'ticket-2', ticketType: 'monthly_pass', status: 'active' }
      ];

      ticketService.getTicketsByPassenger.mockResolvedValue(mockTickets);

      await ticketController.getMyTickets(req, res, next);

      expect(ticketService.getTicketsByPassenger).toHaveBeenCalledWith('passenger-123', {});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'My tickets retrieved successfully',
        data: mockTickets,
        count: 2
      });
    });

    it('should pass filters to service', async () => {
      req.query = { status: 'active', ticketType: 'oneway' };
      ticketService.getTicketsByPassenger.mockResolvedValue([]);

      await ticketController.getMyTickets(req, res, next);

      expect(ticketService.getTicketsByPassenger).toHaveBeenCalledWith('passenger-123', req.query);
    });
  });

  describe('getMyActiveTickets', () => {
    beforeEach(() => {
      passengerCacheService.getPassenger.mockResolvedValue({
        passengerId: 'passenger-123'
      });
    });

    it('should return active tickets successfully', async () => {
      const mockTickets = [
        { ticketId: 'ticket-1', status: 'active' }
      ];

      ticketService.getActiveTicketsByPassenger.mockResolvedValue(mockTickets);

      await ticketController.getMyActiveTickets(req, res, next);

      expect(ticketService.getActiveTicketsByPassenger).toHaveBeenCalledWith('passenger-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'My active tickets retrieved successfully',
        data: mockTickets,
        count: 1
      });
    });
  });

  describe('cancelTicket', () => {
    beforeEach(() => {
      passengerCacheService.getPassenger.mockResolvedValue({
        passengerId: 'passenger-123'
      });
    });

    it('should cancel ticket successfully', async () => {
      const mockTicket = {
        ticketId: 'ticket-123',
        status: 'cancelled'
      };
      
      req.params.id = 'ticket-123';
      req.body.reason = 'Change of plans';

      ticketService.cancelTicket.mockResolvedValue(mockTicket);

      await ticketController.cancelTicket(req, res, next);

      expect(ticketService.cancelTicket).toHaveBeenCalledWith('ticket-123', 'Change of plans', 'passenger-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket cancelled successfully',
        data: mockTicket
      });
    });
  });

  describe('validateTicket', () => {
    it('should validate ticket successfully', async () => {
      const mockValidation = {
        ticketId: 'ticket-123',
        isValid: true,
        canBoard: true
      };
      
      req.params.id = 'ticket-123';
      ticketService.validateTicket.mockResolvedValue(mockValidation);

      await ticketController.validateTicket(req, res, next);

      expect(ticketService.validateTicket).toHaveBeenCalledWith('ticket-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket validation completed',
        data: mockValidation
      });
    });
  });

  describe('getTicketStatistics', () => {
    it('should return ticket statistics successfully', async () => {
      const mockStats = {
        totalTickets: 150,
        activeTickets: 50,
        cancelledTickets: 10,
        expiredTickets: 90,
        revenueByType: {
          oneway: 1000000,
          return: 750000,
          monthly_pass: 5000000
        }
      };

      ticketService.getTicketStatistics.mockResolvedValue(mockStats);

      await ticketController.getTicketStatistics(req, res, next);

      expect(ticketService.getTicketStatistics).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Ticket statistics retrieved successfully',
        data: mockStats
      });
    });
  });

  describe('getAllTickets', () => {
    it('should return all tickets successfully', async () => {
      const mockTickets = [
        { ticketId: 'ticket-1', passengerId: 'passenger-1' },
        { ticketId: 'ticket-2', passengerId: 'passenger-2' }
      ];

      ticketService.getAllTickets.mockResolvedValue(mockTickets);

      await ticketController.getAllTickets(req, res, next);

      expect(ticketService.getAllTickets).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Tickets retrieved successfully',
        data: mockTickets,
        count: 2
      });
    });

    it('should pass filters to service', async () => {
      req.query = { status: 'active', passengerId: 'passenger-123' };
      ticketService.getAllTickets.mockResolvedValue([]);

      await ticketController.getAllTickets(req, res, next);

      expect(ticketService.getAllTickets).toHaveBeenCalledWith(req.query);
    });
  });
}); 