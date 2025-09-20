const promotionController = require('../../../src/controllers/promotion.controller');
const promotionService = require('../../../src/services/promotion.service');

// Mock promotion service
jest.mock('../../../src/services/promotion.service');

// Mock async error handler
jest.mock('../../../src/helpers/errorHandler.helper', () => {
  return jest.fn().mockImplementation((fn) => fn);
});

describe('Promotion Controller', () => {
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

  describe('getAllPromotions', () => {
    it('should return all promotions successfully', async () => {
      const mockPromotions = [
        {
          promotionId: 'promo-1',
          code: 'SUMMER2024',
          name: 'Summer Sale',
          type: 'percentage',
          value: 20,
          isActive: true
        },
        {
          promotionId: 'promo-2',
          code: 'STUDENT50',
          name: 'Student Discount',
          type: 'percentage',
          value: 50,
          isActive: true
        }
      ];

      promotionService.getAllPromotions.mockResolvedValue(mockPromotions);

      await promotionController.getAllPromotions(req, res, next);

      expect(promotionService.getAllPromotions).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotions retrieved successfully',
        data: mockPromotions,
        count: 2
      });
    });

    it('should pass filters to service', async () => {
      req.query = { isActive: true, type: 'percentage' };
      promotionService.getAllPromotions.mockResolvedValue([]);

      await promotionController.getAllPromotions(req, res, next);

      expect(promotionService.getAllPromotions).toHaveBeenCalledWith(req.query);
    });
  });

  describe('getPromotionById', () => {
    it('should return promotion when found', async () => {
      const mockPromotion = {
        promotionId: 'promo-123',
        code: 'SUMMER2024',
        name: 'Summer Sale',
        type: 'percentage',
        value: 20
      };

      req.params.id = 'promo-123';
      promotionService.getPromotionById.mockResolvedValue(mockPromotion);

      await promotionController.getPromotionById(req, res, next);

      expect(promotionService.getPromotionById).toHaveBeenCalledWith('promo-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion retrieved successfully',
        data: mockPromotion
      });
    });

    it('should return 404 when promotion not found', async () => {
      req.params.id = 'promo-999';
      promotionService.getPromotionById.mockResolvedValue(null);

      await promotionController.getPromotionById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Promotion not found'
      });
    });
  });

  describe('createPromotion', () => {
    it('should create promotion successfully', async () => {
      const mockPromotion = {
        promotionId: 'promo-123',
        code: 'NEWYEAR2024',
        name: 'New Year Sale',
        type: 'percentage',
        value: 25
      };

      req.body = {
        code: 'NEWYEAR2024',
        name: 'New Year Sale',
        type: 'percentage',
        value: 25,
        validFrom: '2024-01-01',
        validUntil: '2024-01-31'
      };

      promotionService.createPromotion.mockResolvedValue(mockPromotion);

      await promotionController.createPromotion(req, res, next);

      expect(promotionService.createPromotion).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion created successfully',
        data: mockPromotion,
        type: 'percentage'
      });
    });
  });

  describe('updatePromotion', () => {
    it('should update promotion successfully', async () => {
      const mockPromotion = {
        promotionId: 'promo-123',
        code: 'SUMMER2024',
        name: 'Summer Sale Updated',
        type: 'percentage',
        value: 30
      };

      req.params.id = 'promo-123';
      req.body = { 
        name: 'Summer Sale Updated',
        value: 30 
      };

      promotionService.updatePromotion.mockResolvedValue(mockPromotion);

      await promotionController.updatePromotion(req, res, next);

      expect(promotionService.updatePromotion).toHaveBeenCalledWith('promo-123', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion updated successfully',
        data: mockPromotion
      });
    });
  });

  describe('deletePromotion', () => {
    it('should delete promotion successfully', async () => {
      const mockResult = { message: 'Promotion deactivated successfully' };

      req.params.id = 'promo-123';
      promotionService.deletePromotion.mockResolvedValue(mockResult);

      await promotionController.deletePromotion(req, res, next);

      expect(promotionService.deletePromotion).toHaveBeenCalledWith('promo-123');
      expect(res.status).toHaveBeenCalledWith(200);
          expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: mockResult.message
    });
    });
  });

  describe('validatePromotion', () => {
    it('should validate promotion successfully', async () => {
      const mockValidation = {
        valid: true,
        promotionId: 'promo-123',
        code: 'SUMMER2024',
        discount: 20,
        type: 'percentage'
      };

      req.params = { code: 'SUMMER2024' };
      req.body = { totalAmount: 50000 };
      promotionService.validatePromotion.mockResolvedValue(mockValidation);

      await promotionController.validatePromotion(req, res, next);

      expect(promotionService.validatePromotion).toHaveBeenCalledWith('SUMMER2024', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion is valid',
        data: mockValidation
      });
    });

    it('should handle invalid promotion code', async () => {
      req.params = { code: 'INVALID2024' };
      req.body = { totalAmount: 10000 };
      const mockValidation = {
        valid: false,
        reason: 'Promotion code not found or expired'
      };
      promotionService.validatePromotion.mockResolvedValue(mockValidation);

      await promotionController.validatePromotion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Promotion code not found or expired',
        data: mockValidation
      });
    });
  });

  describe('getActivePromotions', () => {
    it('should return active promotions successfully', async () => {
      const mockPromotions = [
        {
          promotionId: 'promo-1',
          code: 'ACTIVE2024',
          isActive: true,
          validFrom: new Date('2024-01-01'),
          validUntil: new Date('2024-12-31')
        }
      ];

      promotionService.getActivePromotions.mockResolvedValue(mockPromotions);

      await promotionController.getActivePromotions(req, res, next);

      expect(promotionService.getActivePromotions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Active promotions retrieved successfully',
        data: mockPromotions,
        count: 1
      });
    });
  });

  describe('getPromotionStatistics', () => {
    it('should return promotion statistics successfully', async () => {
      const mockStats = {
        totalPromotions: 10,
        activePromotions: 5,
        expiredPromotions: 3,
        usageStats: {
          totalUsage: 150,
          averageUsagePerPromotion: 15
        },
        typeDistribution: {
          percentage: 7,
          fixed_amount: 2,
          buy_one_get_one: 1
        }
      };

      promotionService.getPromotionStatistics.mockResolvedValue(mockStats);

      await promotionController.getPromotionStatistics(req, res, next);

      expect(promotionService.getPromotionStatistics).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion statistics retrieved successfully',
        data: mockStats
      });
    });

    it('should pass filters to service', async () => {
      req.query = { dateFrom: '2024-01-01', dateTo: '2024-12-31' };
      promotionService.getPromotionStatistics.mockResolvedValue({});

      await promotionController.getPromotionStatistics(req, res, next);

      expect(promotionService.getPromotionStatistics).toHaveBeenCalledWith(req.query);
    });
  });

  describe('applyPromotion', () => {
    it('should apply promotion successfully', async () => {
      const mockResult = {
        originalPrice: 100000,
        discountAmount: 20000,
        finalPrice: 80000,
        promotionCode: 'SUMMER2024',
        discountType: 'percentage'
      };

      req.params = { code: 'SUMMER2024' };
      req.body = {
        originalPrice: 100000,
        ticketType: 'oneway'
      };

      promotionService.applyPromotion.mockResolvedValue(mockResult);

      await promotionController.applyPromotion(req, res, next);

      expect(promotionService.applyPromotion).toHaveBeenCalledWith('SUMMER2024', req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Promotion applied successfully',
        data: mockResult
      });
    });

    it('should handle promotion application errors', async () => {
      req.params = { code: 'EXPIRED' };
      req.body = {
        originalPrice: 50000
      };
      const error = new Error('Promotion has expired');
      promotionService.applyPromotion.mockRejectedValue(error);

      await promotionController.applyPromotion(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Promotion has expired',
          error: 'INTERNAL_ERROR_APPLY_PROMOTION'
        })
      );
    });
  });
}); 