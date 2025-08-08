const models = require('../../src/models/index.model');
const { RouteStation, Route, Station } = models;
const service = require('../../src/services/routeStation.service');

describe('routeStation.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllRouteStations rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getAllRouteStations({})).rejects.toThrow('db');
  });

  test('getRouteStationById rejects', async () => {
    RouteStation.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.getRouteStationById('x')).rejects.toThrow('db');
  });

  test('getRouteStationById not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(service.getRouteStationById('missing')).rejects.toThrow('RouteStation not found');
  });

  test('updateRouteStation not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(service.updateRouteStation('x', {})).rejects.toThrow('RouteStation not found');
  });

  test('deleteRouteStation not found', async () => {
    RouteStation.findByPk.mockResolvedValue(null);
    await expect(service.deleteRouteStation('x')).rejects.toThrow('RouteStation not found');
  });

  test('getStationsByRoute rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getStationsByRoute('r1')).rejects.toThrow('db');
  });

  test('getRoutesByStation rejects', async () => {
    RouteStation.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getRoutesByStation('s1')).rejects.toThrow('db');
  });

  test('setupCompleteRoute route not found', async () => {
    Route.findByPk.mockResolvedValue(null);
    await expect(service.setupCompleteRoute('r1', [])).rejects.toThrow('Route not found');
  });

  test('setupCompleteRoute station missing', async () => {
    Route.findByPk.mockResolvedValue({ routeId: 'r1' });
    Station.findAll.mockResolvedValue([{ stationId: 's1' }]);
    const payload = [{ stationId: 's1', sequence: 1 }, { stationId: 's2', sequence: 2 }];
    await expect(service.setupCompleteRoute('r1', payload)).rejects.toThrow('One or more stations not found');
  });

  test('validateRouteSequence no stations', async () => {
    RouteStation.findAll.mockResolvedValue([]);
    const result = await service.validateRouteSequence('r1');
    expect(result).toEqual({ valid: false, message: 'No stations found for this route' });
  });

  test('reorderRouteStations mismatched length', async () => {
    RouteStation.findAll.mockResolvedValue([{ routeStationId: 'a' }]);
    await expect(service.reorderRouteStations('r1', [{ routeStationId: 'a', sequence: 1 }, { routeStationId: 'b', sequence: 2 }]))
      .rejects.toThrow('Number of sequences must match existing route stations');
  });
});


