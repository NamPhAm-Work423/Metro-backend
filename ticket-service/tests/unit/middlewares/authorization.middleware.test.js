const jwt = require('jsonwebtoken');
jest.mock('jsonwebtoken');

const { verifyServiceAuth, authorizeRoles } = require('../../../src/middlewares/authorization');

describe('authorization middleware', () => {
  beforeEach(() => {
    process.env.SERVICE_JWT_SECRET = 'secret';
    jest.clearAllMocks();
  });

  test('rejects missing header', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyServiceAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects invalid token', () => {
    const req = { headers: { 'x-service-auth': 'Bearer tok' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    jwt.verify.mockImplementation(() => { const e = new Error('bad'); e.name = 'JsonWebTokenError'; throw e; });

    verifyServiceAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid token and sets req.user', () => {
    const now = Math.floor(Date.now() / 1000);
    const decoded = { iat: now, userId: 'u1', email: 'e@example.com', roles: ['admin'] };
    jwt.verify.mockReturnValue(decoded);

    const req = { headers: { 'x-service-auth': 'Bearer good' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    verifyServiceAuth(req, res, next);

    expect(req.user).toMatchObject({ id: 'u1', email: 'e@example.com', roles: ['admin'] });
    expect(next).toHaveBeenCalled();
  });

  test('authorizeRoles denies when missing role', () => {
    const mw = authorizeRoles('admin');
    const req = { headers: { 'x-service-auth': 'Bearer good' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    const now = Math.floor(Date.now() / 1000);
    jwt.verify.mockReturnValue({ iat: now, userId: 'u1', email: 'e', roles: ['user'] });

    // run verifyServiceAuth then role check
    mw[0](req, res, next);
    expect(next).toHaveBeenCalled();
    mw[1](req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});


