const models = require('../../src/models/index.model');
const { Route, RouteStation, Station, Trip } = models;
const routeService = require('../../src/services/route.service');

describe('route.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAllRoutes returns list', async () => {
    const mockList = [{ routeId: 'r1' }, { routeId: 'r2' }];
    Route.findAll.mockResolvedValue(mockList);
    const result = await routeService.getAllRoutes();
    expect(Route.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });

  test('getRouteById returns route', async () => {
    const mock = { routeId: 'r1' };
    Route.findByPk.mockResolvedValue(mock);
    const result = await routeService.getRouteById('r1');
    expect(Route.findByPk).toHaveBeenCalledWith('r1', expect.any(Object));
    expect(result).toBe(mock);
  });

  test('getRouteById throws when not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(routeService.getRouteById('missing')).rejects.toThrow('Route not found');
  });

  test('createRoute calls create', async () => {
    const payload = { name: 'Line A' };
    const created = { routeId: 'r1', ...payload };
    Route.create.mockResolvedValue(created);
    const result = await routeService.createRoute(payload);
    expect(Route.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('updateRoute updates and returns instance', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ routeId: 'r1', name: 'B' }) };
    Route.findByPk.mockResolvedValue(instance);
    const result = await routeService.updateRoute('r1', { name: 'B' });
    expect(Route.findByPk).toHaveBeenCalledWith('r1');
    expect(instance.update).toHaveBeenCalledWith({ name: 'B' });
    expect(result).toEqual({ routeId: 'r1', name: 'B' });
  });

  test('updateRoute throws when not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(routeService.updateRoute('missing', {})).rejects.toThrow('Route not found');
  });

  test('deleteRoute destroys and returns message', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    Route.findByPk.mockResolvedValue(instance);
    const result = await routeService.deleteRoute('r1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Route deleted successfully' });
  });

  test('getActiveRoutes filters by isActive', async () => {
    const mockList = [{ routeId: 'r1', isActive: true }];
    Route.findAll.mockResolvedValue(mockList);
    const result = await routeService.getActiveRoutes();
    expect(Route.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    expect(result).toBe(mockList);
  });

  test('getRoutesByStation queries RouteStation with stationId', async () => {
    const mockList = [{ routeId: 'r1' }];
    Route.findAll.mockResolvedValue(mockList);
    const result = await routeService.getRoutesByStation('s1');
    expect(Route.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.arrayContaining([
        expect.objectContaining({ as: 'stations', where: { stationId: 's1' } })
      ])
    }));
    expect(result).toBe(mockList);
  });

  test('findRoutesBetweenStations builds OR condition', async () => {
    const mockList = [{ routeId: 'r1' }];
    Route.findAll.mockResolvedValue(mockList);
    const result = await routeService.findRoutesBetweenStations('a', 'b');
    expect(Route.findAll).toHaveBeenCalled();
    expect(result).toBe(mockList);
  });

  test('calculateRouteDistance returns distance from route', async () => {
    const instance = { distance: 12.3, duration: 45 };
    Route.findByPk.mockResolvedValue(instance);
    const result = await routeService.calculateRouteDistance('r1');
    expect(result).toEqual({ routeId: 'r1', distance: 12.3, estimatedDuration: 45 });
  });

  test('getAllRoutes applies filters (isActive, name, originId, destinationId)', async () => {
    const mockList = [];
    Route.findAll.mockResolvedValue(mockList);
    const filters = { isActive: true, name: 'Line', originId: 'o1', destinationId: 'd1' };
    await routeService.getAllRoutes(filters);
    expect(Route.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          name: expect.any(Object),
          originId: 'o1',
          destinationId: 'd1',
        }),
      })
    );
  });

  test('createRoute propagates errors', async () => {
    Route.create.mockRejectedValue(new Error('db'));
    await expect(routeService.createRoute({})).rejects.toThrow('db');
  });

  test('getAllRoutes propagates errors', async () => {
    Route.findAll.mockRejectedValue(new Error('db'));
    await expect(routeService.getAllRoutes()).rejects.toThrow('db');
  });

  test('deleteRoute throws when not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(routeService.deleteRoute('missing')).rejects.toThrow('Route not found');
  });

  test('deleteRoute propagates destroy error', async () => {
    const instance = { destroy: jest.fn().mockRejectedValue(new Error('destroy-fail')) };
    Route.findByPk.mockResolvedValue(instance);
    await expect(routeService.deleteRoute('r1')).rejects.toThrow('destroy-fail');
  });

  test('getActiveRoutes propagates errors', async () => {
    Route.findAll.mockRejectedValue(new Error('db'));
    await expect(routeService.getActiveRoutes()).rejects.toThrow('db');
  });

  test('getRoutesByStation propagates errors', async () => {
    Route.findAll.mockRejectedValue(new Error('db'));
    await expect(routeService.getRoutesByStation('s1')).rejects.toThrow('db');
  });

  test('findRoutesBetweenStations propagates errors', async () => {
    Route.findAll.mockRejectedValue(new Error('db'));
    await expect(routeService.findRoutesBetweenStations('a', 'b')).rejects.toThrow('db');
  });

  test('calculateRouteDistance throws when not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(routeService.calculateRouteDistance('missing')).rejects.toThrow('Route not found');
  });

  test('calculateRouteDistance propagates errors', async () => {
    Route.findByPk.mockRejectedValue(new Error('db'));
    await expect(routeService.calculateRouteDistance('r1')).rejects.toThrow('db');
  });
});


