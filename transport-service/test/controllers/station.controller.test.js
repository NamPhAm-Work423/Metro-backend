const stationService = require('../../src/services/station.service');
const stationController = require('../../src/controllers/station.controller');

jest.mock('../../src/services/station.service');

describe('station.controller', () => {
  let req, res;
  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('getActiveStations returns 200', async () => {
    stationService.getActiveStations.mockResolvedValue([]);
    await stationController.getActiveStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getActiveStations handles 500', async () => {
    stationService.getActiveStations.mockRejectedValue(new Error('db'));
    await stationController.getActiveStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getStationsByOperatingHours returns 200', async () => {
    stationService.getStationsByOperatingHours.mockResolvedValue([]);
    req.query.currentTime = '12:00';
    await stationController.getStationsByOperatingHours(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStationsByOperatingHours handles 500', async () => {
    stationService.getStationsByOperatingHours.mockRejectedValue(new Error('db'));
    await stationController.getStationsByOperatingHours(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('updateStationFacilities returns 200', async () => {
    stationService.updateStationFacilities.mockResolvedValue({});
    req.params.id = 's1';
    req.body.facilities = { wifi: true };
    await stationController.updateStationFacilities(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateStationFacilities handles 400', async () => {
    stationService.updateStationFacilities.mockRejectedValue(new Error('bad'));
    await stationController.updateStationFacilities(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getAllStations returns 200', async () => {
    stationService.getAllStations.mockResolvedValue([]);
    await stationController.getAllStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllStations handles 500', async () => {
    stationService.getAllStations.mockRejectedValue(new Error('db'));
    await stationController.getAllStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getStationById returns 200', async () => {
    stationService.getStationById.mockResolvedValue({});
    req.params.id = 's1';
    await stationController.getStationById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getStationById handles 404', async () => {
    stationService.getStationById.mockRejectedValue(new Error('not found'));
    await stationController.getStationById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createStation returns 201', async () => {
    stationService.createStation.mockResolvedValue({});
    await stationController.createStation(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createStation handles 400', async () => {
    stationService.createStation.mockRejectedValue(new Error('bad'));
    await stationController.createStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateStation returns 200', async () => {
    stationService.updateStation.mockResolvedValue({});
    req.params.id = 's1';
    await stationController.updateStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateStation handles 400', async () => {
    stationService.updateStation.mockRejectedValue(new Error('bad'));
    await stationController.updateStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteStation returns 200', async () => {
    stationService.deleteStation.mockResolvedValue({ message: 'deleted' });
    req.params.id = 's1';
    await stationController.deleteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteStation handles 400', async () => {
    stationService.deleteStation.mockRejectedValue(new Error('bad'));
    await stationController.deleteStation(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getActiveStations returns 200', async () => {
    stationService.getActiveStations.mockResolvedValue([]);
    await stationController.getActiveStations(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getActiveStations handles 500 error', async () => {
    stationService.getActiveStations.mockRejectedValue(new Error('Database error'));
    await stationController.getActiveStations(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
