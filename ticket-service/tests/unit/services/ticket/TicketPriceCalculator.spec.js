const Calculator = require('../../../../src/services/ticket/calculators/TicketPriceCalculator');

jest.mock('../../../../src/services/fare/FareServiceFactory', () => ({
  createFareService: () => ({
    stationService: {},
    fareRepository: {},
  }),
}));

jest.mock('../../../../src/services/fare/calculators/MultiRouteFareCalculator', () => {
  return jest.fn().mockImplementation(() => ({
    calculateJourneyFareForMultiplePassengers: jest.fn(async () => ({
      totalPrice: 100000,
      currency: 'VND',
      totalPassengers: 2,
      journeyDetails: { isDirectJourney: true, totalRoutes: 1, totalStations: 5, routeSegments: [], connectionPoints: [] },
      passengerBreakdown: [],
      segmentFares: [],
      fareAnalysis: {},
    })),
  }));
});

jest.mock('../../../../src/models/index.model', () => ({
  Promotion: {
    findOne: jest.fn(async ({ where }) => {
      if (where.promotionCode === 'VALID') {
        return {
          promotionId: 'pid',
          promotionCode: 'VALID',
          name: 'Valid Promo',
          type: 'percentage',
          value: 10,
          isCurrentlyValid: () => true,
          applicableTicketTypes: [],
          applicablePassengerTypes: [],
          calculateDiscount: (base) => base * 0.1,
        };
      }
      if (where.promotionCode === 'EXPIRED') {
        return { isCurrentlyValid: () => false };
      }
      return null;
    }),
  },
}));

jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

describe('TicketPriceCalculator', () => {
  test('applyPromotionToPrice applies valid promotion', async () => {
    const result = await Calculator.applyPromotionToPrice(100000, { promotionCode: 'VALID' }, 'adult', 'Oneway');
    expect(result.finalPrice).toBe(90000);
    expect(result.discountAmount).toBe(10000);
    expect(result.promotion.promotionCode).toBe('VALID');
  });

  test('applyPromotionToPrice warns on invalid/expired promo and keeps price', async () => {
    const result = await Calculator.applyPromotionToPrice(50000, { promotionCode: 'EXPIRED' }, 'adult', 'Oneway');
    expect(result.finalPrice).toBe(50000);
    expect(result.discountAmount).toBe(0);
    expect(result.promotion).toBeNull();
  });

  test('calculateTotalPriceForPassengers throws on duplicate station IDs', async () => {
    await expect(Calculator.calculateTotalPriceForPassengers('S1', 'S1', 'Oneway', { numAdults: 1 })).rejects.toHaveProperty('code', 'DUPLICATE_STATION');
  });

  test('calculateTotalPriceForPassengers integrates with promotion', async () => {
    const res = await Calculator.calculateTotalPriceForPassengers('S1', 'S2', 'Oneway', { numAdults: 2 }, { promotionCode: 'VALID' });
    expect(res.success).toBe(true);
    expect(res.data.totalPrice).toBe(90000);
    expect(res.data.totalDiscountAmount).toBe(10000);
    expect(res.data.appliedPromotion.promotionCode).toBe('VALID');
  });
});


