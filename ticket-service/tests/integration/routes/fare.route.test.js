const express = require('express');
const request = require('supertest');

// Mock authorization middleware to bypass authentication
jest.mock('../../../src/middlewares/authorization', () => ({
  authorizeRoles: (...roles) => [
    (req, res, next) => {
      req.user = { id: 'test-user', roles: roles };
      next();
    }
  ]
}));

// Mock fare controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/fare.controller', () => {
  const mockController = {
    getAllFares: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [
        { fareId: 'fare-1', routeId: 'route-1', basePrice: 20000 },
        { fareId: 'fare-2', routeId: 'route-2', basePrice: 25000 }
      ],
      count: 2
    })),
    getFareById: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { fareId: req.params.id, basePrice: 20000 } 
    })),
    createFare: jest.fn((req, res) => res.status(201).json({ 
      success: true, 
      message: 'Fare created successfully',
      data: { fareId: 'fare-123', ...req.body }
    })),
    updateFare: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fare updated successfully',
      data: { fareId: req.params.id, ...req.body }
    })),
    deleteFare: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fare deleted successfully'
    })),
    calculateFarePrice: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fare price calculated successfully',
      data: { 
        fareId: req.params.id,
        basePrice: 20000,
        finalPrice: 20000,
        currency: 'VND'
      }
    })),
    getFaresByRoute: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Route fares retrieved successfully',
      data: [{ fareId: 'fare-1', routeId: req.params.routeId }],
      count: 1
    })),
    getFaresBetweenStations: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Station-to-station fares retrieved successfully',
      data: [{ fareId: 'fare-1', originId: req.params.originId, destinationId: req.params.destinationId }],
      count: 1
    })),
    getFaresByZone: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Zone-based fares retrieved successfully',
      data: [{ fareId: 'fare-1', zones: req.params.zones }],
      count: 1
    })),
    getActiveFares: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Active fares retrieved successfully',
      data: [{ fareId: 'fare-1', isActive: true }],
      count: 1
    })),
    getFareStatistics: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fare statistics retrieved successfully',
      data: { 
        totalFares: 10,
        averagePrice: 22500,
        priceDistribution: { min: 20000, max: 40000 }
      }
    })),
    searchFares: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fares searched successfully',
      data: [{ fareId: 'fare-1', originStationId: req.query.originStationId, destinationStationId: req.query.destinationStationId }],
      count: 1
    })),
    bulkUpdateFares: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Bulk fare update completed',
      data: { updatedCount: 5, updatedAt: new Date() }
    })),
    healthCheck: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Fare service is healthy',
      timestamp: new Date(),
      service: 'fare-controller'
    }))
  };
  return mockController;
});

// Re-require mocked controller to access spies
const fareControllerMock = require('../../../src/controllers/fare.controller');

const fareRoutes = require('../../../src/routes/fare.route');

describe('Fare Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/fares', fareRoutes);

  afterEach(() => jest.clearAllMocks());

  // Public fare information routes
  describe('Public Fare Information Routes', () => {
    it('GET /api/fares should return 200', async () => {
      const res = await request(app)
        .get('/api/fares')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getAllFares).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('GET /api/fares/get-all should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/get-all')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getAllFares).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('GET /api/fares/:id should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/fare-123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFareById).toHaveBeenCalled();
      expect(res.body.data.fareId).toBe('fare-123');
    });

    it('GET /api/fares/route/:routeId should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/route/route-123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFaresByRoute).toHaveBeenCalled();
      expect(res.body.data[0].routeId).toBe('route-123');
    });
  });

  // Fare calculation routes
  describe('Fare Calculation Routes', () => {
    it('GET /api/fares/:id/calculate should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/fare-123/calculate')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.calculateFarePrice).toHaveBeenCalled();
      expect(res.body.data.currency).toBe('VND');
    });

    it('GET /api/fares/:id/calculate should handle peak hour', async () => {
      const res = await request(app)
        .get('/api/fares/fare-123/calculate?isPeakHour=true')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.calculateFarePrice).toHaveBeenCalled();
    });

    it('GET /api/fares/search should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/search?originStationId=station-a&destinationStationId=station-b')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.searchFares).toHaveBeenCalled();
      expect(res.body.data[0].originStationId).toBe('station-a');
    });
  });

  // Admin management routes
  describe('Admin Management Routes', () => {
    it('POST /api/fares should return 201', async () => {
      const res = await request(app)
        .post('/api/fares')
        .set('Authorization', 'Bearer test')
        .send({
          routeId: 'route-123',
          basePrice: 20000,
          currency: 'VND'
        });

      expect(res.statusCode).toBe(201);
      expect(fareControllerMock.createFare).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data.basePrice).toBe(20000);
    });

    it('PUT /api/fares/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/fares/fare-123')
        .set('Authorization', 'Bearer test')
        .send({
          basePrice: 25000
        });

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.updateFare).toHaveBeenCalled();
      expect(res.body.data.basePrice).toBe(25000);
    });

    it('DELETE /api/fares/:id should return 200', async () => {
      const res = await request(app)
        .delete('/api/fares/fare-123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.deleteFare).toHaveBeenCalled();
      expect(res.body.message).toBe('Fare deleted successfully');
    });

    it('GET /api/fares/statistics should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/statistics')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFareStatistics).toHaveBeenCalled();
      expect(res.body.data.totalFares).toBe(10);
    });
  });

  // Test query parameters
  describe('Query Parameter Handling', () => {
    it('should pass query filters to getAllFares', async () => {
      const res = await request(app)
        .get('/api/fares?routeId=route-123&isActive=true')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getAllFares).toHaveBeenCalled();
    });

    it('should pass query filters to getFaresByRoute', async () => {
      const res = await request(app)
        .get('/api/fares/route/route-123?ticketType=oneway&passengerType=adult')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFaresByRoute).toHaveBeenCalled();
    });

    it('should pass query filters to getFareStatistics', async () => {
      const res = await request(app)
        .get('/api/fares/statistics?routeId=route-123&dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFareStatistics).toHaveBeenCalled();
    });
  });

  // Test route parameter validation
  describe('Route Parameter Validation', () => {
    it('should handle fare operations with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .get(`/api/fares/${validUuid}`)
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFareById).toHaveBeenCalled();
    });

    it('should handle route-specific fare queries', async () => {
      const validRouteId = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .get(`/api/fares/route/${validRouteId}`)
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFaresByRoute).toHaveBeenCalled();
    });
  });

  // Test additional route endpoints
  describe('Additional Route Endpoints', () => {
    it('GET /api/fares/stations/:originId/:destinationId should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/stations/station-a/station-b')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFaresBetweenStations).toHaveBeenCalled();
    });

    it('GET /api/fares/zones/:zones should return 200', async () => {
      const res = await request(app)
        .get('/api/fares/zones/3')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(fareControllerMock.getFaresByZone).toHaveBeenCalled();
    });
  });
});