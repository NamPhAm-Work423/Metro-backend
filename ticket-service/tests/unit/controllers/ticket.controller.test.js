const ticketController = require('../../../src/controllers/ticket.controller');
const ticketService = require('../../../src/services/ticket.service');

// Mock dependent modules
jest.mock('../../../src/services/ticket.service');
jest.mock('../../../src/helpers/errorHandler.helper', () => (fn) => fn);
jest.mock('../../../src/services/ticket/calculators/TicketPriceCalculator', () => ({
  calculateTotalPriceForPassengers: jest.fn()
}));
jest.mock('../../../src/models/index.model', () => ({
  Ticket: { findOne: jest.fn() }
}));

const TicketPriceCalculator = require('../../../src/services/ticket/calculators/TicketPriceCalculator');
const { Ticket } = require('../../../src/models/index.model');

describe('Ticket Controller', () => {
  let req, res, next;
  let originalFetch;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      headers: { 'x-passenger-id': 'passenger-123' },
      user: { id: 'user-1' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    // Mock passenger cache helper on controller instance
    ticketController._getPassengerFromCache = jest.fn().mockResolvedValue({
      passengerId: 'passenger-123',
      passenger: { passengerId: 'passenger-123', userId: 'user-1' }
    });

    jest.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('createShortTermTicket', () => {
    it('should create ticket and return payment ready data when paymentResponse exists', async () => {
      const mockResult = {
        ticket: { ticketId: 't1' },
        paymentId: 'p1',
        paymentResponse: { paymentUrl: 'http://pay', paymentMethod: 'paypal', paypalOrderId: 'o1' }
      };
      ticketService.createShortTermTicket.mockResolvedValue(mockResult);

      await ticketController.createShortTermTicket(req, res, next);

      expect(ticketService.createShortTermTicket).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ payment: expect.objectContaining({ status: 'ready' }) }) })
      );
    });

    it('should create ticket and return payment processing when paymentResponse missing', async () => {
      const mockResult = { ticket: { ticketId: 't1' }, paymentId: 'p1' };
      ticketService.createShortTermTicket.mockResolvedValue(mockResult);

      await ticketController.createShortTermTicket(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ payment: expect.objectContaining({ status: 'processing' }) }) })
      );
    });
  });

  describe('createLongTermTicket', () => {
    it('should create long term ticket with payment ready', async () => {
      const mockResult = {
        ticket: { ticketId: 't2' },
        paymentId: 'p2',
        paymentResponse: { paymentUrl: 'http://pay2', paymentMethod: 'paypal', paypalOrderId: 'o2' }
      };
      ticketService.createLongTermTicket.mockResolvedValue(mockResult);

      await ticketController.createLongTermTicket(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ payment: expect.objectContaining({ status: 'ready' }) }) })
      );
    });
  });

  describe('list and detail', () => {
    it('getAllTickets returns list', async () => {
      ticketService.getAllTickets.mockResolvedValue([{ ticketId: 'a' }]);
      await ticketController.getAllTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
    });

    it('getTicketById returns 404 when missing', async () => {
      req.params.id = 'missing';
      ticketService.getTicketById.mockResolvedValue(null);
      await ticketController.getTicketById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Ticket not found' });
    });

    it('getTicketById returns ticket', async () => {
      req.params.id = 't1';
      ticketService.getTicketById.mockResolvedValue({ ticketId: 't1' });
      await ticketController.getTicketById(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('self-service lists', () => {
    it('getMyTickets returns tickets', async () => {
      ticketService.getTicketsByPassenger.mockResolvedValue([{ ticketId: 'm1' }]);
      await ticketController.getMyTickets(req, res, next);
      expect(ticketController._getPassengerFromCache).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getMyActiveTickets returns active tickets', async () => {
      ticketService.getActiveTicketsByPassenger.mockResolvedValue([{ ticketId: 'a1' }]);
      await ticketController.getMyActiveTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getMyInactiveTickets returns used tickets', async () => {
      ticketService.getInactiveTicketsByPassenger = jest.fn().mockResolvedValue([{ ticketId: 'u1' }]);
      await ticketController.getMyInactiveTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getMyCancelledTickets returns cancelled tickets', async () => {
      ticketService.getCancelledTicketsByPassenger = jest.fn().mockResolvedValue([{ ticketId: 'c1' }]);
      await ticketController.getMyCancelledTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getMyExpiredTickets returns expired tickets', async () => {
      ticketService.getExpiredTicketsByPassenger = jest.fn().mockResolvedValue([{ ticketId: 'e1' }]);
      await ticketController.getMyExpiredTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('ticket actions', () => {
    it('getTicket returns ticket with QR', async () => {
      req.params.id = 't1';
      ticketService.getTicketWithQR.mockResolvedValue({ ticketId: 't1', qrCode: 'qr' });
      await ticketController.getTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('cancelTicket works', async () => {
      req.params.id = 't1';
      req.body.reason = 'test';
      ticketService.cancelTicket.mockResolvedValue({ ticketId: 't1', status: 'cancelled' });
      await ticketController.cancelTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getPhoneTicket works', async () => {
      req.params.id = 't1';
      req.body.phoneNumber = '+84123456';
      ticketService.sendTicketToPhone.mockResolvedValue({ ok: true });
      await ticketController.getPhoneTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getMailTicket works', async () => {
      req.params.id = 't1';
      req.body.email = 'a@b.com';
      ticketService.sendTicketToEmail.mockResolvedValue({ ok: true });
      await ticketController.getMailTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('validation and stats', () => {
    it('validateTicket returns result', async () => {
      req.params.id = 't1';
      ticketService.validateTicket.mockResolvedValue({ isValid: true });
      await ticketController.validateTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('getTicketDetail returns 404 when missing', async () => {
      req.params.id = 't1';
      ticketService.getTicketDetail = jest.fn().mockResolvedValue(null);
      await ticketController.getTicketDetail(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('getTicketStatistics returns stats', async () => {
      ticketService.getTicketStatistics.mockResolvedValue({ total: 1 });
      await ticketController.getTicketStatistics(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('expireTickets returns count', async () => {
      ticketService.expireTickets.mockResolvedValue(3);
      await ticketController.expireTickets(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('update and delete', () => {
    it('updateTicket returns updated ticket', async () => {
      req.params.id = 't1';
      req.body = { status: 'used' };
      ticketService.updateTicket.mockResolvedValue({ ticketId: 't1', status: 'used' });
      await ticketController.updateTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deleteTicket returns success', async () => {
      req.params.id = 't1';
      ticketService.deleteTicket = jest.fn().mockResolvedValue();
      await ticketController.deleteTicket(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('payment endpoints', () => {
    it('getTicketPayment returns payment info', async () => {
      req.params.id = 't1';
      ticketService.getTicketById.mockResolvedValue({ ticketId: 't1', passengerId: 'p1', totalPrice: 100 });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: { paymentId: 'pmt1', paymentUrl: 'http://pay' } })
      });

      await ticketController.getTicketPayment(req, res, next);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('getTicketPayment returns 404 if ticket not found', async () => {
      req.params.id = 't-missing';
      ticketService.getTicketById.mockResolvedValue(null);

      await ticketController.getTicketPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Ticket not found' });
    });

    it('getTicketPayment returns 404 if payment not found', async () => {
      req.params.id = 't1';
      ticketService.getTicketById.mockResolvedValue({ ticketId: 't1' });
      global.fetch = jest.fn().mockResolvedValue({ ok: false });

      await ticketController.getTicketPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Payment not found for this ticket' });
    });

    it('getTicketPayment returns 500 on fetch error', async () => {
      req.params.id = 't1';
      ticketService.getTicketById.mockResolvedValue({ ticketId: 't1' });
      global.fetch = jest.fn().mockRejectedValue(new Error('network'));

      await ticketController.getTicketPayment(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Failed to get payment information' });
    });

    it('getPaymentStatus returns ready when paymentUrl present', async () => {
      req.params.paymentId = 'p1';
      ticketService.getTicketByPaymentId.mockResolvedValue({ paymentId: 'p1', paymentUrl: 'http://pay', paymentMethod: 'paypal', paypalOrderId: 'o1' });
      await ticketController.getPaymentStatus(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ready' }) }));
    });

    it('getPaymentStatus returns processing when paymentUrl missing', async () => {
      req.params.paymentId = 'p2';
      ticketService.getTicketByPaymentId.mockResolvedValue({ paymentId: 'p2' });
      await ticketController.getPaymentStatus(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'processing' }) }));
    });

    it('getPaymentStatus returns 404 when ticket not found', async () => {
      req.params.paymentId = 'p-missing';
      ticketService.getTicketByPaymentId.mockResolvedValue(null);
      await ticketController.getPaymentStatus(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Ticket not found' });
    });
  });

  describe('calculateTicketPrice', () => {
    it('should calculate price via calculator', async () => {
      req.body = { fromStation: 'A', toStation: 'B', tripType: 'Oneway', numAdults: 1 };
      TicketPriceCalculator.calculateTotalPriceForPassengers.mockResolvedValue({ success: true, finalPrice: 100 });

      await ticketController.calculateTicketPrice(req, res, next);
      expect(TicketPriceCalculator.calculateTotalPriceForPassengers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, finalPrice: 100 });
    });

    it('should return 400 if missing required params', async () => {
      req.body = { fromStation: null, toStation: null };
      await ticketController.calculateTicketPrice(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('passenger cache failures', () => {
    it('createShortTermTicket propagates error when passenger cache missing', async () => {
      ticketController._getPassengerFromCache = jest.fn().mockRejectedValue(new Error('Passenger not found in cache. Please sync your passenger profile or authenticate again.'));
      await expect(ticketController.createShortTermTicket(req, res, next)).rejects.toThrow('Passenger not found in cache');
    });

    it('createLongTermTicket propagates error when passenger cache missing', async () => {
      ticketController._getPassengerFromCache = jest.fn().mockRejectedValue(new Error('Passenger not found in cache. Please sync your passenger profile or authenticate again.'));
      await expect(ticketController.createLongTermTicket(req, res, next)).rejects.toThrow('Passenger not found in cache');
    });
  });
});

