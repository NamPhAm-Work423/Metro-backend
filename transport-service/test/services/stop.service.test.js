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
    // Ensure Trip exists so service proceeds to Stop.findAll
    Trip.findByPk = jest.fn().mockResolvedValue({ tripId: 't1' });
    Stop.findAll.mockResolvedValue([]);
    await stopService.getStopsByTrip('t1');
    expect(Stop.findAll).toHaveBeenCalled();
  });

  test('getStopsByStation returns list', async () => {
    // Ensure Station exists so service proceeds to Stop.findAll
    Station.findByPk = jest.fn().mockResolvedValue({ stationId: 's1' });
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

// Additional positive cases (previously in extra file)
describe('stop.service extra', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getStopsByTimeRange returns list', async () => {
    Stop.findAll.mockResolvedValue([]);
    const result = await stopService.getStopsByTimeRange('08:00', '09:00', 'Monday');
    expect(Stop.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getNextStopsAtStation applies limit', async () => {
    Stop.findAll.mockResolvedValue([]);
    const result = await stopService.getNextStopsAtStation('st1', '08:00', 'Monday', 3);
    expect(Stop.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

// Error paths (previously in extra2 file)
describe('stop.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createStop rejects', async () => {
    Stop.create.mockRejectedValue(new Error('db'));
    await expect(stopService.createStop({})).rejects.toThrow('db');
  });

  test('createMultipleStops rejects', async () => {
    Stop.bulkCreate.mockRejectedValue(new Error('db'));
    await expect(stopService.createMultipleStops([{}])).rejects.toThrow('db');
  });

  test('getAllStops rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(stopService.getAllStops({})).rejects.toThrow('db');
  });

  test('getStopById rejects', async () => {
    Stop.findByPk.mockRejectedValue(new Error('db'));
    await expect(stopService.getStopById('x')).rejects.toThrow('db');
  });

  test('updateStop not found', async () => {
    Stop.findByPk.mockResolvedValue(null);
    await expect(stopService.updateStop('x', {})).rejects.toThrow('Stop not found');
  });

  test('deleteStop not found', async () => {
    Stop.findByPk.mockResolvedValue(null);
    await expect(stopService.deleteStop('x')).rejects.toThrow('Stop not found');
  });

  test('getStopsByTrip rejects', async () => {
    // Ensure Trip exists so rejection comes from Stop.findAll
    Trip.findByPk = jest.fn().mockResolvedValue({ tripId: 't1' });
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(stopService.getStopsByTrip('t1')).rejects.toThrow('db');
  });

  test('getStopsByStation rejects', async () => {
    // Ensure Station exists so rejection comes from Stop.findAll
    Station.findByPk = jest.fn().mockResolvedValue({ stationId: 's1' });
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(stopService.getStopsByStation('s1')).rejects.toThrow('db');
  });

  test('getStopsByTimeRange rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(stopService.getStopsByTimeRange('09:00', '10:00', 'Mon')).rejects.toThrow('db');
  });

  test('getTripScheduleWithStops not found', async () => {
    models.Trip.findByPk = jest.fn().mockResolvedValue(null);
    await expect(stopService.getTripScheduleWithStops('t1')).rejects.toThrow('Trip not found');
  });

  test('getTripScheduleWithStops rejects', async () => {
    models.Trip.findByPk = jest.fn().mockRejectedValue(new Error('db'));
    await expect(stopService.getTripScheduleWithStops('t1')).rejects.toThrow('db');
  });

  test('getNextStopsAtStation rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(stopService.getNextStopsAtStation('s1', '10:00', 'Mon', 5)).rejects.toThrow('db');
  });

  test('validateStopSequence non-consecutive', async () => {
    const stops = [{ sequence: 1 }, { sequence: 3 }];
    await expect(stopService.validateStopSequence('t1', stops)).rejects.toThrow('Stop sequences must be consecutive starting from 1');
  });

  test('validateStopSequence first stop arrival', async () => {
    const stops = [{ sequence: 1, arrivalTime: '09:00' }, { sequence: 2 }];
    await expect(stopService.validateStopSequence('t1', stops)).rejects.toThrow('First stop should not have arrival time');
  });

  test('validateStopSequence last stop departure', async () => {
    const stops = [{ sequence: 1, departureTime: '09:00' }, { sequence: 2, departureTime: '10:00' }];
    await expect(stopService.validateStopSequence('t1', stops)).rejects.toThrow('Last stop should not have departure time');
  });

  test('validateStopSequence arrival after departure', async () => {
    const stops = [
      { sequence: 1, departureTime: '09:00' },
      { sequence: 2, arrivalTime: '09:30', departureTime: '09:20' },
      { sequence: 3 }
    ];
    await expect(stopService.validateStopSequence('t1', stops)).rejects.toThrow('Arrival time must be before departure time');
  });

  test('validateStopSequence arrival before previous departure', async () => {
    const stops = [
      { sequence: 1, departureTime: '09:10' },
      { sequence: 2, arrivalTime: '09:00', departureTime: '09:30' },
      { sequence: 3 }
    ];
    await expect(stopService.validateStopSequence('t1', stops)).rejects.toThrow("Arrival time must be after previous stop's departure time");
  });
});