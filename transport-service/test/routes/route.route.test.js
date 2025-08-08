const request = require('supertest');
const app = require('../../src/app');
const routeService = require('../../src/services/route.service');

jest.mock('../../src/services/route.service');

describe('route.routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /v1/transport/route returns 200', async () => {
    routeService.getAllRoutes.mockResolvedValue([]);
    const res = await request(app).get('/v1/transport/route');
    expect(res.status).toBe(200);
  });

  test('GET /v1/transport/route/:id returns 200', async () => {
    routeService.getRouteById.mockResolvedValue({ routeId: 'r1' });
    const res = await request(app).get('/v1/transport/route/r1');
    expect(res.status).toBe(200);
  });

  test('POST /v1/transport/route returns 201', async () => {
    routeService.createRoute.mockResolvedValue({ routeId: 'r1' });
    const res = await request(app).post('/v1/transport/route').send({ name: 'A' });
    expect(res.status).toBe(201);
  });
});



