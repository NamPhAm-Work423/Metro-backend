jest.mock('../../../../src/grpc/transportClient', () => ({
  getAllRoutes: jest.fn(),
  getRouteStations: jest.fn(),
  getRoutesByStations: jest.fn(),
  calculateStationCount: jest.fn()
}));

jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

const TransportClient = require('../../../../src/grpc/transportClient');
const StationService = require('../../../../src/services/fare/services/StationService');

describe('StationService', () => {
  let service;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new StationService();
  });

  test('findRoutesContainingStation returns routes that include station', async () => {
    TransportClient.getAllRoutes.mockResolvedValue({ routes: [{ routeId: 'r1' }, { routeId: 'r2' }] });
    TransportClient.getRouteStations.mockResolvedValueOnce({ routeStations: [{ stationId: 'S', sequence: 1 }] });
    TransportClient.getRouteStations.mockResolvedValueOnce({ routeStations: [{ stationId: 'X', sequence: 1 }] });
    const res = await service.findRoutesContainingStation('S');
    expect(res.length).toBe(1);
    expect(res[0].routeId).toBe('r1');
  });

  test('findRoutesContainingStation handles outer error and returns []', async () => {
    TransportClient.getAllRoutes.mockRejectedValueOnce(new Error('grpc')); 
    const res = await service.findRoutesContainingStation('S');
    expect(res).toEqual([]);
  });

  test('getRouteStations returns list or throws', async () => {
    TransportClient.getRouteStations.mockResolvedValueOnce({ routeStations: [{ stationId: 'A' }] });
    const ok = await service.getRouteStations('r1');
    expect(ok[0].stationId).toBe('A');

    TransportClient.getRouteStations.mockRejectedValueOnce(new Error('boom'));
    await expect(service.getRouteStations('r2')).rejects.toThrow('boom');
  });

  test('getAllRoutes returns list or throws', async () => {
    TransportClient.getAllRoutes.mockResolvedValueOnce({ routes: [{ routeId: 'r1' }] });
    const ok = await service.getAllRoutes();
    expect(ok[0].routeId).toBe('r1');

    TransportClient.getAllRoutes.mockRejectedValueOnce(new Error('bad'));
    await expect(service.getAllRoutes()).rejects.toThrow('bad');
  });

  test('getRoutesByStations returns response or throws', async () => {
    TransportClient.getRoutesByStations.mockResolvedValueOnce({ routes: [{ routeId: 'rX' }] });
    const ok = await service.getRoutesByStations('S1', 'S2');
    expect(ok.routes[0].routeId).toBe('rX');

    TransportClient.getRoutesByStations.mockRejectedValueOnce(new Error('fail'));
    await expect(service.getRoutesByStations('S1', 'S2')).rejects.toThrow('fail');
  });

  test('calculateStationCount follows direct->fallback->final fallback logic', async () => {
    // Start with default route id so it tries getRoutesByStations
    TransportClient.getRoutesByStations.mockResolvedValueOnce({ routes: [{ routeId: 'rFound' }] });
    // First direct count fails, then route stations calculation works
    TransportClient.calculateStationCount.mockRejectedValueOnce(new Error('no direct'));
    TransportClient.getRouteStations.mockResolvedValueOnce({ routeStations: [ { stationId: 'S1', sequence: 1 }, { stationId: 'S2', sequence: 5 } ] });
    const count = await service.calculateStationCount('default-route-001', 'S1', 'S2');
    expect(count).toBe(4);

    // Final catch fallback: allow route lookup to succeed, but fail both direct and routeStations calls
    TransportClient.getRoutesByStations.mockResolvedValueOnce({ routes: [{ routeId: 'rFound2' }] });
    TransportClient.calculateStationCount.mockRejectedValueOnce(new Error('no direct again'));
    TransportClient.getRouteStations.mockRejectedValueOnce(new Error('no stations'));
    const count2 = await service.calculateStationCount('default-route-001', 'A', 'A');
    expect(count2).toBe(1);
  });
});


