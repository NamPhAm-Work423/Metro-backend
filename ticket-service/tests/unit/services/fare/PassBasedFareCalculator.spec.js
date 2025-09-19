const PassBasedFareCalculator = require('../../../../src/services/fare/calculators/PassBasedFareCalculator');

describe('PassBasedFareCalculator', () => {
  const makeFare = (overrides = {}) => ({
    currency: 'VND',
    calculatePrice: jest.fn(() => 300000),
    ...overrides,
  });

  const makeRepo = (fare) => ({
    findOneByRouteAndType: jest.fn().mockResolvedValue(fare),
  });

  test.each([
    ['day_pass', 1],
    ['weekly_pass', 7],
    ['monthly_pass', 30],
    ['yearly_pass', 365],
    ['lifetime_pass', 36500],
  ])('calculates %s with correct duration', async (passType, expectedDays) => {
    const fare = makeFare();
    const repo = makeRepo(fare);
    const calc = new PassBasedFareCalculator(repo);

    const result = await calc.calculatePassBasedFare('route-1', passType, 'adult');

    expect(repo.findOneByRouteAndType).toHaveBeenCalledWith('route-1', passType, 'adult');
    expect(fare.calculatePrice).toHaveBeenCalled();
    expect(result).toMatchObject({
      routeId: 'route-1',
      passType,
      durationDays: expectedDays,
      basePrice: 300000,
      currency: 'VND',
    });
    expect(result.pricePerDay).toBeCloseTo(300000 / expectedDays);
  });

  test('throws when fare config not found', async () => {
    const repo = makeRepo(null);
    const calc = new PassBasedFareCalculator(repo);
    await expect(calc.calculatePassBasedFare('r1', 'monthly_pass', 'adult')).rejects.toThrow('No fare configuration');
  });

  test('throws on invalid pass type', async () => {
    const fare = makeFare();
    const repo = makeRepo(fare);
    const calc = new PassBasedFareCalculator(repo);
    await expect(calc.calculatePassBasedFare('r1', 'unknown', 'adult')).rejects.toThrow('Invalid pass type');
  });
});


