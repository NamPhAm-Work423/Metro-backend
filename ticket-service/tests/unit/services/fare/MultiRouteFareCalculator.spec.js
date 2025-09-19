// Hoist model mock before requiring calculator
jest.mock('../../../../src/models/index.model', () => ({
  PassengerDiscount: { findAll: jest.fn().mockResolvedValue([]) },
}));

const MultiRouteFareCalculator = require('../../../../src/services/fare/calculators/MultiRouteFareCalculator');

describe('MultiRouteFareCalculator', () => {
  const makeFareModel = (overrides = {}) => ({
    fareId: 'fare-1',
    currency: 'VND',
    basePrice: 10000,
    calculateStationBasedPrice: jest.fn(() => 12000),
    calculatePriceForTrip: jest.fn(() => 15000),
    ...overrides,
  });

  const makeRepo = () => ({
    findActiveFareForRoute: jest.fn().mockResolvedValue(makeFareModel()),
  });

  const makeStationService = () => ({
    calculateStationCount: jest.fn().mockResolvedValue(2),
    findRoutesContainingStation: jest.fn().mockImplementation((station) => {
      if (station === 'A') return Promise.resolve([{ routeId: 'r1', stations: [{ stationId: 'C' }] }]);
      if (station === 'B') return Promise.resolve([{ routeId: 'r2', stations: [{ stationId: 'C' }] }]);
      return Promise.resolve([]);
    }),
    getAllRoutes: jest.fn().mockResolvedValue([
      { routeId: 'r1', stations: [{ stationId: 'C' }] },
      { routeId: 'r2', stations: [{ stationId: 'C' }] },
    ]),
  });

  const mockDiscounts = () => {};

  test('planJourney finds direct path when on same route', async () => {
    const station = makeStationService();
    // Same route for both stations
    station.findRoutesContainingStation = jest.fn().mockImplementation(() => Promise.resolve([{ routeId: 'r1' }]));
    const calc = new MultiRouteFareCalculator({}, station, {});
    const plan = await calc.planJourney('A', 'B');
    expect(plan.isDirectJourney).toBe(true);
    expect(plan.totalRoutes).toBe(1);
    expect(plan.routeSegments[0]).toMatchObject({ routeId: 'r1' });
  });

  test('planJourney builds multi-route segments through connection', async () => {
    const station = makeStationService();
    const calc = new MultiRouteFareCalculator({}, station, {});
    const plan = await calc.planJourney('A', 'B');
    expect(plan.isDirectJourney).toBe(false);
    expect(plan.totalRoutes).toBeGreaterThanOrEqual(1);
    expect(plan.connectionPoints.length).toBeGreaterThanOrEqual(1);
  });

  test('calculateJourneyFareForMultiplePassengers aggregates by segments and passengers', async () => {
    mockDiscounts();
    const station = makeStationService();
    const repo = makeRepo();
    const calc = new MultiRouteFareCalculator({}, station, repo);

    const result = await calc.calculateJourneyFareForMultiplePassengers(
      'A',
      'B',
      { numAdults: 1, numElder: 1 },
      'Oneway'
    );

    expect(result.success).toBe(true);
    expect(result.totalPassengers).toBe(2);
    expect(result.segmentFares.length).toBeGreaterThan(0);
    expect(result.passengerBreakdown.length).toBe(2);
    expect(result.totalPrice).toBeGreaterThan(0);
  });

  test('calculateJourneyFareForMultiplePassengers throws when no passengers', async () => {
    const station = makeStationService();
    const repo = makeRepo();
    const calc = new MultiRouteFareCalculator({}, station, repo);
    await expect(
      calc.calculateJourneyFareForMultiplePassengers('A', 'B', {}, 'Oneway')
    ).rejects.toThrow('At least one passenger is required');
  });
});


