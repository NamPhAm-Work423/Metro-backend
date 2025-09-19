const MultiRouteFareCalculator = require('../../../../src/services/fare/calculators/MultiRouteFareCalculator');

jest.mock('../../../../src/models/index.model', () => ({
	PassengerDiscount: { findAll: jest.fn() }
}));

const { PassengerDiscount } = require('../../../../src/models/index.model');

const buildFare = (overrides = {}) => ({
	fareId: 'F1',
	currency: 'VND',
	basePrice: 10000,
	calculateStationBasedPrice: jest.fn().mockImplementation((n) => 1000 * n),
	calculatePriceForTrip: jest.fn().mockImplementation((n, tripType) => (tripType === 'Return' ? 1.5 : 1) * (1000 * n)),
	...overrides,
});

describe('MultiRouteFareCalculator extra branches', () => {
	let stationService;
	let fareRepository;
	let calculator;

	beforeEach(() => {
		stationService = {
			findRoutesContainingStation: jest.fn(),
			calculateStationCount: jest.fn().mockResolvedValue(3),
			getAllRoutes: jest.fn()
		};
		fareRepository = {
			findActiveFareForRoute: jest.fn().mockResolvedValue(buildFare())
		};
		calculator = new MultiRouteFareCalculator(null, stationService, fareRepository);
		PassengerDiscount.findAll.mockResolvedValue([]);
	});

	test('getPassengerMultipliers covers discount types and invalid/expired', async () => {
		PassengerDiscount.findAll.mockResolvedValue([
			{ passengerType: 'elder', discountType: 'percentage', discountValue: '25', isCurrentlyValid: () => true },
			{ passengerType: 'teenager', discountType: 'fixed_amount', discountValue: '5000', isCurrentlyValid: () => true },
			{ passengerType: 'child', discountType: 'free', discountValue: '0', isCurrentlyValid: () => true },
			{ passengerType: 'student', discountType: 'unknown', discountValue: '0', isCurrentlyValid: () => true },
			{ passengerType: 'senior', discountType: 'percentage', discountValue: '50', isCurrentlyValid: () => false }
		]);
		const m = await calculator.getPassengerMultipliers();
		expect(m.elder).toBeCloseTo(0.75);
		expect(m.teenager).toBeCloseTo(0.8);
		expect(m.child).toBe(0);
		expect(m.student).toBe(1.0);
		expect(m.senior).toBe(1.0);
	});

	test('getPassengerMultipliers falls back on error', async () => {
		PassengerDiscount.findAll.mockRejectedValue(new Error('db down'));
		const m = await calculator.getPassengerMultipliers();
		expect(m.adult).toBe(1.0);
		expect(m.child).toBe(1.0);
	});

	test('findConnections returns [] on invalid inputs', () => {
		expect(calculator.findConnections(null, null)).toEqual([]);
		expect(calculator.findConnections({}, [])).toEqual([]);
		expect(calculator.findConnections([], {})).toEqual([]);
	});

	test('planJourney builds single segment fallback when no endRoute connects', async () => {
		stationService.findRoutesContainingStation.mockResolvedValueOnce([{ routeId: 'R1', stations: [{ stationId: 'S1' }] }]);
		stationService.findRoutesContainingStation.mockResolvedValueOnce([{ routeId: 'R2', stations: [{ stationId: 'S9' }] }]);
		stationService.getAllRoutes.mockResolvedValue([{ routeId: 'R1', stations: [{ stationId: 'S1' }] }, { routeId: 'R2', stations: [{ stationId: 'S9' }] }]);
		const plan = await calculator.planJourney('S1','S9');
		expect(plan.isDirectJourney).toBe(false);
		expect(plan.routeSegments.length).toBe(1);
		expect(plan.routeSegments[0]).toMatchObject({ routeId: 'R1', originStationId: 'S1', destinationStationId: 'S9' });
	});

	test('calculateJourneyFareForMultiplePassengers throws when no active fare for a segment', async () => {
		stationService.findRoutesContainingStation.mockResolvedValueOnce([{ routeId: 'R1', stations: [{ stationId: 'A' }] }]);
		stationService.findRoutesContainingStation.mockResolvedValueOnce([{ routeId: 'R1', stations: [{ stationId: 'B' }] }]);
		fareRepository.findActiveFareForRoute.mockResolvedValue(null);
		await expect(calculator.calculateJourneyFareForMultiplePassengers('A','B',{ numAdults: 1 }, 'Oneway')).rejects.toThrow('No active fare found for route R1');
	});
});
