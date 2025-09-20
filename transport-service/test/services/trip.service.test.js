const models = require('../../src/models/index.model');
const { Trip, Route, Train, Stop, Station } = models;
const tripService = require('../../src/services/trip.service');

describe('trip.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createTrip creates trip', async () => {
    const payload = { routeId: 'r1' };
    const created = { tripId: 't1', ...payload };
    Trip.create.mockResolvedValue(created);
    const result = await tripService.createTrip(payload);
    expect(Trip.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('getAllTrips applies filters', async () => {
    await tripService.getAllTrips({ isActive: true, routeId: 'r1', trainId: 'tr1', dayOfWeek: 'Mon', departureTimeFrom: '08:00', departureTimeTo: '10:00' });
    expect(Trip.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getTripById returns trip', async () => {
    const trip = { tripId: 't1' };
    Trip.findByPk.mockResolvedValue(trip);
    const result = await tripService.getTripById('t1');
    expect(result).toBe(trip);
  });

  test('getTripById throws when not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(tripService.getTripById('missing')).rejects.toThrow('Trip not found');
  });

  test('updateTrip updates and returns', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ tripId: 't1' }) };
    Trip.findByPk.mockResolvedValue(instance);
    const result = await tripService.updateTrip('t1', { dayOfWeek: 'Tue' });
    expect(instance.update).toHaveBeenCalledWith({ dayOfWeek: 'Tue' });
    expect(result).toEqual({ tripId: 't1' });
  });

  test('deleteTrip destroys and returns message', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    Trip.findByPk.mockResolvedValue(instance);
    const result = await tripService.deleteTrip('t1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Trip deleted successfully' });
  });

  test('getActiveTrips returns list', async () => {
    Trip.findAll.mockResolvedValue([]);
    await tripService.getActiveTrips();
    expect(Trip.findAll).toHaveBeenCalled();
  });

  test('getTripsByRoute returns list', async () => {
    Trip.findAll.mockResolvedValue([]);
    await tripService.getTripsByRoute('r1');
    expect(Trip.findAll).toHaveBeenCalled();
  });

  test('getTripsByTrain returns list', async () => {
    Trip.findAll.mockResolvedValue([]);
    await tripService.getTripsByTrain('tr1');
    expect(Trip.findAll).toHaveBeenCalled();
  });

  test('getTripsByDayOfWeek returns list', async () => {
    Trip.findAll.mockResolvedValue([]);
    await tripService.getTripsByDayOfWeek('Mon');
    expect(Trip.findAll).toHaveBeenCalled();
  });

  test('getUpcomingTrips returns list', async () => {
    Trip.findAll.mockResolvedValue([]);
    await tripService.getUpcomingTrips('09:00', 'Mon');
    expect(Trip.findAll).toHaveBeenCalled();
  });

  test('findTripsBetweenStations filters valid trips', async () => {
    const trips = [{ stops: [{ stationId: 's1', sequence: 1 }, { stationId: 's2', sequence: 2 }] }];
    Trip.findAll.mockResolvedValue(trips);
    const result = await tripService.findTripsBetweenStations('s1', 's2', 'Mon');
    expect(result.length).toBe(1);
  });

  test('getTripStatistics returns mapped stats', async () => {
    const trip = {
      Route: { distance: 10, duration: 20 },
      Train: { capacity: 100 },
      stops: [],
      departureTime: '09:00',
      arrivalTime: '10:00',
      dayOfWeek: 'Mon'
    };
    Trip.findByPk.mockResolvedValue(trip);
    const result = await tripService.getTripStatistics('t1');
    expect(result.totalDistance).toBe(10);
    expect(result.trainCapacity).toBe(100);
  });

  test('createTrip throws on error', async () => {
    Trip.create.mockRejectedValue(new Error('Database error'));
    await expect(tripService.createTrip({})).rejects.toThrow('Database error');
  });
});

// Error paths (merged from extra2 file)
describe('trip.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getAllTrips({})).rejects.toThrow('db');
  });

  test('getTripById not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(tripService.getTripById('x')).rejects.toThrow('Trip not found');
  });

  test('getTripById rejects', async () => {
    Trip.findByPk.mockRejectedValue(new Error('db'));
    await expect(tripService.getTripById('x')).rejects.toThrow('db');
  });

  test('updateTrip not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(tripService.updateTrip('x', {})).rejects.toThrow('Trip not found');
  });

  test('deleteTrip not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(tripService.deleteTrip('x')).rejects.toThrow('Trip not found');
  });

  test('getActiveTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getActiveTrips()).rejects.toThrow('db');
  });

  test('getTripsByRoute rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getTripsByRoute('r1')).rejects.toThrow('db');
  });

  test('getTripsByTrain rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getTripsByTrain('tr1')).rejects.toThrow('db');
  });

  test('getTripsByDayOfWeek rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getTripsByDayOfWeek('Mon')).rejects.toThrow('db');
  });

  test('getUpcomingTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.getUpcomingTrips('09:00', 'Mon')).rejects.toThrow('db');
  });

  test('findTripsBetweenStations rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(tripService.findTripsBetweenStations('s1','s2','Mon')).rejects.toThrow('db');
  });

  test('getTripStatistics not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(tripService.getTripStatistics('x')).rejects.toThrow('Trip not found');
  });

  test('getTripStatistics rejects', async () => {
    Trip.findByPk.mockRejectedValue(new Error('db'));
    await expect(tripService.getTripStatistics('x')).rejects.toThrow('db');
  });
});