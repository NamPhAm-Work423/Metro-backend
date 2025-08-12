const request = require('supertest');
const express = require('express');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
  authorizeRoles: (...roles) => [
    (req, res, next) => {
      req.user = { id: 'test-user', roles: roles };
      next();
    }
  ]
}));

const router = require('../../../src/routes/transitPass.route');

describe('TransitPass Controller', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/ticket/transitPasses', router);
  // Attach minimal error handler to return JSON like the real app
  app.use((err, req, res, next) => {
    res.status(500).json({ success: false, message: err.message });
  });

  it('should validate create payload', async () => {
    const res = await request(app)
      .post('/api/v1/ticket/transitPasses/createTransitPass')
      .send({ price: -1 });
    expect(res.status).toBe(500); // validation throws => error handler responds 500 in current pattern
    expect(res.body.success).toBe(false);
  });
});


