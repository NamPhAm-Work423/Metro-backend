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

  test('findRoutesBetweenTwoStations falls back to shortest path when no common route', async () => {
    // First call (origin): r1 at seq 5
    // Second call (destination): r2 at seq 3 -> no common route
    RouteStation.findAll
      .mockResolvedValueOnce([{ routeId: 'r1', sequence: 5 }])
      .mockResolvedValueOnce([{ routeId: 'r2', sequence: 3 }]);

    const spy = jest.spyOn(routeStationService, 'findShortestPathWithTransfers').mockResolvedValue({ path: [], totalCost: 0, transfers: 0, segments: [] });
    const result = await routeStationService.findRoutesBetweenTwoStations('sA','sB');
    expect(spy).toHaveBeenCalledWith('sA','sB', 2);
    expect(result).toEqual({ shortestPath: { path: [], totalCost: 0, transfers: 0, segments: [] } });
    spy.mockRestore();
  });

  test('findShortestPathWithTransfers returns path and segments', async () => {
    // Build two routes where a transfer is needed: R1: A-B, R2: B-C
    RouteStation.findAll.mockResolvedValue([
      { routeId: 'R1', stationId: 'A', sequence: 1 },
      { routeId: 'R1', stationId: 'B', sequence: 2 },
      { routeId: 'R2', stationId: 'B', sequence: 1 },
      { routeId: 'R2', stationId: 'C', sequence: 2 }
    ]);
    Station.findAll.mockResolvedValue([
      { stationId: 'A', name: 'A' }, { stationId: 'B', name: 'B' }, { stationId: 'C', name: 'C' }
    ]);

    const result = await routeStationService.findShortestPathWithTransfers('A','C', 2);
    expect(result.path.length).toBeGreaterThanOrEqual(2);
    expect(result.segments.length).toBe(2);
    expect(result.transfers).toBe(1);
  });

  test('validateRouteSequence validates consecutive sequences', async () => {
    RouteStation.findAll.mockResolvedValue([{ sequence: 1 }, { sequence: 2 }]);
    const result = await routeStationService.validateRouteSequence('r1');
    expect(result.valid).toBe(true);
  });

  test('reorderRouteStations updates and validates', async () => {
    RouteStation.findAll.mockResolvedValue([{ routeStationId: 'rs1' }, { routeStationId: 'rs2' }]);
    RouteStation.update.mockResolvedValue([1]);
    const validateSpy = jest.spyOn(routeStationService, 'validateRouteSequence').mockResolvedValue({ valid: true });
    const result = await routeStationService.reorderRouteStations('r1', [{ routeStationId: 'rs1', sequence: 1 }, { routeStationId: 'rs2', sequence: 2 }]);
    expect(result.message).toMatch(/reordered successfully/);
    validateSpy.mockRestore();
  });
});

// Error paths (merged from extra2)
describe('routeStation.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllRouteStations rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(routeStationService.getAllRouteStations({})).rejects.toThrow('db');
  });

  test('getRouteStationById rejects', async () => {
    RouteStation.findByPk.mockRejectedValue(new Error('db'));
    await expect(routeStationService.getRouteStationById('x')).rejects.toThrow('db');
  });

  test('getRouteStationById not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(routeStationService.getRouteStationById('missing')).rejects.toThrow('RouteStation not found');
  });

  test('updateRouteStation not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(routeStationService.updateRouteStation('x', {})).rejects.toThrow('RouteStation not found');
  });

  test('deleteRouteStation not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(routeStationService.deleteRouteStation('x')).rejects.toThrow('RouteStation not found');
  });

  test('getStationsByRoute rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(routeStationService.getStationsByRoute('r1')).rejects.toThrow('db');
  });

  test('getRoutesByStation rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(routeStationService.getRoutesByStation('s1')).rejects.toThrow('db');
  });

  test('setupCompleteRoute route not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(routeStationService.setupCompleteRoute('r1', [])).rejects.toThrow('Route not found');
  });

  test('setupCompleteRoute station missing', async () => {
    Route.findByPk.mockResolvedValue({ routeId: 'r1' });
    Station.findAll.mockResolvedValue([{ stationId: 's1' }]);
    const payload = [{ stationId: 's1', sequence: 1 }, { stationId: 's2', sequence: 2 }];
    await expect(routeStationService.setupCompleteRoute('r1', payload)).rejects.toThrow('One or more stations not found');
  });

  test('validateRouteSequence no stations', async () => {
    RouteStation.findAll.mockResolvedValue([]);
    const result = await routeStationService.validateRouteSequence('r1');
    expect(result).toEqual({ valid: false, message: 'No stations found for this route' });
  });

  test('reorderRouteStations mismatched length', async () => {
    RouteStation.findAll.mockResolvedValue([{ routeStationId: 'a' }]);
    await expect(routeStationService.reorderRouteStations('r1', [{ routeStationId: 'a', sequence: 1 }, { routeStationId: 'b', sequence: 2 }]))
      .rejects.toThrow('Number of sequences must match existing route stations');
  });

  test('validateRouteSequence throws on error', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('Database error'));
    await expect(routeStationService.validateRouteSequence('r1')).rejects.toThrow('Database error');
  });

  test('reorderRouteStations throws on error', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('Database error'));
    await expect(routeStationService.reorderRouteStations('r1', [])).rejects.toThrow('Database error');
  });

  test('findShortestPathWithTransfers throws on missing parameters', async () => {
    await expect(routeStationService.findShortestPathWithTransfers('', 's2')).rejects.toThrow('originStationId and destinationStationId are required');
    await expect(routeStationService.findShortestPathWithTransfers('s1', '')).rejects.toThrow('originStationId and destinationStationId are required');
  });

  test('findShortestPathWithTransfers returns empty path when no data', async () => {
    RouteStation.findAll.mockResolvedValue([]);
    const result = await routeStationService.findShortestPathWithTransfers('s1', 's2');
    expect(result).toEqual({ path: [], totalCost: Infinity, transfers: 0, segments: [] });
  });

  test('findShortestPathWithTransfers throws on error', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('Database error'));
    await expect(routeStationService.findShortestPathWithTransfers('s1', 's2')).rejects.toThrow('Database error');
  });
});