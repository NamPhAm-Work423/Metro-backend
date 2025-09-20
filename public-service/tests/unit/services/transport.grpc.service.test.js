const TransportGrpcService = require('../../../src/services/transport.grpc.service');

// Mock publicClient
jest.mock('../../../src/grpc/publicClient', () => ({
  callTransport: jest.fn()
}));

const { callTransport } = require('../../../src/grpc/publicClient');

describe('Transport gRPC Service', () => {
  let transportService;

  beforeEach(() => {
    // Mock environment variables
    process.env.TRANSPORT_GRPC_URL = 'localhost:50051';

    transportService = new TransportGrpcService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize gRPC client successfully', () => {
      expect(transportService).toBeDefined();
      expect(transportService.fetchAllRoutes).toBeDefined();
      expect(transportService.fetchAllTransportData).toBeDefined();
      expect(transportService.fetchRouteStations).toBeDefined();
    });
  });

  describe('fetchAllRoutes', () => {
    it('should fetch all routes successfully', async () => {
      const mockRoutes = [
        { routeId: 'R1', routeName: 'Route 1', color: '#FF0000' },
        { routeId: 'R2', routeName: 'Route 2', color: '#00FF00' }
      ];
      callTransport.mockResolvedValue({ routes: mockRoutes });

      const result = await transportService.fetchAllRoutes();

      expect(callTransport).toHaveBeenCalledWith('ListRoutes', {});
      expect(result).toEqual(mockRoutes);
    });

    it('should handle empty routes response', async () => {
      callTransport.mockResolvedValue({});

      const result = await transportService.fetchAllRoutes();

      expect(result).toEqual([]);
    });

    it('should handle gRPC errors when fetching routes', async () => {
      const error = new Error('Service unavailable');
      callTransport.mockRejectedValue(error);

      await expect(transportService.fetchAllRoutes()).rejects.toThrow('Failed to fetch routes: Service unavailable');
    });
  });

  describe('fetchRouteStations', () => {
    it('should fetch route stations successfully', async () => {
      const mockRouteStations = [
        { stationId: 'S1', routeId: 'R1', stationOrder: 1 },
        { stationId: 'S2', routeId: 'R1', stationOrder: 2 }
      ];
      callTransport.mockResolvedValue({ routeStations: mockRouteStations });

      const result = await transportService.fetchRouteStations('R1');

      expect(callTransport).toHaveBeenCalledWith('GetRouteStations', { routeId: 'R1' });
      expect(result).toEqual(mockRouteStations);
    });

    it('should handle empty route stations response', async () => {
      callTransport.mockResolvedValue({});

      const result = await transportService.fetchRouteStations('R1');

      expect(result).toEqual([]);
    });

    it('should handle gRPC errors when fetching route stations', async () => {
      const error = new Error('Route not found');
      callTransport.mockRejectedValue(error);

      await expect(transportService.fetchRouteStations('R1')).rejects.toThrow('Failed to fetch route stations: Route not found');
    });
  });

  describe('fetchAllTransportData', () => {
    it('should fetch all transport data successfully', async () => {
      const mockRoutes = [
        { routeId: 'R1', routeName: 'Route 1' },
        { routeId: 'R2', routeName: 'Route 2' }
      ];
      const mockRouteStations = [
        { stationId: 'S1', routeId: 'R1', stationOrder: 1 },
        { stationId: 'S2', routeId: 'R1', stationOrder: 2 }
      ];

      callTransport
        .mockResolvedValueOnce({ routes: mockRoutes })
        .mockResolvedValueOnce({ routeStations: mockRouteStations })
        .mockResolvedValueOnce({ routeStations: [] });

      const result = await transportService.fetchAllTransportData();

      expect(callTransport).toHaveBeenCalledWith('ListRoutes', {});
      expect(callTransport).toHaveBeenCalledWith('GetRouteStations', { routeId: 'R1' });
      expect(callTransport).toHaveBeenCalledWith('GetRouteStations', { routeId: 'R2' });
      expect(result).toEqual({
        routes: mockRoutes,
        routeStations: mockRouteStations
      });
    });

    it('should handle errors when fetching transport data', async () => {
      const error = new Error('Service unavailable');
      callTransport.mockRejectedValue(error);

      await expect(transportService.fetchAllTransportData()).rejects.toThrow('Failed to fetch transport data: Service unavailable');
    });
  });

  describe('fetchAllRouteStations', () => {
    it('should fetch all route stations successfully', async () => {
      const mockRoutes = [
        { routeId: 'R1', routeName: 'Route 1' },
        { routeId: 'R2', routeName: 'Route 2' }
      ];
      const mockRouteStations1 = [
        { stationId: 'S1', routeId: 'R1', stationOrder: 1 }
      ];
      const mockRouteStations2 = [
        { stationId: 'S2', routeId: 'R2', stationOrder: 1 }
      ];

      callTransport
        .mockResolvedValueOnce({ routes: mockRoutes })
        .mockResolvedValueOnce({ routeStations: mockRouteStations1 })
        .mockResolvedValueOnce({ routeStations: mockRouteStations2 });

      const result = await transportService.fetchAllRouteStations();

      expect(result).toEqual([...mockRouteStations1, ...mockRouteStations2]);
    });

    it('should handle errors when fetching all route stations', async () => {
      const error = new Error('Service unavailable');
      callTransport.mockRejectedValue(error);

      await expect(transportService.fetchAllRouteStations()).rejects.toThrow('Failed to fetch route stations: Failed to fetch routes: Service unavailable');
    });
  });

  describe('getRoute', () => {
    it('should get route by ID successfully', async () => {
      const mockRoute = { routeId: 'R1', routeName: 'Route 1', color: '#FF0000' };
      callTransport.mockResolvedValue(mockRoute);

      const result = await transportService.getRoute('R1');

      expect(callTransport).toHaveBeenCalledWith('GetRoute', { routeId: 'R1' });
      expect(result).toEqual(mockRoute);
    });

    it('should handle errors when getting route', async () => {
      const error = new Error('Route not found');
      callTransport.mockRejectedValue(error);

      await expect(transportService.getRoute('R1')).rejects.toThrow('Failed to get route: Route not found');
    });
  });

  describe('getStation', () => {
    it('should get station by ID successfully', async () => {
      const mockStation = { stationId: 'S1', stationName: 'Station 1', coordinates: { lat: 10.0, lng: 20.0 } };
      callTransport.mockResolvedValue(mockStation);

      const result = await transportService.getStation('S1');

      expect(callTransport).toHaveBeenCalledWith('GetStation', { stationId: 'S1' });
      expect(result).toEqual(mockStation);
    });

    it('should handle errors when getting station', async () => {
      const error = new Error('Station not found');
      callTransport.mockRejectedValue(error);

      await expect(transportService.getStation('S1')).rejects.toThrow('Failed to get station: Station not found');
    });
  });

  describe('getRoutesByStations', () => {
    it('should get routes by stations successfully', async () => {
      const mockRoutes = [
        { routeId: 'R1', routeName: 'Route 1' }
      ];
      callTransport.mockResolvedValue({ routes: mockRoutes });

      const result = await transportService.getRoutesByStations('S1', 'S2');

      expect(callTransport).toHaveBeenCalledWith('GetRoutesByStations', {
        originStationId: 'S1',
        destinationStationId: 'S2'
      });
      expect(result).toEqual(mockRoutes);
    });

    it('should handle errors when getting routes by stations', async () => {
      const error = new Error('No routes found');
      callTransport.mockRejectedValue(error);

      await expect(transportService.getRoutesByStations('S1', 'S2')).rejects.toThrow('Failed to get routes by stations: No routes found');
    });
  });

  describe('calculateStationCount', () => {
    it('should calculate station count successfully', async () => {
      const mockResult = { stationCount: 5 };
      callTransport.mockResolvedValue(mockResult);

      const result = await transportService.calculateStationCount('R1', 'S1', 'S3');

      expect(callTransport).toHaveBeenCalledWith('CalculateStationCount', {
        routeId: 'R1',
        originStationId: 'S1',
        destinationStationId: 'S3'
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle errors when calculating station count', async () => {
      const error = new Error('Calculation failed');
      callTransport.mockRejectedValue(error);

      await expect(transportService.calculateStationCount('R1', 'S1', 'S3')).rejects.toThrow('Failed to calculate station count: Calculation failed');
    });
  });
}); 