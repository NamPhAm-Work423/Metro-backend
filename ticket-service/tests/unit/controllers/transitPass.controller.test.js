const request = require('supertest');
const express = require('express');

const router = require('../../../src/routes/transitPass.route');

describe('TransitPass Controller', () => {
  const app = express();
  app.use(express.json());
  // inject dummy auth middleware bypass
  app.use((req, res, next) => { req.user = { roles: ['admin'] }; next(); });
  app.use('/api/v1/ticket/transitPasses', router);

  it('should validate create payload', async () => {
    const res = await request(app)
      .post('/api/v1/ticket/transitPasses/createTransitPass')
      .send({ price: -1 });
    expect(res.status).toBe(500); // validation throws => error handler responds 500 in current pattern
    expect(res.body.success).toBe(false);
  });
});


