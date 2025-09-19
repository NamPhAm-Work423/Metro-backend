// Clean single suite without duplicate requires/mocks
jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../../../src/models/index.model', () => ({ PassengerDiscount: { findAll: jest.fn().mockResolvedValue([]) } }));

const StationBasedFareCalculator = require('../../../../src/services/fare/calculators/StationBasedFareCalculator');

describe('StationBasedFareCalculator', () => {
  const makeFareModel = (overrides = {}) => ({
    currency: 'VND',
    basePrice: 10000,
    calculateStationBasedPrice: jest.fn(() => 12000),
    calculatePriceForTrip: jest.fn(() => 15000),
    ...overrides,
  });

  const makeRepo = (fare, activeFares = [makeFareModel()]) => ({
    findOneByRouteAndType: jest.fn().mockResolvedValue(fare),
    findActiveFareForRoute: jest.fn().mockResolvedValue(fare),
    findActiveFares: jest.fn().mockResolvedValue(activeFares),
    findById: jest.fn().mockResolvedValue({ routeId: 'route-1' }),
  });

  const makeStationService = () => ({
    calculateStationCount: jest.fn().mockResolvedValue(3),
    findRoutesContainingStation: jest.fn().mockImplementation((station) => {
      if (station === 'A' || station === 'B') return Promise.resolve([{ routeId: 'route-1' }]);
      return Promise.resolve([]);
    }),
  });

  test('happy path computes totals', async () => {
    const fare = makeFareModel();
    const repo = makeRepo(fare);
    const station = makeStationService();
    const calc = new StationBasedFareCalculator(repo, station);
    const res = await calc.calculateStationBasedFare('A', 'B', 1, 1, 0, 0, 0, 0, 'Oneway');
    expect(res.routeId).toBe('route-1');
    expect(res.totalPassengers).toBe(2);
    expect(res.currency).toBe('VND');
  });

  test('errors when no passengers', async () => {
    const fare = makeFareModel();
    const repo = makeRepo(fare);
    const station = makeStationService();
    const calc = new StationBasedFareCalculator(repo, station);
    await expect(calc.calculateStationBasedFare('A', 'B', 0, 0, 0, 0, 0, 0, 'Oneway')).rejects.toThrow('At least one passenger is required');
  });
});


