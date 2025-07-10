const express = require('express');
const request = require('supertest');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
  authorizeRoles: (...roles) => [
    (req, res, next) => {
      req.user = { id: 'test-user', roles: roles };
      req.headers['x-passenger-id'] = 'passenger-123';
      next();
    }
  ]
}));

// Mock ticket controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/ticket.controller', () => {
  const mockController = {
    createShortTermTicket: jest.fn((req, res) => res.status(201).json({ 
      success: true, 
      message: 'Short-term ticket created successfully',
      data: { ticketId: 'ticket-123', ticketType: 'oneway', finalPrice: 25000 }
    })),
    createLongTermTicket: jest.fn((req, res) => res.status(201).json({ 
      success: true, 
      message: 'Long-term ticket created successfully',
      data: { ticketId: 'ticket-124', ticketType: 'monthly_pass', finalPrice: 500000 }
    })),
    getMyTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-1' }] 
    })),
    getMyActiveTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-1', status: 'active' }] 
    })),
    getMyInactiveTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-2', status: 'used' }] 
    })),
    getMyCancelledTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-3', status: 'cancelled' }] 
    })),
    getMyExpiredTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-4', status: 'expired' }] 
    })),
    getTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { ticketId: req.params.id, qrCode: 'qr-code-data' } 
    })),
    cancelTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Ticket cancelled successfully' 
    })),
    getPhoneTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Ticket sent to phone' 
    })),
    getMailTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Ticket sent to email' 
    })),
    validateTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { ticketId: req.params.id, isValid: true } 
    })),
    getTicketDetail: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { ticketId: req.params.id } 
    })),
    updateTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { ticketId: req.params.id } 
    })),
    deleteTicket: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Ticket deleted successfully' 
    })),
    getAllTickets: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [{ ticketId: 'ticket-1' }, { ticketId: 'ticket-2' }] 
    })),
    getTicketStatistics: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { totalTickets: 100, activeTickets: 50 } 
    }))
  };
  return mockController;
});

// Re-require mocked controller to access spies
const ticketControllerMock = require('../../../src/controllers/ticket.controller');

const ticketRoutes = require('../../../src/routes/ticket.route');

describe('Ticket Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/tickets', ticketRoutes);

  afterEach(() => jest.clearAllMocks());

  // Passenger ticket creation routes
  describe('Ticket Creation Routes', () => {
    it('POST /api/tickets/create-short-term should return 201', async () => {
      const res = await request(app)
        .post('/api/tickets/create-short-term')
        .set('Authorization', 'Bearer test')
        .send({
          routeId: 'route-123',
          originStationId: 'station-a',
          destinationStationId: 'station-b',
          tripType: 'Oneway',
          paymentMethod: 'card'
        });

      expect(res.statusCode).toBe(201);
      expect(ticketControllerMock.createShortTermTicket).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketType).toBe('oneway');
    });

    it('POST /api/tickets/create-long-term should return 201', async () => {
      const res = await request(app)
        .post('/api/tickets/create-long-term')
        .set('Authorization', 'Bearer test')
        .send({
          passType: 'monthly_pass',
          paymentMethod: 'card'
        });

      expect(res.statusCode).toBe(201);
      expect(ticketControllerMock.createLongTermTicket).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketType).toBe('monthly_pass');
    });
  });

  // Passenger self-service routes
  describe('Passenger Self-Service Routes', () => {
    it('GET /api/tickets/me should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMyTickets).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
    });

    it('GET /api/tickets/me/unused should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/me/unused')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMyActiveTickets).toHaveBeenCalled();
      expect(res.body.data[0].status).toBe('active');
    });

    it('GET /api/tickets/me/used should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/me/used')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMyInactiveTickets).toHaveBeenCalled();
      expect(res.body.data[0].status).toBe('used');
    });

    it('GET /api/tickets/me/cancelled should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/me/cancelled')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMyCancelledTickets).toHaveBeenCalled();
      expect(res.body.data[0].status).toBe('cancelled');
    });

    it('GET /api/tickets/me/expired should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/me/expired')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMyExpiredTickets).toHaveBeenCalled();
      expect(res.body.data[0].status).toBe('expired');
    });
  });

  // Passenger ticket actions
  describe('Passenger Ticket Actions', () => {
    it('GET /api/tickets/:id/getTicket should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/ticket-123/getTicket')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getTicket).toHaveBeenCalled();
      expect(res.body.data.qrCode).toBe('qr-code-data');
    });

    it('POST /api/tickets/:id/cancel should return 200', async () => {
      const res = await request(app)
        .post('/api/tickets/ticket-123/cancel')
        .set('Authorization', 'Bearer test')
        .send({ reason: 'Change of plans' });

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.cancelTicket).toHaveBeenCalled();
      expect(res.body.message).toBe('Ticket cancelled successfully');
    });

    it('POST /api/tickets/:id/phoneTicket should return 200', async () => {
      const res = await request(app)
        .post('/api/tickets/ticket-123/phoneTicket')
        .set('Authorization', 'Bearer test')
        .send({ phoneNumber: '+1234567890' });

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getPhoneTicket).toHaveBeenCalled();
      expect(res.body.message).toBe('Ticket sent to phone');
    });

    it('POST /api/tickets/:id/mailTicket should return 200', async () => {
      const res = await request(app)
        .post('/api/tickets/ticket-123/mailTicket')
        .set('Authorization', 'Bearer test')
        .send({ email: 'test@example.com' });

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getMailTicket).toHaveBeenCalled();
      expect(res.body.message).toBe('Ticket sent to email');
    });
  });

  // Public/Transit system validation
  describe('Public Validation Routes', () => {
    it('GET /api/tickets/:id/validate should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/ticket-123/validate')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.validateTicket).toHaveBeenCalled();
      expect(res.body.data.isValid).toBe(true);
    });
  });

  // Staff and admin management routes
  describe('Staff and Admin Management Routes', () => {
    it('GET /api/tickets/:id/detail should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/ticket-123/detail')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getTicketDetail).toHaveBeenCalled();
    });

    it('PUT /api/tickets/:id/update should return 200', async () => {
      const res = await request(app)
        .put('/api/tickets/ticket-123/update')
        .set('Authorization', 'Bearer test')
        .send({ status: 'cancelled' });

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.updateTicket).toHaveBeenCalled();
    });

    it('DELETE /api/tickets/:id/delete should return 200', async () => {
      const res = await request(app)
        .delete('/api/tickets/ticket-123/delete')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.deleteTicket).toHaveBeenCalled();
      expect(res.body.message).toBe('Ticket deleted successfully');
    });
  });

  // Admin-only routes
  describe('Admin-Only Routes', () => {
    it('GET /api/tickets/getAllTickets should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/getAllTickets')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getAllTickets).toHaveBeenCalled();
      expect(res.body.data).toHaveLength(2);
    });

    it('GET /api/tickets/getTicketStatistics should return 200', async () => {
      const res = await request(app)
        .get('/api/tickets/getTicketStatistics')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getTicketStatistics).toHaveBeenCalled();
      expect(res.body.data.totalTickets).toBe(100);
    });
  });

  // Test route parameter validation
  describe('Route Parameter Validation', () => {
    it('should handle ticket operations with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .get(`/api/tickets/${validUuid}/getTicket`)
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(ticketControllerMock.getTicket).toHaveBeenCalled();
    });
  });
}); 