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

// Mock promotion controller methods so we can verify routing without touching database
jest.mock('../../../src/controllers/promotion.controller', () => {
  const mockController = {
    getAllPromotions: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: [
        { promotionId: 'promo-1', code: 'SUMMER2024', type: 'percentage', value: 20 },
        { promotionId: 'promo-2', code: 'STUDENT50', type: 'percentage', value: 50 }
      ],
      count: 2
    })),
    getPromotionById: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { promotionId: req.params.id, code: 'SUMMER2024' } 
    })),
    getPromotionByCode: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      data: { promotionId: 'promo-1', code: req.params.code } 
    })),
    createPromotion: jest.fn((req, res) => res.status(201).json({ 
      success: true, 
      message: 'Promotion created successfully',
      data: { promotionId: 'promo-123', ...req.body }
    })),
    updatePromotion: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion updated successfully',
      data: { promotionId: req.params.id, ...req.body }
    })),
    deletePromotion: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion deleted successfully'
    })),
    validatePromotion: jest.fn((req, res) => {
      const invalidCodes = ['INVALID', 'NONEXISTENT'];
      const isValid = !invalidCodes.includes(req.params.code);
      res.status(isValid ? 200 : 400).json({ 
        success: isValid, 
        message: isValid ? 'Promotion is valid' : 'Promotion code not found',
        data: { 
          valid: isValid,
          code: req.params.code,
          discount: isValid ? 20 : undefined,
          type: isValid ? 'percentage' : undefined
        }
      });
    }),
    applyPromotion: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion applied successfully',
      data: { 
        originalPrice: req.body.originalPrice,
        discountAmount: req.body.originalPrice * 0.2,
        finalPrice: req.body.originalPrice * 0.8,
        promotionCode: req.params.code
      }
    })),
    getActivePromotions: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Active promotions retrieved successfully',
      data: [{ promotionId: 'promo-1', isActive: true }],
      count: 1
    })),
    getPromotionStatistics: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion statistics retrieved successfully',
      data: { 
        totalPromotions: 15,
        activePromotions: 8,
        usageStats: { totalUsage: 250 }
      }
    })),
    getPromotionUsageReport: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion usage report retrieved successfully',
      data: { 
        promotionId: req.params.id,
        totalUsage: 50,
        recentUsage: []
      }
    })),
    expirePromotions: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Expired promotions processed successfully',
      data: { expiredCount: 3, processedAt: new Date() }
    })),
    searchPromotions: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotions searched successfully',
      data: [{ promotionId: 'promo-1', code: 'SUMMER2024', applicable: true }],
      count: 1
    })),
    validatePromotionsBulk: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Bulk promotion validation completed',
      data: { 
        validPromotions: req.body.codes.filter(code => code !== 'INVALID'),
        invalidPromotions: req.body.codes.filter(code => code === 'INVALID'),
        totalValidated: req.body.codes.length
      }
    })),
    healthCheck: jest.fn((req, res) => res.status(200).json({ 
      success: true, 
      message: 'Promotion service is healthy',
      timestamp: new Date(),
      service: 'promotion-controller'
    }))
  };
  return mockController;
});

// Re-require mocked controller to access spies
const promotionControllerMock = require('../../../src/controllers/promotion.controller');

const promotionRoutes = require('../../../src/routes/promotion.route');

