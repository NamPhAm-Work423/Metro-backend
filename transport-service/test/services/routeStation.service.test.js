const models = require('../../src/models/index.model');
const { RouteStation, Route, Station } = models;
const routeStationService = require('../../src/services/routeStation.service');

describe('routeStation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createRouteStation creates', async () => {
    const payload = { routeId: 'r1', stationId: 's1', sequence: 1 };
    const created = { routeStationId: 'rs1', ...payload };
    RouteStation.create.mockResolvedValue(created);
    const result = await routeStationService.createRouteStation(payload);
    expect(RouteStation.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('createMultipleRouteStations bulk creates', async () => {
    const payload = [{ routeId: 'r1', stationId: 's1', sequence: 1 }];
    RouteStation.bulkCreate.mockResolvedValue(payload);
    const result = await routeStationService.createMultipleRouteStations(payload);
    expect(RouteStation.bulkCreate).toHaveBeenCalledWith(payload);
    expect(result).toBe(payload);
  });

  test('getAllRouteStations applies filters', async () => {
    await routeStationService.getAllRouteStations({ routeId: 'r1', stationId: 's1' });
    expect(RouteStation.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getRouteStationById returns entity', async () => {
    const entity = { routeStationId: 'rs1' };
    RouteStation.findByPk.mockResolvedValue(entity);
    const result = await routeStationService.getRouteStationById('rs1');
    expect(result).toBe(entity);
  });

  test('updateRouteStation updates entity', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ routeStationId: 'rs1' }) };
    RouteStation.findByPk.mockResolvedValue(instance);
    const result = await routeStationService.updateRouteStation('rs1', { sequence: 2 });
    expect(instance.update).toHaveBeenCalledWith({ sequence: 2 });
    expect(result).toEqual({ routeStationId: 'rs1' });
  });

  test('deleteRouteStation destroys', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    RouteStation.findByPk.mockResolvedValue(instance);
    const result = await routeStationService.deleteRouteStation('rs1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'RouteStation deleted successfully' });
  });

  test('getStationsByRoute maps stations', async () => {
    const rs = [{ routeStationId: 'rs1', sequence: 1, Station: { stationId: 's1' } }];
    RouteStation.findAll.mockResolvedValue(rs);
    const result = await routeStationService.getStationsByRoute('r1');
    expect(result).toEqual([{ routeStationId: 'rs1', sequence: 1, station: { stationId: 's1' } }]);
  });

  test('getRoutesByStation maps routes', async () => {
    const rs = [{ routeStationId: 'rs1', sequence: 1, Route: { routeId: 'r1' } }];
    RouteStation.findAll.mockResolvedValue(rs);
    const result = await routeStationService.getRoutesByStation('s1');
    expect(result).toEqual([{ routeStationId: 'rs1', sequence: 1, route: { routeId: 'r1' } }]);
  });

  test('setupCompleteRoute validates and creates', async () => {
    Route.findByPk = jest.fn().mockResolvedValue({ routeId: 'r1' });
    Station.findAll.mockResolvedValue([{ stationId: 's1' }, { stationId: 's2' }]);
    RouteStation.destroy.mockResolvedValue(1);
    const payload = [{ stationId: 's1', sequence: 1 }, { stationId: 's2', sequence: 2 }];
    RouteStation.bulkCreate.mockResolvedValue(payload);
    const result = await routeStationService.setupCompleteRoute('r1', payload);
    expect(result.message).toMatch(/completed successfully/);
  });

  test('getRoutePathWithDetails returns mapped structure', async () => {
    const route = { 
      routeId: 'r1', name: 'A', originId: 'o', destinationId: 'd', distance: 1, duration: 2, isActive: true,
      stations: [{ sequence: 1, Station: { stationId: 's1' } }]
    };
    models.Route.findByPk = jest.fn().mockResolvedValue(route);
    const result = await routeStationService.getRoutePathWithDetails('r1');
    expect(result.routeInfo.routeId).toBe('r1');
    expect(result.totalStations || result.path.length).toBeDefined();
  });

  test('findRoutesBetweenTwoStations returns details', async () => {
    RouteStation.findAll
      .mockResolvedValueOnce([{ routeId: 'r1', sequence: 1 }])
      .mockResolvedValueOnce([{ routeId: 'r1', sequence: 3 }]);
    models.Route.findAll = jest.fn().mockResolvedValue([
      { stations: [{ stationId: 's1', sequence: 1 }, { stationId: 's2', sequence: 3 }], routeId: 'r1', name: 'A', distance: 1, duration: 1 }
    ]);
    const result = await routeStationService.findRoutesBetweenTwoStations('s1','s2');
    expect(result[0].routeInfo.routeId).toBe('r1');
  });

  test('validateRouteSequence validates consecutive sequences', async () => {
    RouteStation.findAll.mockResolvedValue([{ sequence: 1 }, { sequence: 2 }]);
    const result = await routeStationService.validateRouteSequence('r1');
    expect(result.valid).toBe(true);
  });

  test('reorderRouteStations updates and validates', async () => {
    RouteStation.findAll.mockResolvedValue([{ routeStationId: 'rs1' }, { routeStationId: 'rs2' }]);
    RouteStation.update.mockResolvedValue([1]);
    routeStationService.validateRouteSequence = jest.fn().mockResolvedValue({ valid: true });
    const result = await routeStationService.reorderRouteStations('r1', [{ routeStationId: 'rs1', sequence: 1 }, { routeStationId: 'rs2', sequence: 2 }]);
    expect(result.message).toMatch(/reordered successfully/);
  });
});


