const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const { verifyServiceAuth, authorizeRoles } = require('../../../src/middlewares/authorization');

jest.mock('jsonwebtoken');

describe('authorization middleware', () => {
	let app;

	beforeEach(() => {
		process.env.SERVICE_JWT_SECRET = 'test-secret';
		app = express();
		app.get('/protected', verifyServiceAuth, (req, res) => res.json({ ok: true }));
		app.get('/admin', authorizeRoles('admin'), (req, res) => res.json({ ok: true }));
	});

	test('returns 401 when header missing', async () => {
		const res = await request(app).get('/protected');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('MISSING_SERVICE_AUTH');
	});

	test('returns 401 when header format invalid', async () => {
		const res = await request(app).get('/protected').set('x-service-auth', 'Token abc');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('MISSING_SERVICE_AUTH');
	});

	test('returns 401 for invalid token', async () => {
		jwt.verify.mockImplementation(() => { const e = new Error('bad'); e.name = 'JsonWebTokenError'; throw e; });
		const res = await request(app).get('/protected').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('INVALID_SERVICE_TOKEN');
	});

	test('returns 401 for expired token library error', async () => {
		jwt.verify.mockImplementation(() => { const e = new Error('expired'); e.name = 'TokenExpiredError'; throw e; });
		const res = await request(app).get('/protected').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('EXPIRED_SERVICE_TOKEN');
	});

	test('returns 401 for missing secret', async () => {
		delete process.env.SERVICE_JWT_SECRET;
		jwt.verify.mockImplementation(() => ({}));
		const res = await request(app).get('/protected').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(500);
		expect(res.body.error).toBe('SERVICE_AUTH_ERROR');
	});

	test('returns 401 when token too old (>5m)', async () => {
		jwt.verify.mockReturnValue({ iat: Math.floor(Date.now()/1000) - 301, userId: 'u', email: 'e', roles: ['user'] });
		const res = await request(app).get('/protected').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(401);
		expect(res.body.error).toBe('TOKEN_TOO_OLD');
	});

	test('sets req.user and allows when token fresh', async () => {
		jwt.verify.mockReturnValue({ iat: Math.floor(Date.now()/1000), userId: 'u1', email: 'e', roles: ['user'] });
		const res = await request(app).get('/protected').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(200);
		expect(res.body.ok).toBe(true);
	});

	test('authorizeRoles blocks when no user', async () => {
		const app2 = express();
		app2.get('/admin', (req, res, next) => res.status(401).json({ success:false, message: 'Authentication required' }));
		const res = await request(app2).get('/admin');
		expect(res.status).toBe(401);
	});

	test('authorizeRoles denies when missing role', async () => {
		jwt.verify.mockReturnValue({ iat: Math.floor(Date.now()/1000), userId: 'u1', email: 'e', roles: ['user'] });
		const res = await request(app).get('/admin').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(403);
		expect(res.body.message).toBe('Insufficient permissions');
	});

	test('authorizeRoles denies when roles missing on token', async () => {
		jwt.verify.mockReturnValue({ iat: Math.floor(Date.now()/1000), userId: 'u1', email: 'e' });
		const res = await request(app).get('/admin').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(401);
		expect(res.body.message).toBe('Authentication required');
	});

	test('authorizeRoles allows when role present', async () => {
		jwt.verify.mockReturnValue({ iat: Math.floor(Date.now()/1000), userId: 'u1', email: 'e', roles: ['admin'] });
		const res = await request(app).get('/admin').set('x-service-auth', 'Bearer tok');
		expect(res.status).toBe(200);
	});
});
