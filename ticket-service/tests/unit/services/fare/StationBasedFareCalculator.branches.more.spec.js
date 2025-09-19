const StationBasedFareCalculator = require('../../../../src/services/fare/calculators/StationBasedFareCalculator');

jest.mock('../../../../src/models/index.model', () => ({
	PassengerDiscount: { findAll: jest.fn() },
	Ticket: { findByPk: jest.fn() }
}));

const { PassengerDiscount, Ticket } = require('../../../../src/models/index.model');

const buildFare = (overrides = {}) => ({
	currency: 'VND',
	basePrice: 10000,
	calculateStationBasedPrice: jest.fn().mockImplementation((n) => 1000 * n),
	calculatePriceForTrip: jest.fn().mockImplementation((n, tripType) => (tripType === 'Return' ? 1.5 : 1) * (1000 * n)),
	...overrides,
});

describe('StationBasedFareCalculator branches', () => {
	let fareRepository;
	let stationService;
	let calc;

	beforeEach(() => {
		fareRepository = {
			findActiveFareForRoute: jest.fn().mockResolvedValue(buildFare()),
			findActiveFares: jest.fn().mockResolvedValue([buildFare()]),
			findOneByRouteAndType: jest.fn().mockResolvedValue(buildFare()),
			findById: jest.fn().mockResolvedValue({ routeId: 'R1' })
		};
		stationService = {
			calculateStationCount: jest.fn().mockResolvedValue(3),
			findRoutesContainingStation: jest.fn().mockImplementation((s) => Promise.resolve(s === 'A' ? [{ routeId: 'R1' }] : s === 'B' ? [{ routeId: 'R1' }] : []) )
		};
		calc = new StationBasedFareCalculator(fareRepository, stationService);
		PassengerDiscount.findAll.mockResolvedValue([]);
	});

	test('getPassengerMultipliers: builds defaults and applies known types and fallbacks', async () => {
		PassengerDiscount.findAll.mockResolvedValue([
			{ passengerType: 'elder', discountType: 'percentage', discountValue: '50', isCurrentlyValid: () => true },
			{ passengerType: 'teenager', discountType: 'fixed_amount', discountValue: '5000', isCurrentlyValid: () => true },
			{ passengerType: 'child', discountType: 'free', discountValue: '0', isCurrentlyValid: () => true },
			{ passengerType: 'student', discountType: 'unknown', discountValue: '0', isCurrentlyValid: () => true },
			{ passengerType: 'senior', discountType: 'percentage', discountValue: '10', isCurrentlyValid: () => false },
		]);
		const m = await calc.getPassengerMultipliers();
		expect(m.adult).toBe(1.0);
		expect(m.elder).toBeCloseTo(0.5);
		expect(m.teenager).toBeCloseTo(0.8);
		expect(m.child).toBe(0);
		expect(m.student).toBe(1.0);
		expect(m.senior).toBe(1.0);
	});

	test('calculateStationBasedFare: covers all passenger breakdown branches and rounding', async () => {
		const res = await calc.calculateStationBasedFare('A','B', 2,1,1,1,1,1, 'Return');
		expect(res.totalPassengers).toBe(7);
		expect(res.priceBreakdown.tripMultiplier).toBe(1.5);
		expect(res.passengerBreakdown.length).toBe(6);
	});

	test('calculateStationBasedFare: errors when from station not in any route', async () => {
		stationService.findRoutesContainingStation = jest.fn().mockImplementation((s) => Promise.resolve(s === 'A' ? [] : [{ routeId: 'R1' }]) );
		await expect(calc.calculateStationBasedFare('A','B',1,0,0,0,0,0)).rejects.toThrow('Station A not found in any route');
	});

	test('calculateStationBasedFare: errors when to station not in any route', async () => {
		stationService.findRoutesContainingStation = jest.fn().mockImplementation((s) => Promise.resolve(s === 'A' ? [{ routeId: 'R1' }] : []) );
		await expect(calc.calculateStationBasedFare('A','B',1,0,0,0,0,0)).rejects.toThrow('Station B not found in any route');
	});

	test('calculateStationBasedFare: errors when no passengers', async () => {
		await expect(calc.calculateStationBasedFare('A','B',0,0,0,0,0,0)).rejects.toThrow('At least one passenger is required');
	});

	test('calculateStationBasedFare: throws when no common route', async () => {
		stationService.findRoutesContainingStation = jest.fn().mockImplementation((s) => Promise.resolve(s === 'A' ? [{ routeId: 'R1' }] : [{ routeId: 'R2' }]) );
		await expect(calc.calculateStationBasedFare('A','B',1)).rejects.toThrow('Multi-route journey detected');
	});

	test('calculateStationBasedFare: falls back when no base fare for route and throws when none active', async () => {
		fareRepository.findActiveFareForRoute.mockResolvedValue(null);
		fareRepository.findActiveFares.mockResolvedValue([]);
		await expect(calc.calculateStationBasedFare('A','B',1)).rejects.toThrow('No active fares found in the system');
	});

	test('calculateSinglePassengerFare: throws when fare not found', async () => {
		fareRepository.findOneByRouteAndType.mockResolvedValue(null);
		await expect(calc.calculateSinglePassengerFare('R1','A','B','adult','Oneway')).rejects.toThrow('No valid fare found for route R1');
	});

	test('validateExitStation: allows pass tickets, matches destination, and computes additional fare', async () => {
		// pass ticket
		Ticket.findByPk.mockResolvedValue({ ticketType: 'day_pass' });
		let res = await calc.validateExitStation('T1','S2');
		expect(res.canExit).toBe(true);
		// match destination
		Ticket.findByPk.mockResolvedValue({ ticketType: 'single', destinationStationId: 'S2' });
		res = await calc.validateExitStation('T1','S2');
		expect(res.canExit).toBe(true);
		// additional fare path
		Ticket.findByPk.mockResolvedValue({ ticketType: 'single', destinationStationId: 'S3', fareId: 'F1' });
		fareRepository.findById.mockResolvedValue({ routeId: 'R1' });
		await expect(calc.validateExitStation('T1','S4')).resolves.toHaveProperty('additionalFare');
	});

	test('validateExitStation: errors when ticket missing or fare missing', async () => {
		Ticket.findByPk.mockResolvedValue(null);
		await expect(calc.validateExitStation('T1','S2')).rejects.toThrow('Ticket not found');
		Ticket.findByPk.mockResolvedValue({ ticketType: 'single', destinationStationId: 'S3', fareId: 'F1' });
		fareRepository.findById.mockResolvedValue(null);
		await expect(calc.validateExitStation('T1','S4')).rejects.toThrow('Fare information not found for ticket');
	});

	test('unimplemented methods throw', async () => {
		await expect(calc.calculatePassBasedFare('R1','monthly_pass')).rejects.toThrow('not implemented');
		await expect(calc.calculateMultiRouteFare([])).rejects.toThrow('not implemented');
	});
});

