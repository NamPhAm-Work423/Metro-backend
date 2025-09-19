jest.mock('../../../../src/events/ticket.producer', () => ({ publishTicketActivated: jest.fn() }));
jest.mock('../../../../src/models/index.model', () => ({
  Ticket: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
  Fare: { findOne: jest.fn() },
  Promotion: { findByPk: jest.fn() },
  TransitPass: {},
  PassengerDiscount: {},
}));

const TicketService = require('../../../../src/services/ticket/services/TicketService');

describe('TicketService private helpers', () => {
  const service = require('../../../../src/services/ticket/services/TicketService');

  test('_getRedirectUrls builds from env and overrides', () => {
    process.env.PUBLIC_FRONTEND_URL = 'https://app.example.com/';
    const { success, fail } = service._getRedirectUrls({ paymentSuccessUrl: 'https://x/s', paymentFailUrl: 'https://x/f' });
    expect(success).toBe('https://x/s');
    expect(fail).toBe('https://x/f');
    const def = service._getRedirectUrls({});
    expect(def.success).toMatch('/payment/success');
    expect(def.fail).toMatch('/payment/fail');
  });

  test('_normalizePromotion extracts code from shapes', () => {
    expect(service._normalizePromotion({ promotionCode: 'A' })).toBe('A');
    expect(service._normalizePromotion({ promotion: { code: 'B' } })).toBe('B');
    expect(service._normalizePromotion({ promotionData: { promotionCode: 'C' } })).toBe('C');
    expect(service._normalizePromotion({})).toBeNull();
  });

  test('_validatePassengerCounts throws when zero', () => {
    expect(() => service._validatePassengerCounts({})).toThrow('At least one passenger');
    expect(service._validatePassengerCounts({ numAdults: 1, numChild: 1 })).toBe(2);
  });
});


