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
      expect(fareService.fetchAllTransitPasses).toBeDefined();
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

  describe('fetchAllTransitPasses', () => {
    it('should fetch all transit passes successfully', async () => {
      const mockPasses = [
        { transitPassId: '1', transitPassType: 'DAILY', price: 50.0 },
        { transitPassId: '2', transitPassType: 'MONTHLY', price: 1000.0 }
      ];
      callTicket.mockResolvedValue({ transitPasses: mockPasses });

      const result = await fareService.fetchAllTransitPasses();

      expect(callTicket).toHaveBeenCalledWith('ListTransitPasses', {});
      expect(result).toEqual(mockPasses);
    });

    it('should handle empty transit passes response', async () => {
      callTicket.mockResolvedValue({});

      const result = await fareService.fetchAllTransitPasses();

      expect(result).toEqual([]);
    });

    it('should handle gRPC errors when fetching transit passes', async () => {
      const error = new Error('Internal server error');
      callTicket.mockRejectedValue(error);

      await expect(fareService.fetchAllTransitPasses()).rejects.toThrow('Failed to fetch transit passes: Internal server error');
    });
  });

  describe('fetchAllTicketData', () => {
    it('should fetch all ticket data successfully', async () => {
      const mockFares = [{ fareId: '1', routeId: 'R1', basePrice: 10.0 }];
      const mockPasses = [{ transitPassId: '1', transitPassType: 'DAILY', price: 50.0 }];

      callTicket
        .mockResolvedValueOnce({ fares: mockFares })
        .mockResolvedValueOnce({ transitPasses: mockPasses });

      const result = await fareService.fetchAllTicketData();

      expect(callTicket).toHaveBeenCalledWith('ListFares', {});
      expect(callTicket).toHaveBeenCalledWith('ListTransitPasses', {});
      expect(result).toEqual({
        fares: mockFares,
        transitPasses: mockPasses
      });
    });

    it('should handle partial failures in ticket data fetching', async () => {
      callTicket
        .mockResolvedValueOnce({ fares: [] })
        .mockRejectedValueOnce(new Error('Service unavailable'));

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

  describe('fetchTransitPassById', () => {
    it('should fetch transit pass by ID successfully', async () => {
      const mockPass = { transitPassId: '1', transitPassType: 'DAILY', price: 50.0 };
      callTicket.mockResolvedValue(mockPass);

      const result = await fareService.fetchTransitPassById('1');

      expect(callTicket).toHaveBeenCalledWith('GetTransitPass', { transitPassId: '1' });
      expect(result).toEqual(mockPass);
    });

    it('should handle errors when fetching transit pass by ID', async () => {
      const error = new Error('Transit pass not found');
      callTicket.mockRejectedValue(error);

      await expect(fareService.fetchTransitPassById('1')).rejects.toThrow('Failed to fetch transit pass 1: Transit pass not found');
    });
  });
}); 