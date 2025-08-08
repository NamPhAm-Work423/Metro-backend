const models = require('../../src/models/index.model');
const { Stop, Trip, Station, Route, Train } = models;
const stopService = require('../../src/services/stop.service');

describe('stop.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createStop creates stop', async () => {
    const payload = { tripId: 't1' };
    const created = { stopId: 'st1', ...payload };
    Stop.create.mockResolvedValue(created);
    const result = await stopService.createStop(payload);
    expect(Stop.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('createMultipleStops bulk creates', async () => {
    const payload = [{ tripId: 't1' }];
    Stop.bulkCreate.mockResolvedValue(payload);
    const result = await stopService.createMultipleStops(payload);
    expect(Stop.bulkCreate).toHaveBeenCalledWith(payload);
    expect(result).toBe(payload);
  });

  test('getAllStops applies filters', async () => {
    await stopService.getAllStops({ tripId: 't1', stationId: 's1' });
    expect(Stop.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getStopById returns stop', async () => {
    const stop = { stopId: 'st1' };
    Stop.findByPk.mockResolvedValue(stop);
    const result = await stopService.getStopById('st1');
    expect(result).toBe(stop);
  });

  test('getStopById throws when not found', async () => {
    Stop.findByPk.mockResolvedValue(null);
    await expect(stopService.getStopById('missing')).rejects.toThrow('Stop not found');
  });

  test('updateStop updates and returns', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ stopId: 'st1' }) };
    Stop.findByPk.mockResolvedValue(instance);
    const result = await stopService.updateStop('st1', { sequence: 2 });
    expect(instance.update).toHaveBeenCalledWith({ sequence: 2 });
    expect(result).toEqual({ stopId: 'st1' });
  });

  test('deleteStop destroys and returns message', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    Stop.findByPk.mockResolvedValue(instance);
    const result = await stopService.deleteStop('st1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Stop deleted successfully' });
  });

  test('getStopsByTrip returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    await stopService.getStopsByTrip('t1');
    expect(Stop.findAll).toHaveBeenCalled();
  });

  test('getStopsByStation returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    await stopService.getStopsByStation('s1');
    expect(Stop.findAll).toHaveBeenCalled();
  });

  test('getStopsByTimeRange returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    await stopService.getStopsByTimeRange('09:00', '10:00', 'Mon');
    expect(Stop.findAll).toHaveBeenCalled();
  });

  test('getTripScheduleWithStops returns mapped schedule', async () => {
    const trip = { 
      Route: { routeId: 'r1', name: 'A', distance: 1, duration: 2 },
      Train: { name: 'T1', type: 'E', capacity: 100 },
      stops: [],
      dayOfWeek: 'Mon'
    };
    Stop.findByPk = jest.fn();
    // Service uses Trip.findByPk, but mapping first ensures mocked shape
    models.Trip.findByPk = jest.fn().mockResolvedValue(trip);
    const result = await stopService.getTripScheduleWithStops('t1');
    expect(result.tripInfo.routeName).toBe('A');
  });

  test('getNextStopsAtStation returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    await stopService.getNextStopsAtStation('s1', '09:00', 'Mon', 5);
    expect(Stop.findAll).toHaveBeenCalled();
  });

  test('validateStopSequence validates', async () => {
    const stops = [
      { sequence: 1, departureTime: '09:00' },
      { sequence: 2, arrivalTime: '09:10', departureTime: '09:12' },
      { sequence: 3, arrivalTime: '09:20' },
    ];
    const result = await stopService.validateStopSequence('t1', stops);
    expect(result.valid).toBe(true);
  });
});



