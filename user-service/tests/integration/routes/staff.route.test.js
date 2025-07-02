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

// Mock staff controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/staff.controller', () => {
  const mockController = {
    getAllStaff: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getStaffById: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    createStaff: jest.fn((req, res) => res.status(201).json({ success: true, data: { id: 'new-staff' } })),
    updateStaff: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    deleteStaff: jest.fn((req, res) => res.status(200).json({ success: true })),
    updateStaffStatus: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    getMe: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'current-staff' } })),
    updateMe: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'current-staff' } })),
    deleteMe: jest.fn((req, res) => res.status(200).json({ success: true })),
  };
  return mockController;
});

// Re-require mocked controller to access spies
const staffControllerMock = require('../../../src/controllers/staff.controller');

const staffRoutes = require('../../../src/routes/staff.route');

describe('Staff Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/staff', staffRoutes);

  afterEach(() => jest.clearAllMocks());

  // Admin/Staff management routes
  describe('Admin/Staff Management Routes', () => {
    it('GET /api/staff/getAllStaff should return 200', async () => {
      const res = await request(app)
        .get('/api/staff/getAllStaff')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.getAllStaff).toHaveBeenCalled();
    });

    it('GET /api/staff/getStaffById/:id should return 200', async () => {
      const res = await request(app)
        .get('/api/staff/getStaffById/123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.getStaffById).toHaveBeenCalled();
    });

    it('POST /api/staff/createStaff should return 201', async () => {
      const res = await request(app)
        .post('/api/staff/createStaff')
        .set('Authorization', 'Bearer test')
        .send({ 
          userId: 'user-123',
          fullName: 'John Staff',
          employeeId: 'EMP001',
          department: 'IT',
          position: 'Developer'
        });

      expect(res.statusCode).toBe(201);
      expect(staffControllerMock.createStaff).toHaveBeenCalled();
    });

    it('PUT /api/staff/updateStaff/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/staff/updateStaff/123')
        .set('Authorization', 'Bearer test')
        .send({ position: 'Senior Developer' });

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.updateStaff).toHaveBeenCalled();
    });

    it('DELETE /api/staff/deleteStaff/:id should return 200', async () => {
      const res = await request(app)
        .delete('/api/staff/deleteStaff/123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.deleteStaff).toHaveBeenCalled();
    });

    it('PUT /api/staff/updateStaffStatus/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/staff/updateStaffStatus/123')
        .set('Authorization', 'Bearer test')
        .send({ isActive: false });

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.updateStaffStatus).toHaveBeenCalled();
    });
  });

  // Staff self-service routes
  describe('Staff Self-Service Routes', () => {
    it('GET /api/staff/me should return 200', async () => {
      const res = await request(app)
        .get('/api/staff/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.getMe).toHaveBeenCalled();
    });

    it('PUT /api/staff/me should return 200', async () => {
      const res = await request(app)
        .put('/api/staff/me')
        .set('Authorization', 'Bearer test')
        .send({ fullName: 'Updated Staff Name' });

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.updateMe).toHaveBeenCalled();
    });

    it('DELETE /api/staff/me should return 200', async () => {
      const res = await request(app)
        .delete('/api/staff/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(staffControllerMock.deleteMe).toHaveBeenCalled();
    });
  });
}); 