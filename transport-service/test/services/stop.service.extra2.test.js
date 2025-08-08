const models = require('../../src/models/index.model');
const { Stop, Trip } = models;
const service = require('../../src/services/stop.service');

describe('stop.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createStop rejects', async () => {
    Stop.create.mockRejectedValue(new Error('db'));
    await expect(service.createStop({})).rejects.toThrow('db');
  });

  test('createMultipleStops rejects', async () => {
    Stop.bulkCreate.mockRejectedValue(new Error('db'));
    await expect(service.createMultipleStops([{}])).rejects.toThrow('db');
  });

  test('getAllStops rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getAllStops({})).rejects.toThrow('db');
  });

  test('getStopById rejects', async () => {
    Stop.findByPk.mockRejectedValue(new Error('db'));
    await expect(service.getStopById('x')).rejects.toThrow('db');
  });

  test('updateStop not found', async () => {
    Stop.findByPk.mockResolvedValue(null);
    await expect(service.updateStop('x', {})).rejects.toThrow('Stop not found');
  });

  test('deleteStop not found', async () => {
    Stop.findByPk.mockResolvedValue(null);
    await expect(service.deleteStop('x')).rejects.toThrow('Stop not found');
  });

  test('getStopsByTrip rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getStopsByTrip('t1')).rejects.toThrow('db');
  });

  test('getStopsByStation rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getStopsByStation('s1')).rejects.toThrow('db');
  });

  test('getStopsByTimeRange rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getStopsByTimeRange('09:00', '10:00', 'Mon')).rejects.toThrow('db');
  });

  test('getTripScheduleWithStops not found', async () => {
    models.Trip.findByPk = jest.fn().mockResolvedValue(null);
    await expect(service.getTripScheduleWithStops('t1')).rejects.toThrow('Trip not found');
  });

  test('getTripScheduleWithStops rejects', async () => {
    models.Trip.findByPk = jest.fn().mockRejectedValue(new Error('db'));
    await expect(service.getTripScheduleWithStops('t1')).rejects.toThrow('db');
  });

  test('getNextStopsAtStation rejects', async () => {
    Stop.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getNextStopsAtStation('s1', '10:00', 'Mon', 5)).rejects.toThrow('db');
  });

  test('validateStopSequence non-consecutive', async () => {
    const stops = [{ sequence: 1 }, { sequence: 3 }];
    await expect(service.validateStopSequence('t1', stops)).rejects.toThrow('Stop sequences must be consecutive starting from 1');
  });

  test('validateStopSequence first stop arrival', async () => {
    const stops = [{ sequence: 1, arrivalTime: '09:00' }, { sequence: 2 }];
    await expect(service.validateStopSequence('t1', stops)).rejects.toThrow('First stop should not have arrival time');
  });

  test('validateStopSequence last stop departure', async () => {
    const stops = [{ sequence: 1, departureTime: '09:00' }, { sequence: 2, departureTime: '10:00' }];
    await expect(service.validateStopSequence('t1', stops)).rejects.toThrow('Last stop should not have departure time');
  });

  test('validateStopSequence arrival after departure', async () => {
    const stops = [
      { sequence: 1, departureTime: '09:00' },
      { sequence: 2, arrivalTime: '09:30', departureTime: '09:20' },
      { sequence: 3 }
    ];
    await expect(service.validateStopSequence('t1', stops)).rejects.toThrow('Arrival time must be before departure time');
  });

  test('validateStopSequence arrival before previous departure', async () => {
    const stops = [
      { sequence: 1, departureTime: '09:10' },
      { sequence: 2, arrivalTime: '09:00', departureTime: '09:30' },
      { sequence: 3 }
    ];
    await expect(service.validateStopSequence('t1', stops)).rejects.toThrow("Arrival time must be after previous stop's departure time");
  });
});


