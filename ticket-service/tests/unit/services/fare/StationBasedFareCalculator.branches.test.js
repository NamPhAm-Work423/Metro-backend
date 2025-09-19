const StationBasedFareCalculator = require('../../../../src/services/fare/calculators/StationBasedFareCalculator');

// Mocks
jest.mock('../../../../src/models/index.model', () => ({
	PassengerDiscount: { findAll: jest.fn() },
	Ticket: { findByPk: jest.fn() },
}));

describe('StationBasedFareCalculator branches', () => {
	let fareRepository;
	let stationService;
	let calc;

	beforeEach(() => {
		fareRepository = {
			findOneByRouteAndType: jest.fn(),
			findActiveFareForRoute: jest.fn(),
			findActiveFares: jest.fn(),
			findById: jest.fn(),
		};
		stationService = {
			calculateStationCount: jest.fn(),
			findRoutesContainingStation: jest.fn(),
		};
		calc = new StationBasedFareCalculator(fareRepository, stationService);
	});

	test('calculateStationBasedFare throws when total passengers is 0', async () => {
		await expect(calc.calculateStationBasedFare('A', 'B', 0, 0, 0, 0, 0, 0)).rejects.toThrow('At least one passenger is required');
	});

	test('calculateStationBasedFare throws when fromRoutes empty', async () => {
		stationService.findRoutesContainingStation
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([{ routeId: 'R1' }]);
		await expect(calc.calculateStationBasedFare('S1', 'S2', 1)).rejects.toThrow('Station S1 not found in any route');
	});

	test('calculateStationBasedFare throws when toRoutes empty', async () => {
		stationService.findRoutesContainingStation
			.mockResolvedValueOnce([{ routeId: 'R1' }])
			.mockResolvedValueOnce([]);
		await expect(calc.calculateStationBasedFare('S1', 'S2', 1)).rejects.toThrow('Station S2 not found in any route');
	});

	test('calculateStationBasedFare throws when no common route (multi-route)', async () => {
		stationService.findRoutesContainingStation
			.mockResolvedValueOnce([{ routeId: 'R1' }])
			.mockResolvedValueOnce([{ routeId: 'R2' }]);
		await expect(calc.calculateStationBasedFare('S1', 'S2', 1)).rejects.toThrow('Multi-route journey detected');
	});

	function buildFare(basePrice = 10000, currency = 'VND') {
		return {
			currency,
			basePrice,
			calculateStationBasedPrice: jest.fn().mockImplementation(() => basePrice),
			calculatePriceForTrip: jest.fn().mockImplementation((_stations, tripType) => (tripType === 'Return' ? basePrice * 1.5 : basePrice)),
		};
	}

	test('calculateStationBasedFare falls back to active fares then throws when none', async () => {
		stationService.findRoutesContainingStation.mockResolvedValueOnce([{ routeId: 'R1' }]).mockResolvedValueOnce([{ routeId: 'R1' }]);
		fareRepository.findActiveFareForRoute.mockResolvedValueOnce(null);
		fareRepository.findActiveFares.mockResolvedValueOnce([]);
		await expect(calc.calculateStationBasedFare('S1', 'S2', 1)).rejects.toThrow('No active fares found in the system');
	});

	test('getPassengerMultipliers falls back to defaults on error', async () => {
		const { PassengerDiscount } = require('../../../../src/models/index.model');
		PassengerDiscount.findAll.mockRejectedValueOnce(new Error('db fail'));
		const result = await calc.getPassengerMultipliers();
		expect(result).toMatchObject({ adult: 1, child: 1, student: 1 });
	});

	test('calculateSinglePassengerFare throws when base fare not found', async () => {
		stationService.calculateStationCount.mockResolvedValueOnce(5);
		fareRepository.findOneByRouteAndType.mockResolvedValueOnce(null);
		await expect(calc.calculateSinglePassengerFare('R1', 'S1', 'S2', 'adult', 'Oneway')).rejects.toThrow('No valid fare found');
	});

	test('validateExitStation: ticket not found -> throws', async () => {
		const { Ticket } = require('../../../../src/models/index.model');
		Ticket.findByPk.mockResolvedValueOnce(null);
		await expect(calc.validateExitStation('T1', 'E1')).rejects.toThrow('Ticket not found');
	});

	test('validateExitStation: pass ticket allows exit', async () => {
		const { Ticket } = require('../../../../src/models/index.model');
		Ticket.findByPk.mockResolvedValueOnce({ ticketType: 'monthly_pass' });
		const result = await calc.validateExitStation('T1', 'E1');
		expect(result).toEqual({ canExit: true });
	});

	test('validateExitStation: destination matches exit -> canExit true', async () => {
		const { Ticket } = require('../../../../src/models/index.model');
		Ticket.findByPk.mockResolvedValueOnce({ ticketType: 'short_term', destinationStationId: 'E1' });
		const result = await calc.validateExitStation('T1', 'E1');
		expect(result).toEqual({ canExit: true });
	});

	test('validateExitStation: calculate additional fare when exit differs', async () => {
		const { Ticket } = require('../../../../src/models/index.model');
		Ticket.findByPk.mockResolvedValueOnce({ ticketType: 'short_term', destinationStationId: 'D1', fareId: 'F1' });
		fareRepository.findById.mockResolvedValueOnce({ routeId: 'R1' });
		jest.spyOn(calc, 'calculateSinglePassengerFare').mockResolvedValueOnce({ basePrice: 5000 });
		const result = await calc.validateExitStation('T1', 'E1');
		expect(calc.calculateSinglePassengerFare).toHaveBeenCalledWith('R1', 'D1', 'E1', 'adult', 'Oneway');
		expect(result).toEqual({ canExit: false, additionalFare: 5000, message: 'Additional fare payment required' });
	});
});


