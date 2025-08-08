jest.mock('../../src/services/key.service', () => ({
  generateAPIKeyForUser: jest.fn(),
  getAPIKeysByUserId: jest.fn(),
  deleteAPIKeyById: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const keyService = require('../../src/services/key.service');
const controller = require('../../src/controllers/auth.controller');

function buildApp() {
  const app = express();
  app.get('/key/:id', controller.generateAPIToken);
  app.get('/keys/:userId', controller.getAPIKeyByUser);
  app.delete('/key/:id', controller.deleteKeyById);
  return app;
}

describe('auth.controller', () => {
  test('generateAPIToken returns token', async () => {
    keyService.generateAPIKeyForUser.mockResolvedValue({ token: 't1', keyId: 'k1' });
    const app = buildApp();
    const res = await request(app).get('/key/u1');
    expect(res.status).toBe(200);
    expect(res.body.token).toBe('t1');
  });

  test('getAPIKeyByUser validates userId required', async () => {
    const app = express();
    app.get('/keys/:userId?', controller.getAPIKeyByUser);
    const res = await request(app).get('/keys/');
    expect(res.status).toBe(400);
  });

  test('deleteKeyById 404 when not found', async () => {
    keyService.deleteAPIKeyById.mockResolvedValue(false);
    const app = buildApp();
    const res = await request(app).delete('/key/k404');
    expect(res.status).toBe(404);
  });
});


