const FareGrpcService = require('../../../src/services/fare.grpc.service');

// Mock publicClient
jest.mock('../../../src/grpc/publicClient', () => ({
  callTicket: jest.fn()
}));

const { callTicket } = require('../../../src/grpc/publicClient');

describe('Fare gRPC Service', () => {
  let fareService;

  beforeEach(() => {
    // Mock environment variables
    process.env.TICKET_GRPC_URL = 'localhost:50052';

    fareService = new FareGrpcService();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize gRPC client successfully', () => {
      expect(fareService).toBeDefined();
      expect(fareService.fetchAllFares).toBeDefined();
      expect(fareService.fetchAllTicketData).toBeDefined();
    });
  });

  describe('fetchAllFares', () => {
    it('should fetch all fares successfully', async () => {
      const mockFares = [
        { fareId: '1', routeId: 'R1', basePrice: 10.0 },
        { fareId: '2', routeId: 'R2', basePrice: 15.0 }
      ];
      callTicket.mockResolvedValue({ fares: mockFares });

      const result = await fareService.fetchAllFares();

      expect(callTicket).toHaveBeenCalledWith('ListFares', {});
      expect(result).toEqual(mockFares);
    });

    it('should handle empty fares response', async () => {
      callTicket.mockResolvedValue({});

      const result = await fareService.fetchAllFares();

      expect(result).toEqual([]);
    });

    it('should handle gRPC errors when fetching fares', async () => {
      const error = new Error('Service unavailable');
      callTicket.mockRejectedValue(error);

      await expect(fareService.fetchAllFares()).rejects.toThrow('Failed to fetch fares: Service unavailable');
    });
  });

  // Transit pass methods have moved to transitPass.service

  describe('fetchAllTicketData', () => {
    it('should fetch all ticket data successfully (fares only)', async () => {
      const mockFares = [{ fareId: '1', routeId: 'R1', basePrice: 10.0 }];

      callTicket.mockResolvedValueOnce({ fares: mockFares });

      const result = await fareService.fetchAllTicketData();

      expect(callTicket).toHaveBeenCalledWith('ListFares', {});
      expect(result).toEqual({
        fares: mockFares,
        transitPasses: []
      });
    });

    it('should handle errors in ticket data fetching', async () => {
      callTicket.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(fareService.fetchAllTicketData()).rejects.toThrow('Failed to fetch ticket data: Service unavailable');
    });
  });

  describe('fetchFareById', () => {
    it('should fetch fare by ID successfully', async () => {
      const mockFare = { fareId: '1', routeId: 'R1', basePrice: 10.0 };
      callTicket.mockResolvedValue(mockFare);

      const result = await fareService.fetchFareById('1');

      expect(callTicket).toHaveBeenCalledWith('GetFare', { fareId: '1' });
      expect(result).toEqual(mockFare);
    });

    it('should handle errors when fetching fare by ID', async () => {
      const error = new Error('Fare not found');
      callTicket.mockRejectedValue(error);

      await expect(fareService.fetchFareById('1')).rejects.toThrow('Failed to fetch fare 1: Fare not found');
    });
  });

  // Transit pass by ID moved to transitPass.service
}); 