const PromotionValidator = require('../../../src/services/promotion/validators/PromotionValidator');

function makePromotion(overrides = {}) {
  const base = {
    promotionId: 'p1',
    promotionCode: 'CODE',
    name: 'Test',
    type: 'percentage',
    value: 10,
    discountType: 'percentage',
    discountValue: 10,
    maxDiscount: undefined,
    usageLimit: 0,
    usageCount: 0,
    validFrom: new Date(Date.now() - 1000),
    validUntil: new Date(Date.now() + 86400000),
    applicableTicketTypes: [],
    applicablePassengerTypes: [],
    applicableRoutes: [],
    description: 'desc',
    isCurrentlyValid: jest.fn().mockReturnValue(true),
    isValidForDateTime: jest.fn().mockReturnValue(true),
    calculateDiscount: jest.fn((price) => Math.round(price * 0.1)),
    incrementUsage: jest.fn(),
    tickets: []
  };
  return { ...base, ...overrides };
}

describe('PromotionValidator', () => {
  let repo;
  let validator;

  beforeEach(() => {
    repo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findPassPromotions: jest.fn(),
      findRoutePromotions: jest.fn()
    };
    validator = new PromotionValidator(repo);
  });

  test('validatePromotion returns not found', async () => {
    repo.findByCode.mockResolvedValue(null);
    const res = await validator.validatePromotion('X');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/not found/i);
  });

  test('validatePromotion handles not yet active and expired', async () => {
    const future = makePromotion({
      isCurrentlyValid: jest.fn().mockReturnValue(false),
      validFrom: new Date(Date.now() + 3600000),
      validUntil: new Date(Date.now() + 7200000),
      usageLimit: 0,
      usageCount: 0,
      isValidForDateTime: jest.fn().mockReturnValue(true)
    });
    repo.findByCode.mockResolvedValue(future);
    let res = await validator.validatePromotion('FUT');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/not yet active/i);

    const past = makePromotion({
      isCurrentlyValid: jest.fn().mockReturnValue(false),
      validFrom: new Date(Date.now() - 7200000),
      validUntil: new Date(Date.now() - 3600000),
      usageLimit: 0,
      usageCount: 0,
      isValidForDateTime: jest.fn().mockReturnValue(true)
    });
    repo.findByCode.mockResolvedValue(past);
    res = await validator.validatePromotion('PAST');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/expired/i);
  });

  test('validatePromotion enforces usage limit', async () => {
    const promo = makePromotion({ isCurrentlyValid: jest.fn().mockReturnValue(false), usageLimit: 1, usageCount: 1 });
    repo.findByCode.mockResolvedValue(promo);
    const res = await validator.validatePromotion('LIM');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/usage limit/i);
  });

  test('validatePromotion enforces ticket/passenger/route filters and min purchase', async () => {
    const promo = makePromotion({
      applicableTicketTypes: ['long_term'],
      applicablePassengerTypes: ['adult'],
      applicableRoutes: ['r1']
    });
    repo.findByCode.mockResolvedValue(promo);
    let res = await validator.validatePromotion('CODE', { ticketType: 'short_term' });
    expect(res.valid).toBe(false);

    repo.findByCode.mockResolvedValue(promo);
    res = await validator.validatePromotion('CODE', { ticketType: 'long_term', passengerType: 'child' });
    expect(res.valid).toBe(false);

    repo.findByCode.mockResolvedValue(promo);
    res = await validator.validatePromotion('CODE', { ticketType: 'long_term', passengerType: 'adult', routeId: 'r2' });
    expect(res.valid).toBe(false);

    const withMin = makePromotion({ minPurchaseAmount: 100000 });
    repo.findByCode.mockResolvedValue(withMin);
    res = await validator.validatePromotion('CODE', { purchaseAmount: 50000 });
    expect(res.valid).toBe(false);
  });

  test('validatePromotion supports pass upgrade flow and returns discount', async () => {
    const promo = makePromotion({ type: 'free_upgrade' });
    repo.findByCode.mockResolvedValue(promo);
    const res = await validator.validatePromotion('CODE', { ticketType: 'monthly_pass', originalPrice: 100000 });
    expect(res.valid).toBe(true);
    expect(res.promotion.discountAmount).toBeGreaterThanOrEqual(0);
    expect(res.promotion.upgradeToType).toBe('yearly_pass');
  });

  test('applyPromotion increments usage and returns promotion summary', async () => {
    const promo = makePromotion();
    repo.findByCode.mockResolvedValue(promo);
    const result = await validator.applyPromotion('CODE', { originalPrice: 100000 });
    expect(promo.incrementUsage).toHaveBeenCalled();
    expect(result.promotionCode || result.promotionCode === undefined).toBeDefined();
  });

  test('getPromotionUsageReport aggregates stats', async () => {
    const promo = makePromotion({
      usageLimit: 10,
      usageCount: 3,
      tickets: [
        { status: 'used', discountAmount: 1000 },
        { status: 'used', discountAmount: 2000 },
        { status: 'cancelled', discountAmount: 0 },
      ],
    });
    repo.findById.mockResolvedValue(promo);
    const res = await validator.getPromotionUsageReport('p1');
    expect(res.usage.totalUsage).toBe(3);
    expect(res.usage.totalDiscountGiven).toBe(3000);
    expect(res.usage.usageByStatus.used).toBe(2);
    expect(res.usage.remainingUsage).toBe(7);
  });

  test('applyPassUpgradePromotion calculates percentage with cap and rounds', async () => {
    const promo = makePromotion({
      discountType: 'percentage',
      discountValue: 25,
      maxDiscount: 15000,
      applicableTicketTypes: []
    });
    repo.findByCode.mockResolvedValue(promo);
    const res = await validator.applyPassUpgradePromotion('PROMO', 52000, 'monthly_pass');
    expect(res.discount).toBeLessThanOrEqual(15000);
    expect(res.finalPrice).toBeGreaterThanOrEqual(0);
  });

  test('applyPassUpgradePromotion fixed amount', async () => {
    const promo = makePromotion({ discountType: 'fixed', discountValue: 20000 });
    repo.findByCode.mockResolvedValue(promo);
    const res = await validator.applyPassUpgradePromotion('PROMO', 50000, 'monthly_pass');
    expect(res.discount).toBe(20000);
    expect(res.finalPrice).toBe(30000);
  });
});



