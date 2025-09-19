const stopService = require('../../src/services/stop.service');
const stopController = require('../../src/controllers/stop.controller');

jest.mock('../../src/services/stop.service');

describe('stop.controller', () => {
  let req, res;
  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('createMultipleStops returns 201', async () => {
    stopService.createMultipleStops.mockResolvedValue([{ id: 'a' }]);
    req.body.stopsData = [{ name: 'S1' }];
    await stopController.createMultipleStops(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createMultipleStops handles 400', async () => {
    stopService.createMultipleStops.mockRejectedValue(new Error('bad'));
    await stopController.createMultipleStops(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getStopsByTrip returns 200', async () => {
    stopService.getStopsByTrip.mockResolvedValue([]);
    req.params.tripId = 'tr1';
    await stopController.getStopsByTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStopsByTrip handles 500', async () => {
    stopService.getStopsByTrip.mockRejectedValue(new Error('bad'));
    await stopController.getStopsByTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getStopsByStation returns 200', async () => {
    stopService.getStopsByStation.mockResolvedValue([]);
    req.params.stationId = 'st1';
    await stopController.getStopsByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStopsByStation handles 500', async () => {
    stopService.getStopsByStation.mockRejectedValue(new Error('bad'));
    await stopController.getStopsByStation(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripScheduleWithStops returns 200', async () => {
    stopService.getTripScheduleWithStops.mockResolvedValue({});
    req.params.tripId = 'tr1';
    await stopController.getTripScheduleWithStops(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripScheduleWithStops handles 500', async () => {
    stopService.getTripScheduleWithStops.mockRejectedValue(new Error('bad'));
    await stopController.getTripScheduleWithStops(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getNextStopsAtStation returns 200', async () => {
    stopService.getNextStopsAtStation.mockResolvedValue([]);
    req.params.stationId = 'st1';
    req.query = { currentTime: '12:00', dayOfWeek: 'Mon', limit: '5' };
    await stopController.getNextStopsAtStation(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getNextStopsAtStation handles 500', async () => {
    stopService.getNextStopsAtStation.mockRejectedValue(new Error('bad'));
    await stopController.getNextStopsAtStation(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('validateStopSequence returns 200', async () => {
    stopService.validateStopSequence.mockResolvedValue({ valid: true });
    req.params.tripId = 'tr1';
    req.body.stops = [];
    await stopController.validateStopSequence(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('validateStopSequence handles 400', async () => {
    stopService.validateStopSequence.mockRejectedValue(new Error('bad'));
    await stopController.validateStopSequence(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getAllStops returns 200', async () => {
    stopService.getAllStops.mockResolvedValue([]);
    await stopController.getAllStops(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllStops handles 500', async () => {
    stopService.getAllStops.mockRejectedValue(new Error('db'));
    await stopController.getAllStops(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getStopById returns 200', async () => {
    stopService.getStopById.mockResolvedValue({});
    req.params.id = 'st1';
    await stopController.getStopById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStopById handles 404', async () => {
    stopService.getStopById.mockRejectedValue(new Error('not found'));
    await stopController.getStopById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createStop returns 201', async () => {
    stopService.createStop.mockResolvedValue({});
    await stopController.createStop(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createStop handles 400', async () => {
    stopService.createStop.mockRejectedValue(new Error('bad'));
    await stopController.createStop(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateStop returns 200', async () => {
    stopService.updateStop.mockResolvedValue({});
    req.params.id = 'st1';
    await stopController.updateStop(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateStop handles 400', async () => {
    stopService.updateStop.mockRejectedValue(new Error('bad'));
    await stopController.updateStop(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteStop returns 200', async () => {
    stopService.deleteStop.mockResolvedValue({ message: 'deleted' });
    req.params.id = 'st1';
    await stopController.deleteStop(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteStop handles 400', async () => {
    stopService.deleteStop.mockRejectedValue(new Error('bad'));
    await stopController.deleteStop(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
