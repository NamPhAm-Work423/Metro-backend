describe('Health Controller', () => {
  let healthController;
  let req, res, next;
  let mockCacheService;
  let mockSchedulerService;

  beforeEach(() => {
    // Clear all mocks
    jest.resetModules();
    
    mockCacheService = {
      checkDataAvailability: jest.fn(),
      getTransportData: jest.fn(),
      getTicketData: jest.fn()
    };
    mockSchedulerService = {
      healthCheck: jest.fn()
    };

    // Mock the services
    jest.doMock('../../../src/services/cache.service', () => {
      return jest.fn().mockImplementation(() => mockCacheService);
    });
    
    jest.doMock('../../../src/services/scheduler.service', () => {
      return jest.fn().mockImplementation(() => mockSchedulerService);
    });

    // Import the controller after setting up mocks
    healthController = require('../../../src/controllers/health.controller');
    req = {
      headers: {},
      ip: '127.0.0.1',
      get: jest.fn()
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

    describe('getHealth', () => {
    it('should return healthy status when services are healthy', async () => {
      mockCacheService.checkDataAvailability.mockResolvedValue({
        healthy: true,
        transport: true,
        ticket: true
      });

      await healthController.getHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          service: 'public-service'
        })
      );
    });

    it('should return unhealthy status when services are unhealthy', async () => {
      mockCacheService.checkDataAvailability.mockResolvedValue({
        healthy: false,
        transport: false,
        ticket: false,
        error: 'Service unavailable'
      });

      await healthController.getHealth(req, res);

       expect(res.status).toHaveBeenCalledWith(503);
       expect(res.json).toHaveBeenCalledWith(
         expect.objectContaining({
           status: 'unhealthy',
           service: 'public-service'
         })
       );
    });
  });

     describe('getDetailedHealth', () => {
     it('should return detailed health information', async () => {
       mockCacheService.checkDataAvailability.mockResolvedValue({
         healthy: true,
         transport: true,
         ticket: true
       });
       mockCacheService.getTransportData.mockResolvedValue({
         routes: ['route1', 'route2'],
         routeStations: ['station1', 'station2']
       });
       mockCacheService.getTicketData.mockResolvedValue({
         fares: ['fare1', 'fare2'],
         transitPasses: ['pass1']
       });
       mockSchedulerService.healthCheck.mockReturnValue({
         healthy: true,
         enabled: true,
         message: 'Running'
       });

       await healthController.getDetailedHealth(req, res);

       expect(res.json).toHaveBeenCalledWith(
         expect.objectContaining({
           service: 'public-service',
           checks: expect.objectContaining({
             dataAvailability: expect.any(Object),
             transportService: expect.any(Object),
             ticketService: expect.any(Object),
             scheduler: expect.any(Object)
           })
         })
       );
     });
   });

     describe('getReadiness', () => {
     it('should return ready status when all services are healthy', async () => {
       mockCacheService.checkDataAvailability.mockResolvedValue({
         healthy: true,
         transport: true,
         ticket: true
       });
       mockSchedulerService.healthCheck.mockReturnValue({
         healthy: true,
         enabled: true,
         message: 'Running'
       });

       await healthController.getReadiness(req, res);

       expect(res.json).toHaveBeenCalledWith(
         expect.objectContaining({
           ready: expect.any(Boolean),
           checks: expect.objectContaining({
             transportService: true,
             ticketService: true,
             dataAvailable: true
           })
         })
       );
     });
   });

     describe('getLiveness', () => {
     it('should return live status', async () => {
       await healthController.getLiveness(req, res);

       expect(res.status).toHaveBeenCalledWith(200);
       expect(res.json).toHaveBeenCalledWith(
         expect.objectContaining({
           alive: expect.any(Boolean)
         })
       );
     });
   });
}); 