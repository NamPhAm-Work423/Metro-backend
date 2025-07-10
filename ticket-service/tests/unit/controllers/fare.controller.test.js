const fareController = require('../../../src/controllers/fare.controller');
const fareService = require('../../../src/services/fare.service');

// Mock fare service
jest.mock('../../../src/services/fare.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Fare Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      user: { id: 'test-user-id' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getAllFares', () => {
    it('should return all fares successfully', async () => {
      const mockFares = [
        {
          fareId: 'fare-1',
          routeId: 'route-1',
          basePrice: 20000,
          currency: 'VND',
          isActive: true
        },
        {
          fareId: 'fare-2',
          routeId: 'route-2',
          basePrice: 25000,
          currency: 'VND',
          isActive: true
        }
      ];

      fareService.getAllFares.mockResolvedValue(mockFares);

      await fareController.getAllFares(req, res, next);

      expect(fareService.getAllFares).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fares retrieved successfully',
        data: mockFares,
        count: 2
      });
    });

    it('should pass filters to service', async () => {
      req.query = { routeId: 'route-123', isActive: true };
      fareService.getAllFares.mockResolvedValue([]);

      await fareController.getAllFares(req, res, next);

      expect(fareService.getAllFares).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getFareById', () => {
    it('should return fare when found', async () => {
      const mockFare = {
        fareId: 'fare-123',
        routeId: 'route-1',
        basePrice: 20000,
        currency: 'VND'
      };

      req.params.id = 'fare-123';
      fareService.getFareById.mockResolvedValue(mockFare);

      await fareController.getFareById(req, res, next);

      expect(fareService.getFareById).toHaveBeenCalledWith('fare-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare retrieved successfully',
        data: mockFare
      });
    });

    it('should return 404 when fare not found', async () => {
      req.params.id = 'fare-999';
      fareService.getFareById.mockRejectedValue(new Error('Fare not found'));

      await expect(fareController.getFareById(req, res, next))
        .rejects
        .toThrow('Fare not found');
    });
  });

  describe('createFare', () => {
    it('should create fare successfully', async () => {
      const mockFare = {
        fareId: 'fare-123',
        routeId: 'route-1',
        basePrice: 20000,
        currency: 'VND'
      };

      req.body = {
        routeId: 'route-1',
        basePrice: 20000,
        currency: 'VND'
      };

      fareService.createFare.mockResolvedValue(mockFare);

      await fareController.createFare(req, res, next);

      expect(fareService.createFare).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare created successfully',
        data: mockFare
      });
    });
  });

  describe('updateFare', () => {
    it('should update fare successfully', async () => {
      const mockFare = {
        fareId: 'fare-123',
        routeId: 'route-1',
        basePrice: 25000,
        currency: 'VND'
      };

      req.params.id = 'fare-123';
      req.body = { basePrice: 25000 };

      fareService.updateFare.mockResolvedValue(mockFare);

      await fareController.updateFare(req, res, next);

      expect(fareService.updateFare).toHaveBeenCalledWith('fare-123', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare updated successfully',
        data: mockFare
      });
    });
  });

  describe('deleteFare', () => {
    it('should delete fare successfully', async () => {
      const mockResult = { message: 'Fare deactivated successfully' };

      req.params.id = 'fare-123';
      fareService.deleteFare.mockResolvedValue(mockResult);

      await fareController.deleteFare(req, res, next);

      expect(fareService.deleteFare).toHaveBeenCalledWith('fare-123');
      expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: mockResult.message
    });
    });
  });

  describe('calculateFarePrice', () => {
    it('should calculate fare price successfully', async () => {
      const mockCalculation = {
        fareId: 'fare-123',
        basePrice: 15000,
        finalPrice: 15000,
        currency: 'VND'
      };

      req.params = { id: 'fare-123' };
      req.query = { isPeakHour: 'false' };

      fareService.calculateFarePrice.mockResolvedValue(mockCalculation);

      await fareController.calculateFarePrice(req, res, next);

      expect(fareService.calculateFarePrice).toHaveBeenCalledWith('fare-123', { isPeakHour: false });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare price calculated successfully',
        data: mockCalculation
      });
    });

    it('should handle peak hour calculation', async () => {
      const mockCalculation = {
        fareId: 'fare-123',
        basePrice: 15000,
        finalPrice: 18000, // With peak hour multiplier
        currency: 'VND'
      };

      req.params = { id: 'fare-123' };
      req.query = { isPeakHour: 'true' };

      fareService.calculateFarePrice.mockResolvedValue(mockCalculation);

      await fareController.calculateFarePrice(req, res, next);

      expect(fareService.calculateFarePrice).toHaveBeenCalledWith('fare-123', { isPeakHour: true });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare price calculated successfully',
        data: mockCalculation
      });
    });

    it('should handle calculation errors', async () => {
      req.params = { id: 'fare-123' };
      req.query = {};

      fareService.calculateFarePrice.mockRejectedValue(new Error('Fare not found'));

      await expect(fareController.calculateFarePrice(req, res, next))
        .rejects
        .toThrow('Fare not found');
    });
  });

  describe('getFaresByRoute', () => {
    it('should return fares for specific route', async () => {
      const mockFares = [
        {
          fareId: 'fare-1',
          routeId: 'route-123',
          basePrice: 20000
        }
      ];

      req.params.routeId = 'route-123';
      fareService.getFaresByRoute.mockResolvedValue(mockFares);

      await fareController.getFaresByRoute(req, res, next);

      expect(fareService.getFaresByRoute).toHaveBeenCalledWith('route-123', {});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Route fares retrieved successfully',
        data: mockFares,
        count: 1
      });
    });
  });

  describe('getActiveFares', () => {
    it('should return active fares successfully', async () => {
      const mockFares = [
        {
          fareId: 'fare-1',
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31')
        }
      ];

      fareService.getActiveFares.mockResolvedValue(mockFares);

      await fareController.getActiveFares(req, res, next);

      expect(fareService.getActiveFares).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active fares retrieved successfully',
        data: mockFares,
        count: 1
      });
    });
  });

  describe('getFareStatistics', () => {
    it('should return fare statistics successfully', async () => {
      const mockStats = [
        {
          ticketType: 'oneway',
          passengerType: 'adult',
          fareCount: 100,
          averagePrice: 22500,
          minPrice: 20000,
          maxPrice: 40000
        }
      ];

      fareService.getFareStatistics.mockResolvedValue(mockStats);

      await fareController.getFareStatistics(req, res, next);

      expect(fareService.getFareStatistics).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Fare statistics retrieved successfully',
        data: mockStats
      });
    });

    it('should pass filters to service', async () => {
      req.query = { routeId: 'route-123', dateFrom: '2024-01-01' };
      fareService.getFareStatistics.mockResolvedValue([]);

      await fareController.getFareStatistics(req, res, next);

      expect(fareService.getFareStatistics).toHaveBeenCalledWith(req.query);
    });
  });
}); 