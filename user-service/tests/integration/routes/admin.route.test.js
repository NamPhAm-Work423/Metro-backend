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

// Mock admin controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/admin.controller', () => {
  const mockController = {
    getAllAdmins: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
    getAdminById: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    updateAdmin: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: req.params.id } })),
    getMe: jest.fn((req, res) => res.status(200).json({ success: true, data: { id: 'current-admin' } })),
  };
  return mockController;
});

// Re-require mocked controller to access spies
const adminControllerMock = require('../../../src/controllers/admin.controller');

const adminRoutes = require('../../../src/routes/admin.route');

describe('Admin Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admins', adminRoutes);

  afterEach(() => jest.clearAllMocks());

  // Admin management routes (super admin only)
  describe('Admin Management Routes', () => {
    it('GET /api/admins/getAllAdmins should return 200', async () => {
      const res = await request(app)
        .get('/api/admins/getAllAdmins')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(adminControllerMock.getAllAdmins).toHaveBeenCalled();
    });

    it('GET /api/admins/getAdminById/:id should return 200', async () => {
      const res = await request(app)
        .get('/api/admins/getAdminById/123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(adminControllerMock.getAdminById).toHaveBeenCalled();
    });

    it('PUT /api/admins/updateAdmin/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/admins/updateAdmin/123')
        .set('Authorization', 'Bearer test')
        .send({ fullName: 'Updated Admin' });

      expect(res.statusCode).toBe(200);
      expect(adminControllerMock.updateAdmin).toHaveBeenCalled();
    });
  });

  // Admin self-service routes
  describe('Admin Self-Service Routes', () => {
    it('GET /api/admins/me should return 200', async () => {
      const res = await request(app)
        .get('/api/admins/me')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(adminControllerMock.getMe).toHaveBeenCalled();
    });
  });
}); 