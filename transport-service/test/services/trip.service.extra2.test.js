const models = require('../../src/models/index.model');
const { Trip } = models;
const service = require('../../src/services/trip.service');

describe('trip.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getAllTrips({})).rejects.toThrow('db');
  });

  test('getTripById not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(service.getTripById('x')).rejects.toThrow('Trip not found');
  });

  test('getTripById rejects', async () => {
    Trip.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.getTripById('x')).rejects.toThrow('db');
  });

  test('updateTrip not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(service.updateTrip('x', {})).rejects.toThrow('Trip not found');
  });

  test('deleteTrip not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(service.deleteTrip('x')).rejects.toThrow('Trip not found');
  });

  test('getActiveTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getActiveTrips()).rejects.toThrow('db');
  });

  test('getTripsByRoute rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTripsByRoute('r1')).rejects.toThrow('db');
  });

  test('getTripsByTrain rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTripsByTrain('tr1')).rejects.toThrow('db');
  });

  test('getTripsByDayOfWeek rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTripsByDayOfWeek('Mon')).rejects.toThrow('db');
  });

  test('getUpcomingTrips rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getUpcomingTrips('09:00', 'Mon')).rejects.toThrow('db');
  });

  test('findTripsBetweenStations rejects', async () => {
    Trip.findAll.mockRejectedValue(new Error('db'));
    await expect(service.findTripsBetweenStations('s1','s2','Mon')).rejects.toThrow('db');
  });

  test('getTripStatistics not found', async () => {
    Trip.findByPk.mockResolvedValue(null);
    await expect(service.getTripStatistics('x')).rejects.toThrow('Trip not found');
  });

  test('getTripStatistics rejects', async () => {
    Trip.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.getTripStatistics('x')).rejects.toThrow('db');
  });
});


