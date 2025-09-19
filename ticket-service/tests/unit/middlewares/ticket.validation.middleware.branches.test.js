const express = require('express');
const request = require('supertest');
const TicketValidationMiddleware = require('../../../src/middlewares/ticket.validation.middleware');

describe('TicketValidationMiddleware', () => {
	let app;
	beforeEach(() => {
		app = express();
		app.get('/tickets', TicketValidationMiddleware.validateGetTicketsByRoutes, (req, res) => {
			res.json({ ok: true, validated: req.validatedQuery });
		});
		app.get('/tickets/paged', TicketValidationMiddleware.validatePagination, (req, res) => {
			res.json({ ok: true, pagination: req.pagination });
		});
	});

	test('400 when routeIds missing', async () => {
		const res = await request(app).get('/tickets');
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('MISSING_ROUTE_IDS');
	});

	test('400 when routeIds empty array', async () => {
		const res = await request(app).get('/tickets').query({ routeIds: '' });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('MISSING_ROUTE_IDS');
	});

	test('400 invalid route id format', async () => {
		const res = await request(app).get('/tickets').query({ routeIds: ',' });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('INVALID_ROUTE_ID_FORMAT');
	});

	test('400 invalid statuses', async () => {
		const res = await request(app).get('/tickets').query({ routeIds: 'r1', statuses: 'bad,active,wrong' });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('INVALID_STATUS_VALUES');
	});

	test('passes with defaults', async () => {
		const res = await request(app).get('/tickets').query({ routeIds: 'r1,r2' });
		expect(res.status).toBe(200);
		expect(res.body.validated.routeIds).toEqual(['r1','r2']);
		expect(res.body.validated.statuses).toBeDefined();
	});

	test('pagination: invalid page', async () => {
		const res = await request(app).get('/tickets/paged').query({ page: '0' });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('INVALID_PAGE_NUMBER');
	});

	test('pagination: invalid limit', async () => {
		const res = await request(app).get('/tickets/paged').query({ limit: '0' });
		expect(res.status).toBe(400);
		expect(res.body.error.code).toBe('INVALID_LIMIT');
	});

	test('pagination: success and sets pagination', async () => {
		const res = await request(app).get('/tickets/paged').query({ page: '2', limit: '10' });
		expect(res.status).toBe(200);
		expect(res.body.pagination).toEqual({ page: 2, limit: 10, offset: 10 });
	});
});
