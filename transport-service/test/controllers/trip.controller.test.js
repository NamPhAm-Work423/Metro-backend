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

  test('getActiveTrips returns 200', async () => {
    tripService.getActiveTrips.mockResolvedValue([]);
    await tripController.getActiveTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getActiveTrips handles 500', async () => {
    tripService.getActiveTrips.mockRejectedValue(new Error('db'));
    await tripController.getActiveTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripsByRoute returns 200', async () => {
    tripService.getTripsByRoute.mockResolvedValue([]);
    req.params.routeId = 'r1';
    await tripController.getTripsByRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripsByRoute handles 500', async () => {
    tripService.getTripsByRoute.mockRejectedValue(new Error('db'));
    await tripController.getTripsByRoute(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripsByTrain returns 200', async () => {
    tripService.getTripsByTrain.mockResolvedValue([]);
    req.params.trainId = 't1';
    await tripController.getTripsByTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripsByTrain handles 500', async () => {
    tripService.getTripsByTrain.mockRejectedValue(new Error('db'));
    await tripController.getTripsByTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripsByDayOfWeek returns 200', async () => {
    tripService.getTripsByDayOfWeek.mockResolvedValue([]);
    req.params.dayOfWeek = 'Mon';
    await tripController.getTripsByDayOfWeek(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripsByDayOfWeek handles 500', async () => {
    tripService.getTripsByDayOfWeek.mockRejectedValue(new Error('db'));
    await tripController.getTripsByDayOfWeek(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getUpcomingTrips returns 200', async () => {
    tripService.getUpcomingTrips.mockResolvedValue([]);
    req.query = { currentTime: '10:00', dayOfWeek: 'Mon' };
    await tripController.getUpcomingTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getUpcomingTrips handles 500', async () => {
    tripService.getUpcomingTrips.mockRejectedValue(new Error('db'));
    await tripController.getUpcomingTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('findTripsBetweenStations returns 200', async () => {
    tripService.findTripsBetweenStations.mockResolvedValue([]);
    req.query = { originStationId: 's1', destinationStationId: 's2', dayOfWeek: 'Mon' };
    await tripController.findTripsBetweenStations(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('findTripsBetweenStations handles 500', async () => {
    tripService.findTripsBetweenStations.mockRejectedValue(new Error('db'));
    await tripController.findTripsBetweenStations(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTripStatistics returns 200', async () => {
    tripService.getTripStatistics.mockResolvedValue({});
    req.params.id = 'tr1';
    await tripController.getTripStatistics(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTripStatistics handles 500', async () => {
    tripService.getTripStatistics.mockRejectedValue(new Error('db'));
    await tripController.getTripStatistics(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
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

  test('getTripsWithFilters returns 200 with default today date', async () => {
    tripService.getTripsByDate.mockResolvedValue([]);
    await tripController.getTripsWithFilters(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(tripService.getTripsByDate).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), // Today's date format
      expect.objectContaining({
        serviceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      })
    );
  });

  test('getTripsWithFilters returns 200 with custom date', async () => {
    tripService.getTripsByDate.mockResolvedValue([]);
    req.query = { serviceDate: '2025-09-21', routeId: 'r1' };
    await tripController.getTripsWithFilters(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(tripService.getTripsByDate).toHaveBeenCalledWith('2025-09-21', req.query);
  });

  test('getTripsWithFilters handles 500', async () => {
    tripService.getTripsByDate.mockRejectedValue(new Error('db'));
    await tripController.getTripsWithFilters(req, res);
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
