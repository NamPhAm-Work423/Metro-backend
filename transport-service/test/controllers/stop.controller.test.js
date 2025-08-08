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
