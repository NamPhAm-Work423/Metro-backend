const routeStationService = require('../../src/services/routeStation.service');
const routeStationController = require('../../src/controllers/routeStation.controller');

jest.mock('../../src/services/routeStation.service');

describe('routeStation.controller', () => {
  let req, res;

  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('createRouteStation returns 201', async () => {
    const created = { routeStationId: 'rs1' };
    routeStationService.createRouteStation.mockResolvedValue(created);
    req.body = { routeId: 'r1', stationId: 's1', sequence: 1 };
    await routeStationController.createRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'RouteStation created successfully', data: created });
  });

  test('createRouteStation handles 400', async () => {
    routeStationService.createRouteStation.mockRejectedValue(new Error('bad'));
    await routeStationController.createRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getAllRouteStations returns 200', async () => {
    routeStationService.getAllRouteStations.mockResolvedValue([]);
    await routeStationController.getAllRouteStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllRouteStations handles 500', async () => {
    routeStationService.getAllRouteStations.mockRejectedValue(new Error('db'));
    await routeStationController.getAllRouteStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getRouteStationById returns 200', async () => {
    routeStationService.getRouteStationById.mockResolvedValue({ routeStationId: 'rs1' });
    req.params.id = 'rs1';
    await routeStationController.getRouteStationById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRouteStationById handles 404', async () => {
    routeStationService.getRouteStationById.mockRejectedValue(new Error('RouteStation not found'));
    req.params.id = 'x';
    await routeStationController.getRouteStationById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('updateRouteStation returns 200', async () => {
    routeStationService.updateRouteStation.mockResolvedValue({});
    req.params.id = 'rs1';
    await routeStationController.updateRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateRouteStation handles 400', async () => {
    routeStationService.updateRouteStation.mockRejectedValue(new Error('bad'));
    await routeStationController.updateRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteRouteStation returns 200', async () => {
    routeStationService.deleteRouteStation.mockResolvedValue({ message: 'RouteStation deleted successfully' });
    req.params.id = 'rs1';
    await routeStationController.deleteRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteRouteStation handles 400', async () => {
    routeStationService.deleteRouteStation.mockRejectedValue(new Error('bad'));
    await routeStationController.deleteRouteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getStationsByRoute returns 200', async () => {
    routeStationService.getStationsByRoute.mockResolvedValue([]);
    req.params.routeId = 'r1';
    await routeStationController.getStationsByRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStationsByRoute handles 500', async () => {
    routeStationService.getStationsByRoute.mockRejectedValue(new Error('db'));
    await routeStationController.getStationsByRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getRoutesByStation returns 200', async () => {
    routeStationService.getRoutesByStation.mockResolvedValue([]);
    req.params.stationId = 's1';
    await routeStationController.getRoutesByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRoutesByStation handles 500', async () => {
    routeStationService.getRoutesByStation.mockRejectedValue(new Error('db'));
    await routeStationController.getRoutesByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('setupCompleteRoute returns 200', async () => {
    routeStationService.setupCompleteRoute.mockResolvedValue({ message: 'ok', routeStations: [] });
    req.params.routeId = 'r1';
    req.body.stationSequences = [];
    await routeStationController.setupCompleteRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('setupCompleteRoute handles 400', async () => {
    routeStationService.setupCompleteRoute.mockRejectedValue(new Error('bad'));
    await routeStationController.setupCompleteRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getRoutePathWithDetails returns 200', async () => {
    routeStationService.getRoutePathWithDetails.mockResolvedValue({});
    req.params.routeId = 'r1';
    await routeStationController.getRoutePathWithDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getRoutePathWithDetails handles 500', async () => {
    routeStationService.getRoutePathWithDetails.mockRejectedValue(new Error('db'));
    await routeStationController.getRoutePathWithDetails(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('findRoutesBetweenTwoStations returns 200', async () => {
    routeStationService.findRoutesBetweenTwoStations.mockResolvedValue([]);
    req.query = { originStationId: 'a', destinationStationId: 'b' };
    await routeStationController.findRoutesBetweenTwoStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findRoutesBetweenTwoStations handles 500', async () => {
    routeStationService.findRoutesBetweenTwoStations.mockRejectedValue(new Error('db'));
    await routeStationController.findRoutesBetweenTwoStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('validateRouteSequence returns 200', async () => {
    routeStationService.validateRouteSequence.mockResolvedValue({ valid: true });
    req.params.routeId = 'r1';
    await routeStationController.validateRouteSequence(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('validateRouteSequence handles 500', async () => {
    routeStationService.validateRouteSequence.mockRejectedValue(new Error('db'));
    await routeStationController.validateRouteSequence(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
