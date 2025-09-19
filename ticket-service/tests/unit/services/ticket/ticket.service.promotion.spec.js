const TicketService = require('../../../../src/services/ticket/services/TicketService');

jest.mock('../../../../src/models/index.model', () => ({
  Promotion: {
    findByPk: jest.fn(),
  },
}));

const { Promotion } = require('../../../../src/models/index.model');

describe('TicketService promotion helpers', () => {
  const service = require('../../../../src/services/ticket/services/TicketService');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('_handlePromotion', () => {
    test('returns nulls when no promotionCode', async () => {
      const res = await service._handlePromotion({}, null);
      expect(res).toEqual({ appliedPromotion: null, promotionId: null });
    });

    test('returns nulls and warns when promotion missing', async () => {
      const res = await service._handlePromotion({ promotionCode: 'CODE' }, null);
      expect(res).toEqual({ appliedPromotion: null, promotionId: null });
    });

    test('returns nulls when model instance is invalid', async () => {
      const promo = { isCurrentlyValid: () => false };
      const res = await service._handlePromotion({ promotionCode: 'CODE' }, promo);
      expect(res).toEqual({ appliedPromotion: null, promotionId: null });
    });

    test('returns nulls when not applicable to ticket type', async () => {
      const promo = { isCurrentlyValid: () => true, applicableTicketTypes: ['long-term'] };
      const res = await service._handlePromotion({ promotionCode: 'CODE' }, promo, 'short-term');
      expect(res).toEqual({ appliedPromotion: null, promotionId: null });
    });

    test('accepts plain object from calculator as valid', async () => {
      const promo = { promotionId: 'p1', promotionCode: 'CODE' };
      const res = await service._handlePromotion({ promotionCode: 'CODE' }, promo);
      expect(res).toEqual({ appliedPromotion: promo, promotionId: 'p1' });
    });

    test('accepts valid model instance', async () => {
      const promo = { promotionId: 'p2', isCurrentlyValid: () => true, applicableTicketTypes: [] };
      const res = await service._handlePromotion({ promotionCode: 'CODE' }, promo, 'short-term');
      expect(res).toEqual({ appliedPromotion: promo, promotionId: 'p2' });
    });
  });

  describe('_incrementPromotionUsage', () => {
    test('increments usage when promotion found', async () => {
      const incrementUsage = jest.fn();
      Promotion.findByPk.mockResolvedValue({ incrementUsage });
      await service._incrementPromotionUsage('pid', 'CODE', 'tid', 'ctx');
      expect(Promotion.findByPk).toHaveBeenCalledWith('pid');
      expect(incrementUsage).toHaveBeenCalled();
    });

    test('does nothing when promotion missing', async () => {
      Promotion.findByPk.mockResolvedValue(null);
      await expect(service._incrementPromotionUsage('pid', 'CODE', 'tid', 'ctx')).resolves.toBeUndefined();
    });

    test('catches errors and does not throw', async () => {
      Promotion.findByPk.mockRejectedValue(new Error('db'));
      await expect(service._incrementPromotionUsage('pid', 'CODE', 'tid', 'ctx')).resolves.toBeUndefined();
    });
  });
});