describe('Promotion Routes', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/promotions', promotionRoutes);

  afterEach(() => jest.clearAllMocks());

  // Public promotion routes
  describe('Public Promotion Routes', () => {
    it('GET /api/promotions/activePromotions should return 200', async () => {
      const res = await request(app)
        .get('/api/promotions/activePromotions')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getActivePromotions).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].isActive).toBe(true);
    });

    it('GET /api/promotions/searchPromotions should return 200', async () => {
      const res = await request(app)
        .get('/api/promotions/searchPromotions?ticketType=oneway&passengerType=adult')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.searchPromotions).toHaveBeenCalled();
      expect(res.body.data[0].code).toBe('SUMMER2024');
    });

    it('POST /api/promotions/validatePromotion/SUMMER2024 should return 200', async () => {
      const res = await request(app)
        .post('/api/promotions/validatePromotion/SUMMER2024')
        .set('Authorization', 'Bearer test')
        .send({ totalAmount: 50000 });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.validatePromotion).toHaveBeenCalled();
      expect(res.body.data.code).toBe('SUMMER2024');
      expect(res.body.data.valid).toBe(true);
    });

    it('POST /api/promotions/applyPromotion/SUMMER2024 should return 200', async () => {
      const res = await request(app)
        .post('/api/promotions/applyPromotion/SUMMER2024')
        .set('Authorization', 'Bearer test')
        .send({ 
          originalPrice: 100000,
          ticketType: 'oneway'
        });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.applyPromotion).toHaveBeenCalled();
      expect(res.body.data.originalPrice).toBe(100000);
      expect(res.body.data.discountAmount).toBe(20000);
      expect(res.body.data.finalPrice).toBe(80000);
    });
  });

  // Admin management routes
  describe('Admin Management Routes', () => {
    it('GET /api/promotions/allPromotions should return 200', async () => {
      const res = await request(app)
        .get('/api/promotions/allPromotions')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getAllPromotions).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it('GET /api/promotions/getPromotionById/:id should return 200', async () => {
      const res = await request(app)
        .get('/api/promotions/getPromotionById/promo-123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getPromotionById).toHaveBeenCalled();
      expect(res.body.data.promotionId).toBe('promo-123');
    });

    it('POST /api/promotions/createPromotion should return 201', async () => {
      const res = await request(app)
        .post('/api/promotions/createPromotion')
        .set('Authorization', 'Bearer test')
        .send({
          code: 'NEWYEAR2024',
          name: 'New Year Sale',
          type: 'percentage',
          value: 25,
          validFrom: '2024-01-01',
          validUntil: '2024-01-31'
        });

      expect(res.statusCode).toBe(201);
      expect(promotionControllerMock.createPromotion).toHaveBeenCalled();
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe('NEWYEAR2024');
    });

    it('PUT /api/promotions/updatePromotion/:id should return 200', async () => {
      const res = await request(app)
        .put('/api/promotions/updatePromotion/promo-123')
        .set('Authorization', 'Bearer test')
        .send({
          name: 'Updated Summer Sale',
          value: 30
        });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.updatePromotion).toHaveBeenCalled();
      expect(res.body.data.value).toBe(30);
    });

    it('DELETE /api/promotions/deletePromotion/:id should return 200', async () => {
      const res = await request(app)
        .delete('/api/promotions/deletePromotion/promo-123')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.deletePromotion).toHaveBeenCalled();
      expect(res.body.message).toBe('Promotion deleted successfully');
    });

    it('GET /api/promotions/promotionStatistics should return 200', async () => {
      const res = await request(app)
        .get('/api/promotions/promotionStatistics')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getPromotionStatistics).toHaveBeenCalled();
      expect(res.body.data.totalPromotions).toBe(15);
    });
  });

  // Test query parameters
  describe('Query Parameter Handling', () => {
    it('should pass query filters to getAllPromotions', async () => {
      const res = await request(app)
        .get('/api/promotions/allPromotions?isActive=true&type=percentage')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getAllPromotions).toHaveBeenCalled();
    });

    it('should pass query filters to getPromotionStatistics', async () => {
      const res = await request(app)
        .get('/api/promotions/promotionStatistics?dateFrom=2024-01-01&dateTo=2024-12-31')
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getPromotionStatistics).toHaveBeenCalled();
    });
  });

  // Test request body validation
  describe('Request Body Validation', () => {
    it('should handle promotion validation with code', async () => {
      const res = await request(app)
        .post('/api/promotions/validatePromotion/VALID2024')
        .set('Authorization', 'Bearer test')
        .send({ totalAmount: 50000 });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.validatePromotion).toHaveBeenCalled();
    });

    it('should handle promotion application with required fields', async () => {
      const res = await request(app)
        .post('/api/promotions/applyPromotion/DISCOUNT20')
        .set('Authorization', 'Bearer test')
        .send({ 
          originalPrice: 50000,
          ticketType: 'oneway'
        });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.applyPromotion).toHaveBeenCalled();
    });

    it('should handle promotion creation with all fields', async () => {
      const promotionData = {
        code: 'SPRING2024',
        name: 'Spring Sale',
        description: 'Spring season discount',
        type: 'percentage',
        value: 15,
        applicableTicketTypes: ['oneway', 'return'],
        applicablePassengerTypes: ['adult', 'senior'],
        usageLimit: 1000,
        userUsageLimit: 1,
        validFrom: '2024-03-01',
        validUntil: '2024-05-31'
      };

      const res = await request(app)
        .post('/api/promotions/createPromotion')
        .set('Authorization', 'Bearer test')
        .send(promotionData);

      expect(res.statusCode).toBe(201);
      expect(promotionControllerMock.createPromotion).toHaveBeenCalled();
    });
  });

  // Test different promotion types
  describe('Promotion Type Handling', () => {
    it('should handle percentage promotions', async () => {
      const res = await request(app)
        .post('/api/promotions/createPromotion')
        .set('Authorization', 'Bearer test')
        .send({
          code: 'PERCENT20',
          type: 'percentage',
          value: 20
        });

      expect(res.statusCode).toBe(201);
      expect(promotionControllerMock.createPromotion).toHaveBeenCalled();
    });

    it('should handle fixed amount promotions', async () => {
      const res = await request(app)
        .post('/api/promotions/createPromotion')
        .set('Authorization', 'Bearer test')
        .send({
          code: 'FIXED10K',
          type: 'fixed_amount',
          value: 10000
        });

      expect(res.statusCode).toBe(201);
      expect(promotionControllerMock.createPromotion).toHaveBeenCalled();
    });

    it('should handle buy one get one promotions', async () => {
      const res = await request(app)
        .post('/api/promotions/createPromotion')
        .set('Authorization', 'Bearer test')
        .send({
          code: 'BOGO2024',
          type: 'buy_one_get_one',
          value: 0
        });

      expect(res.statusCode).toBe(201);
      expect(promotionControllerMock.createPromotion).toHaveBeenCalled();
    });
  });

  // Test route parameter validation
  describe('Route Parameter Validation', () => {
    it('should handle promotion operations with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .get(`/api/promotions/getPromotionById/${validUuid}`)
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.getPromotionById).toHaveBeenCalled();
    });

    it('should handle promotion updates with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .put(`/api/promotions/updatePromotion/${validUuid}`)
        .set('Authorization', 'Bearer test')
        .send({ value: 25 });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.updatePromotion).toHaveBeenCalled();
    });

    it('should handle promotion deletion with valid UUID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const res = await request(app)
        .delete(`/api/promotions/deletePromotion/${validUuid}`)
        .set('Authorization', 'Bearer test');

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.deletePromotion).toHaveBeenCalled();
    });
  });

  // Test edge cases
  describe('Edge Cases', () => {
    it('should handle validation of non-existent promotion code', async () => {
      const res = await request(app)
        .post('/api/promotions/validatePromotion/NONEXISTENT')
        .set('Authorization', 'Bearer test')
        .send({ totalAmount: 50000 });

      expect(res.statusCode).toBe(400); // Should return 400 for invalid codes
      expect(promotionControllerMock.validatePromotion).toHaveBeenCalled();
    });

    it('should handle applying promotion to zero price', async () => {
      const res = await request(app)
        .post('/api/promotions/applyPromotion/TEST2024')
        .set('Authorization', 'Bearer test')
        .send({ 
          originalPrice: 0,
          ticketType: 'oneway'
        });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.applyPromotion).toHaveBeenCalled();
    });

    it('should handle applying promotion to high price', async () => {
      const res = await request(app)
        .post('/api/promotions/applyPromotion/VIP2024')
        .set('Authorization', 'Bearer test')
        .send({ 
          originalPrice: 10000000, // 10 million VND
          ticketType: 'return'
        });

      expect(res.statusCode).toBe(200);
      expect(promotionControllerMock.applyPromotion).toHaveBeenCalled();
    });
  });
}); 