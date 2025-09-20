const models = require('../../src/models/index.model');
const routeService = require('../../src/services/route.service');
const routeController = require('../../src/controllers/route.controller');

jest.mock('../../src/services/route.service');

describe('route.controller', () => {
  let req, res;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('getAllRoutes returns 200 with data', async () => {
    const data = [{ routeId: 'r1' }];
    routeService.getAllRoutes.mockResolvedValue(data);
    await routeController.getAllRoutes(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data });
  });

  test('getAllRoutes handles error 500', async () => {
    routeService.getAllRoutes.mockRejectedValue(new Error('db'));
    await routeController.getAllRoutes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getRouteById returns 200 with route', async () => {
    const route = { routeId: 'r1' };
    routeService.getRouteById.mockResolvedValue(route);
    req.params.id = 'r1';
    await routeController.getRouteById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: route });
  });

  test('getRouteById handles 404', async () => {
    routeService.getRouteById.mockRejectedValue(new Error('Route not found'));
    req.params.id = 'x';
    await routeController.getRouteById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createRoute returns 201', async () => {
    const created = { routeId: 'r1' };
    routeService.createRoute.mockResolvedValue(created);
    req.body = { name: 'Line A' };
    await routeController.createRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Route created successfully', data: created });
  });

  test('createRoute handles 400', async () => {
    routeService.createRoute.mockRejectedValue(new Error('invalid'));
    await routeController.createRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateRoute returns 200', async () => {
    const updated = { routeId: 'r1' };
    routeService.updateRoute.mockResolvedValue(updated);
    req.params.id = 'r1';
    req.body = { name: 'B' };
    await routeController.updateRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Route updated successfully', data: updated });
  });

  test('updateRoute handles 400', async () => {
    routeService.updateRoute.mockRejectedValue(new Error('bad'));
    await routeController.updateRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteRoute returns 200', async () => {
    routeService.deleteRoute.mockResolvedValue({ message: 'ok' });
    req.params.id = 'r1';
    await routeController.deleteRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteRoute handles 400', async () => {
    routeService.deleteRoute.mockRejectedValue(new Error('bad'));
    await routeController.deleteRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getActiveRoutes returns 200', async () => {
    routeService.getActiveRoutes.mockResolvedValue([]);
    await routeController.getActiveRoutes(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getActiveRoutes handles 500 error', async () => {
    routeService.getActiveRoutes.mockRejectedValue(new Error('Database error'));
    await routeController.getActiveRoutes(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getRoutesByStation returns 200', async () => {
    routeService.getRoutesByStation.mockResolvedValue([]);
    req.params.stationId = 's1';
    await routeController.getRoutesByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRoutesByStation handles 500', async () => {
    routeService.getRoutesByStation.mockRejectedValue(new Error('db'));
    await routeController.getRoutesByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('findRoutesBetweenStations returns 200', async () => {
    routeService.findRoutesBetweenStations.mockResolvedValue([]);
    req.query = { originId: 'a', destinationId: 'b' };
    await routeController.findRoutesBetweenStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findRoutesBetweenStations handles 500', async () => {
    routeService.findRoutesBetweenStations.mockRejectedValue(new Error('db'));
    await routeController.findRoutesBetweenStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('calculateRouteDistance returns 200', async () => {
    routeService.calculateRouteDistance.mockResolvedValue({ distance: 1 });
    req.params.id = 'r1';
    await routeController.calculateRouteDistance(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('calculateRouteDistance handles 500', async () => {
    routeService.calculateRouteDistance.mockRejectedValue(new Error('db'));
    await routeController.calculateRouteDistance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});



