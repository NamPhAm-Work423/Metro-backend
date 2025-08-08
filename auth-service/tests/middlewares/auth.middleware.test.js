jest.mock('../../src/models/index.model', () => ({ User: { findByPk: jest.fn() } }));
jest.mock('../../src/services/key.service', () => ({ validateAPIKey: jest.fn() }));

const jwt = require('jsonwebtoken');
const middleware = require('../../src/middlewares/auth.middleware');
const { User } = require('../../src/models/index.model');
const keyService = require('../../src/services/key.service');

function mockReqRes(headers = {}) {
  const req = { headers, cookies: {}, user: null };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('AuthMiddleware', () => {
  beforeEach(() => jest.resetAllMocks());

  test('authenticate returns 401 when no token', async () => {
    const { req, res, next } = mockReqRes();
    await middleware.authenticate(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Access token is required');
  });

  test('authenticate ok with Bearer token', async () => {
    const token = jwt.sign({ userId: 'u1' }, process.env.JWT_ACCESS_SECRET);
    const { req, res, next } = mockReqRes({ authorization: `Bearer ${token}` });
    User.findByPk.mockResolvedValue({ id: 'u1', email: 'a@b.com', roles: [], isVerified: true, accountLocked: false, isLocked: () => false });
    await middleware.authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('u1');
  });

  test('validateAPIKeyMiddleware 401 when missing header', async () => {
    const { req, res, next } = mockReqRes();
    await middleware.validateAPIKeyMiddleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('API key is required');
  });

  test('validateAPIKeyMiddleware ok when service validates', async () => {
    keyService.validateAPIKey.mockResolvedValue({ userId: 'u2', keyId: 'k1' });
    User.findByPk.mockResolvedValue({ id: 'u2', email: 'b@c.com', roles: [], isVerified: true, accountLocked: false, isLocked: () => false });
    const { req, res, next } = mockReqRes({ 'x-api-key': 'abc' });
    await middleware.validateAPIKeyMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.headers['x-user-id']).toBe('u2');
  });
});


