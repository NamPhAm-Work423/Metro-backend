const calculator = require('../../../../src/services/ticket/calculators/TicketPriceCalculator');
const { Promotion } = require('../../../../src/models/index.model');

jest.mock('../../../../src/models/index.model', () => ({
	Promotion: { findOne: jest.fn() }
}));

describe('TicketPriceCalculator', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('throws when entry and exit are duplicate', async () => {
		await expect(calculator.calculateTotalPriceForPassengers('A','A','single',{ numAdults:1 })).rejects.toThrow('Entry and exit stations must be different');
	});

	test('no promotion applied when none provided', async () => {
		jest.spyOn(calculator.multiRouteCalculator, 'calculateJourneyFareForMultiplePassengers').mockResolvedValue({
			totalPrice: 100,
			currency: 'VND',
			totalPassengers: 1,
			journeyDetails: { isDirectJourney: true, totalRoutes: 1, totalStations: 2, routeSegments: [], connectionPoints: [] },
			passengerBreakdown: {},
			segmentFares: [],
			fareAnalysis: {}
		});
		const res = await calculator.calculateTotalPriceForPassengers('A','B','single',{ numAdults:1 });
		expect(res.data.totalPrice).toBe(100);
		expect(res.data.appliedPromotion).toBe(null);
	});

	test('invalid/expired promotion path', async () => {
		jest.spyOn(calculator.multiRouteCalculator, 'calculateJourneyFareForMultiplePassengers').mockResolvedValue({
			totalPrice: 100,
			currency: 'VND',
			totalPassengers: 1,
			journeyDetails: { isDirectJourney: true, totalRoutes: 1, totalStations: 2, routeSegments: [], connectionPoints: [] },
			passengerBreakdown: {},
			segmentFares: [],
			fareAnalysis: {}
		});
		Promotion.findOne.mockResolvedValue(null);
		const res = await calculator.calculateTotalPriceForPassengers('A','B','single',{ numAdults:1 }, { promotionCode: 'X' });
		expect(res.data.totalPrice).toBe(100);
		expect(res.data.appliedPromotion).toBe(null);
	});

	test('applicable promotion applied', async () => {
		jest.spyOn(calculator.multiRouteCalculator, 'calculateJourneyFareForMultiplePassengers').mockResolvedValue({
			totalPrice: 100,
			currency: 'VND',
			totalPassengers: 1,
			journeyDetails: { isDirectJourney: true, totalRoutes: 1, totalStations: 2, routeSegments: [], connectionPoints: [] },
			passengerBreakdown: {},
			segmentFares: [],
			fareAnalysis: {}
		});
		const promo = {
			isCurrentlyValid: () => true,
			applicableTicketTypes: [],
			applicablePassengerTypes: [],
			calculateDiscount: (base) => 10,
			promotionId: 'p1',
			promotionCode: 'X',
			name: 'name',
			type: 'flat',
			value: 10
		};
		Promotion.findOne.mockResolvedValue(promo);
		const res = await calculator.calculateTotalPriceForPassengers('A','B','single',{ numAdults:1 }, { promotionCode: 'X' });
		expect(res.data.totalPrice).toBe(90);
		expect(res.data.appliedPromotion.promotionCode).toBe('X');
	});
});
