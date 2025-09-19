const PromotionValidator = require('../../../../src/services/promotion/validators/PromotionValidator');

describe('PromotionValidator extra branches', () => {
	let repo;
	let validator;

	beforeEach(() => {
		repo = { findByCode: jest.fn(), findById: jest.fn() };
		validator = new PromotionValidator(repo);
	});

	function buildPromotion(overrides = {}) {
		return {
			promotionId: 'P1',
			promotionCode: 'CODE',
			name: 'Promo',
			type: 'percentage',
			value: 10,
			usageLimit: null,
			usageCount: 0,
			validFrom: new Date(Date.now() - 3600_000),
			validUntil: new Date(Date.now() + 3600_000),
			applicableTicketTypes: [],
			applicablePassengerTypes: [],
			applicableRoutes: [],
			isCurrentlyValid: jest.fn().mockReturnValue(true),
			isValidForDateTime: jest.fn().mockReturnValue(true),
			calculateDiscount: jest.fn().mockImplementation((price) => Math.round(price * 0.1)),
			incrementUsage: jest.fn().mockResolvedValue(),
			...overrides,
		};
	}

	test('validatePromotion: usage limit exceeded when not currently valid', async () => {
		const promo = buildPromotion({ isCurrentlyValid: jest.fn().mockReturnValue(false), usageLimit: 1, usageCount: 1 });
		repo.findByCode.mockResolvedValueOnce(promo);
		const out = await validator.validatePromotion('CODE', {});
		expect(out.valid).toBe(false);
		expect(out.reason).toMatch(/usage limit/i);
	});

	test('validatePromotion: not yet active and expired branches', async () => {
		const now = Date.now();
		const notYet = buildPromotion({ isCurrentlyValid: jest.fn().mockReturnValue(false), validFrom: new Date(now + 3600_000), validUntil: new Date(now + 7200_000) });
		repo.findByCode.mockResolvedValueOnce(notYet);
		let out = await validator.validatePromotion('CODE', {});
		expect(out.valid).toBe(false);
		expect(out.reason).toMatch(/not yet active/i);

		const expired = buildPromotion({ isCurrentlyValid: jest.fn().mockReturnValue(false), validFrom: new Date(now - 7200_000), validUntil: new Date(now - 3600_000) });
		repo.findByCode.mockResolvedValueOnce(expired);
		out = await validator.validatePromotion('CODE', {});
		expect(out.valid).toBe(false);
		expect(out.reason).toMatch(/expired/i);
	});

	test('validatePromotion: dateTime invalid branch', async () => {
		const promo = buildPromotion({ isValidForDateTime: jest.fn().mockReturnValue(false) });
		repo.findByCode.mockResolvedValueOnce(promo);
		const out = await validator.validatePromotion('CODE', { dateTime: new Date() });
		expect(out.valid).toBe(false);
		expect(out.reason).toMatch(/date\/time/i);
	});

	test('validatePromotion: ticket/passenger/route restrictions', async () => {
		const promo = buildPromotion({ applicableTicketTypes: ['short'], applicablePassengerTypes: ['adult'], applicableRoutes: ['R1'] });
		repo.findByCode.mockResolvedValue(promo);
		let out = await validator.validatePromotion('CODE', { ticketType: 'long' });
		expect(out.valid).toBe(false);
		out = await validator.validatePromotion('CODE', { ticketType: 'short', passengerType: 'child' });
		expect(out.valid).toBe(false);
		out = await validator.validatePromotion('CODE', { ticketType: 'short', passengerType: 'adult', routeId: 'R2' });
		expect(out.valid).toBe(false);
	});

	test('validatePromotion: minPurchase branch', async () => {
		const promo = buildPromotion({ minPurchaseAmount: 100000 });
		repo.findByCode.mockResolvedValueOnce(promo);
		const out = await validator.validatePromotion('CODE', { purchaseAmount: 50000 });
		expect(out.valid).toBe(false);
	});

	test('validatePromotion: free_upgrade sets upgradeToType', async () => {
		const promo = buildPromotion({ type: 'free_upgrade' });
		repo.findByCode.mockResolvedValueOnce(promo);
		const out = await validator.validatePromotion('CODE', { ticketType: 'day_pass' });
		expect(out.valid).toBe(true);
		expect(out.promotion.upgradeToType).toBe('weekly_pass');
	});
});


