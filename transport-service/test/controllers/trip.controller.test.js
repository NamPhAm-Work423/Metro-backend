const tripService = require('../../src/services/trip.service');
const tripController = require('../../src/controllers/trip.controller');

jest.mock('../../src/services/trip.service');

describe('trip.controller', () => {
  let req, res;
  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('getAllTrips returns 200', async () => {
    tripService.getAllTrips.mockResolvedValue([]);
    await tripController.getAllTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllTrips handles 500', async () => {
    tripService.getAllTrips.mockRejectedValue(new Error('db'));
    await tripController.getAllTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripById returns 200', async () => {
    tripService.getTripById.mockResolvedValue({});
    req.params.id = 'tr1';
    await tripController.getTripById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripById handles 404', async () => {
    tripService.getTripById.mockRejectedValue(new Error('not found'));
    await tripController.getTripById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createTrip returns 201', async () => {
    tripService.createTrip.mockResolvedValue({});
    await tripController.createTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createTrip handles 400', async () => {
    tripService.createTrip.mockRejectedValue(new Error('bad'));
    await tripController.createTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateTrip returns 200', async () => {
    tripService.updateTrip.mockResolvedValue({});
    req.params.id = 'tr1';
    await tripController.updateTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateTrip handles 400', async () => {
    tripService.updateTrip.mockRejectedValue(new Error('bad'));
    await tripController.updateTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteTrip returns 200', async () => {
    tripService.deleteTrip.mockResolvedValue({ message: 'deleted' });
    req.params.id = 'tr1';
    await tripController.deleteTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteTrip handles 400', async () => {
    tripService.deleteTrip.mockRejectedValue(new Error('bad'));
    await tripController.deleteTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
