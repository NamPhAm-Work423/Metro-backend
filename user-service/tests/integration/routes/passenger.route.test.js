const express = require('express');
const request = require('supertest');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
  authorizeRoles: (...roles) => [
    (req, res, next) => {
      req.user = { id: 'test-user', roles: roles };
      next();
    }
  ]
}));

// Mock passenger controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/passenger.controller', () => {
  const mockController = {
    getAllPassengers: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getPassengerById: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    createPassenger: jest.fn((req, res) => res.status(201).json({ success: true, data: { id: 'new-passenger' } })),
    updatePassenger: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    deletePassenger: jest.fn((req, res) => res.status(200).json({ success: true })),
    getMe: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'current-passenger' } })),
    updateMe: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'current-passenger' } })),
    deleteMe: jest.fn((req, res) => res.status(200).json({ success: true })),
    syncPassenger: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Passenger synced' })),
  };
  return mockController;
});

// Re-require mocked controller to access spies
const passengerControllerMock = require('../../../src/controllers/passenger.controller');

const passengerRoutes = require('../../../src/routes/passenger.route');

describe('Passenger Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/passengers', passengerRoutes);

  afterEach(() => jest.clearAllMocks());

  // Admin/Staff management routes
  describe('Admin/Staff Management Routes', () => {
    it('GET /api/passengers/getallPassengers should return 200', async () => {
      const res = await request(app)
        .get('/api/passengers/getallPassengers')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.getAllPassengers).toHaveBeenCalled();
    });

    it('GET /api/passengers/getPassengerById/:id should return 200', async () => {
      const res = await request(app)
        .get('/api/passengers/getPassengerById/123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.getPassengerById).toHaveBeenCalled();
    });

    it('POST /api/passengers/createPassenger should return 201', async () => {
      const res = await request(app)
        .post('/api/passengers/createPassenger')
        .set('Authorization', 'Bearer test')
        .send({ 
          userId: 'user-123',
          fullName: 'John Doe',
          phoneNumber: '1234567890',
          email: 'john@example.com'
        });

      expect(res.statusCode).toBe(201);
      expect(passengerControllerMock.createPassenger).toHaveBeenCalled();
    });

    it('PUT /api/passengers/updatePassenger/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/passengers/updatePassenger/123')
        .set('Authorization', 'Bearer test')
        .send({ fullName: 'John Smith' });

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.updatePassenger).toHaveBeenCalled();
    });

    it('DELETE /api/passengers/deletePassenger/:id should return 200', async () => {
      const res = await request(app)
        .delete('/api/passengers/deletePassenger/123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.deletePassenger).toHaveBeenCalled();
    });
  });

  // Passenger self-service routes
  describe('Passenger Self-Service Routes', () => {
    it('GET /api/passengers/me should return 200', async () => {
      const res = await request(app)
        .get('/api/passengers/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.getMe).toHaveBeenCalled();
    });

    it('PUT /api/passengers/me should return 200', async () => {
      const res = await request(app)
        .put('/api/passengers/me')
        .set('Authorization', 'Bearer test')
        .send({ fullName: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.updateMe).toHaveBeenCalled();
    });

    it('DELETE /api/passengers/me should return 200', async () => {
      const res = await request(app)
        .delete('/api/passengers/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.deleteMe).toHaveBeenCalled();
    });

    it('POST /api/passengers/sync-passenger should return 200', async () => {
      const res = await request(app)
        .post('/api/passengers/sync-passenger')
        .set('Authorization', 'Bearer test')
        .send({ passengerId: '123' });

      expect(res.statusCode).toBe(200);
      expect(passengerControllerMock.syncPassenger).toHaveBeenCalled();
    });
  });
}); 