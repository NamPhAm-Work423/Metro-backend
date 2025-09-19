const FareService = require('../../../../src/services/fare/FareService');

jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

describe('FareService', () => {
  let fareRepository;
  let stationService;
  let calculators;
  let service;

  beforeEach(() => {
    fareRepository = {
      create: jest.fn().mockResolvedValue({ fareId: 'f1' }),
      findAll: jest.fn().mockResolvedValue([{ fareId: 'f1', basePrice: 10000, currency: 'VND', isActive: true, routeId: 'r1' }]),
      findById: jest.fn().mockResolvedValue({ fareId: 'f1', basePrice: 10000, currency: 'VND', isCurrentlyValid: () => true, calculatePrice: () => 12000 }),
      update: jest.fn().mockResolvedValue({ fareId: 'f1', basePrice: 11000 }),
      delete: jest.fn().mockResolvedValue(true),
      findActiveFares: jest.fn().mockResolvedValue([{ fareId: 'f1', isActive: true }]),
      getStatistics: jest.fn().mockResolvedValue({ total: 1 }),
      bulkUpdate: jest.fn().mockResolvedValue(2),
      findByRoute: jest.fn().mockResolvedValue([{ fareId: 'f1', routeId: 'r1', basePrice: 10000, currency: 'VND', isActive: true }])
    };

    stationService = {
      calculateStationCount: jest.fn().mockResolvedValue(5),
      findRoutesContainingStation: jest.fn().mockResolvedValue([{ routeId: 'r1' }])
    };

    calculators = {
      stationBased: {
        calculateSinglePassengerFare: jest.fn().mockResolvedValue(20000),
        calculateStationBasedFare: jest.fn().mockResolvedValue({ total: 50000 }),
        validateExitStation: jest.fn().mockResolvedValue({ valid: true })
      },
      passBased: {
        calculatePassBasedFare: jest.fn().mockResolvedValue(15000)
      },
      multiRoute: {
        calculateMultiRouteFare: jest.fn().mockResolvedValue(30000),
        calculateJourneyFare: jest.fn().mockResolvedValue({ totalPrice: 40000 }),
        calculateJourneyFareForMultiplePassengers: jest.fn().mockResolvedValue({ totalPrice: 80000 })
      }
    };

    service = new FareService(fareRepository, stationService, calculators);
  });

  test('CRUD and simple queries delegate to repository', async () => {
    await expect(service.createFare({})).resolves.toEqual({ fareId: 'f1' });
    expect(fareRepository.create).toHaveBeenCalled();

    await service.getAllFares({ isActive: true });
    expect(fareRepository.findAll).toHaveBeenCalled();

    await service.getFareById('f1');
    expect(fareRepository.findById).toHaveBeenCalledWith('f1');

    await service.updateFare('f1', { basePrice: 11000 });
    expect(fareRepository.update).toHaveBeenCalled();

    await service.deleteFare('f1');
    expect(fareRepository.delete).toHaveBeenCalledWith('f1');

    await service.getActiveFares();
    expect(fareRepository.findActiveFares).toHaveBeenCalled();

    await service.getFareStatistics({});
    expect(fareRepository.getStatistics).toHaveBeenCalled();

    await service.bulkUpdateFares({}, { isActive: false });
    expect(fareRepository.bulkUpdate).toHaveBeenCalled();

    await service.getFaresByRoute('r1');
    expect(fareRepository.findByRoute).toHaveBeenCalledWith('r1', {});
  });

  test('getFaresBetweenStations returns active fares ordered and handles errors', async () => {
    const res = await service.getFaresBetweenStations('s1', 's2');
    expect(res[0].fareId).toBe('f1');

    fareRepository.findAll.mockRejectedValueOnce(new Error('db'));
    await expect(service.getFaresBetweenStations('s1', 's2')).rejects.toThrow('db');
  });

  test('getFaresByZone returns active fares and handles errors', async () => {
    const res = await service.getFaresByZone(['Z1']);
    expect(res[0].fareId).toBe('f1');

    fareRepository.findAll.mockRejectedValueOnce(new Error('db2'));
    await expect(service.getFaresByZone(['Z1'])).rejects.toThrow('db2');
  });

  test('calculateFarePrice returns structured price or throws on missing/invalid fare', async () => {
    const ok = await service.calculateFarePrice('f1');
    expect(ok).toMatchObject({ fareId: 'f1', finalPrice: 12000, currency: 'VND' });

    fareRepository.findById.mockResolvedValueOnce(null);
    await expect(service.calculateFarePrice('missing')).rejects.toThrow('Fare not found');

    fareRepository.findById.mockResolvedValueOnce({ isCurrentlyValid: () => false });
    await expect(service.calculateFarePrice('invalid')).rejects.toThrow('Fare is not currently valid');
  });

  test('delegated calculations', async () => {
    await service.calculateStationCount('r1', 's1', 's2');
    expect(stationService.calculateStationCount).toHaveBeenCalled();

    await service.calculateSinglePassengerFare('r1', 's1', 's2');
    expect(calculators.stationBased.calculateSinglePassengerFare).toHaveBeenCalled();

    await service.calculateStationBasedFare('s1', 's2');
    expect(calculators.stationBased.calculateStationBasedFare).toHaveBeenCalled();

    await service.calculatePassBasedFare('r1', 'monthly', 'adult');
    expect(calculators.passBased.calculatePassBasedFare).toHaveBeenCalled();

    await service.calculateMultiRouteFare([{ routeId: 'r1' }]);
    expect(calculators.multiRoute.calculateMultiRouteFare).toHaveBeenCalled();

    await service.calculateJourneyFare('s1', 's2');
    expect(calculators.multiRoute.calculateJourneyFare).toHaveBeenCalled();

    await service.calculateJourneyFareForMultiplePassengers('s1', 's2', { adult: 1 });
    expect(calculators.multiRoute.calculateJourneyFareForMultiplePassengers).toHaveBeenCalled();

    await service.validateExitStation('t1', 's2');
    expect(calculators.stationBased.validateExitStation).toHaveBeenCalled();

    await service.findRoutesContainingStation('S1');
    expect(stationService.findRoutesContainingStation).toHaveBeenCalledWith('S1');
  });

  test('getRouteFareDetails groups fares by route and handles errors', async () => {
    fareRepository.findByRoute.mockResolvedValueOnce([
      { fareId: 'f1', routeId: 'r1', basePrice: 1, currency: 'VND', isActive: true },
      { fareId: 'f2', routeId: 'r1', basePrice: 2, currency: 'VND', isActive: false }
    ]);
    const res = await service.getRouteFareDetails('r1');
    expect(res.routeId).toBe('r1');
    expect(res.fareRoutes['r1'].length).toBe(2);
    expect(res.currency).toBe('VND');

    fareRepository.findByRoute.mockRejectedValueOnce(new Error('oops'));
    await expect(service.getRouteFareDetails('rX')).rejects.toThrow('oops');
  });
});


