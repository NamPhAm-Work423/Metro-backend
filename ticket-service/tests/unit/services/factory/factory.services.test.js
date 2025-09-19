jest.mock('../../../../src/services/fare/repositories/FareRepository', () => jest.fn().mockImplementation(() => ({ id: 'repo' })));
jest.mock('../../../../src/services/fare/services/StationService', () => jest.fn().mockImplementation(() => ({ id: 'station' })));
jest.mock('../../../../src/services/fare/calculators/StationBasedFareCalculator', () => jest.fn().mockImplementation(() => ({ id: 'stationCalc' })));
jest.mock('../../../../src/services/fare/calculators/PassBasedFareCalculator', () => jest.fn().mockImplementation(() => ({ id: 'passCalc' })));
jest.mock('../../../../src/services/fare/calculators/MultiRouteFareCalculator', () => jest.fn().mockImplementation(() => ({ id: 'multiCalc' })));

const FareServiceFactory = require('../../../../src/services/fare/FareServiceFactory');
const PromotionServiceFactory = require('../../../../src/services/promotion/PromotionServiceFactory');

jest.mock('../../../../src/services/promotion/repositories/PromotionRepository', () => jest.fn().mockImplementation(() => ({ id: 'promoRepo' })));
jest.mock('../../../../src/services/promotion/validators/PromotionValidator', () => jest.fn().mockImplementation(() => ({ id: 'validator' })));
jest.mock('../../../../src/services/promotion/PromotionService', () => jest.fn().mockImplementation(() => ({ type: 'promotionService' })));
jest.mock('../../../../src/services/fare/FareService', () => jest.fn().mockImplementation(() => ({ type: 'fareService' })));

describe('Service Factories', () => {
  test('FareServiceFactory.createFareService returns composed service', () => {
    const service = FareServiceFactory.createFareService();
    expect(service).toHaveProperty('type', 'fareService');
  });

  test('FareServiceFactory helpers create individual components', () => {
    expect(FareServiceFactory.createFareRepository()).toEqual({ id: 'repo' });
    expect(FareServiceFactory.createStationService()).toEqual({ id: 'station' });
    expect(FareServiceFactory.createStationBasedCalculator({},{ })).toEqual({ id: 'stationCalc' });
    expect(FareServiceFactory.createPassBasedCalculator({})).toEqual({ id: 'passCalc' });
    expect(FareServiceFactory.createMultiRouteCalculator({})).toEqual({ id: 'multiCalc' });
  });

  test('PromotionServiceFactory create methods', () => {
    const service = PromotionServiceFactory.createPromotionService();
    expect(service).toEqual({ type: 'promotionService' });
    expect(PromotionServiceFactory.createPromotionRepository()).toEqual({ id: 'promoRepo' });
    expect(PromotionServiceFactory.createPromotionValidator({})).toEqual({ id: 'validator' });
    const custom = PromotionServiceFactory.createPromotionServiceWithDependencies({ id: 'r' }, { id: 'v' });
    expect(custom).toEqual({ type: 'promotionService' });
  });
});


