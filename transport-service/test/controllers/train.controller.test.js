const trainService = require('../../src/services/train.service');
const trainController = require('../../src/controllers/train.controller');

jest.mock('../../src/services/train.service');

describe('train.controller', () => {
  let req, res;
  beforeEach(() => {
    req = { params: {}, query: {}, body: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  test('getActiveTrains returns 200', async () => {
    trainService.getActiveTrains.mockResolvedValue([]);
    await trainController.getActiveTrains(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getActiveTrains handles 500', async () => {
    trainService.getActiveTrains.mockRejectedValue(new Error('db'));
    await trainController.getActiveTrains(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTrainsByType returns 200', async () => {
    trainService.getTrainsByType.mockResolvedValue([]);
    req.params.type = 'metro';
    await trainController.getTrainsByType(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTrainsByType handles 500', async () => {
    trainService.getTrainsByType.mockRejectedValue(new Error('db'));
    await trainController.getTrainsByType(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTrainsByStatus returns 200', async () => {
    trainService.getTrainsByStatus.mockResolvedValue([]);
    req.params.status = 'active';
    await trainController.getTrainsByStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTrainsByStatus handles 500', async () => {
    trainService.getTrainsByStatus.mockRejectedValue(new Error('db'));
    await trainController.getTrainsByStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('updateTrainStatus returns 200', async () => {
    trainService.updateTrainStatus.mockResolvedValue({});
    req.params.id = 't1';
    req.body.status = 'inactive';
    await trainController.updateTrainStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateTrainStatus handles 400', async () => {
    trainService.updateTrainStatus.mockRejectedValue(new Error('bad'));
    await trainController.updateTrainStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('scheduleTrainMaintenance returns 200', async () => {
    trainService.scheduleMaintenanceForTrain.mockResolvedValue({});
    req.params.id = 't1';
    req.body.maintenanceDate = '2025-01-01';
    await trainController.scheduleTrainMaintenance(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('scheduleTrainMaintenance handles 400', async () => {
    trainService.scheduleMaintenanceForTrain.mockRejectedValue(new Error('bad'));
    await trainController.scheduleTrainMaintenance(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getTrainsNeedingMaintenance returns 200', async () => {
    trainService.getTrainsNeedingMaintenance.mockResolvedValue([]);
    req.query.daysThreshold = '30';
    await trainController.getTrainsNeedingMaintenance(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTrainsNeedingMaintenance handles 500', async () => {
    trainService.getTrainsNeedingMaintenance.mockRejectedValue(new Error('db'));
    await trainController.getTrainsNeedingMaintenance(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTrainUtilization returns 200', async () => {
    trainService.getTrainUtilization.mockResolvedValue({});
    req.params.id = 't1';
    await trainController.getTrainUtilization(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTrainUtilization handles 500', async () => {
    trainService.getTrainUtilization.mockRejectedValue(new Error('db'));
    await trainController.getTrainUtilization(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getAllTrains returns 200', async () => {
    trainService.getAllTrains.mockResolvedValue([]);
    await trainController.getAllTrains(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getAllTrains handles 500', async () => {
    trainService.getAllTrains.mockRejectedValue(new Error('db'));
    await trainController.getAllTrains(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('getTrainById returns 200', async () => {
    trainService.getTrainById.mockResolvedValue({});
    req.params.id = 't1';
    await trainController.getTrainById(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTrainById handles 404', async () => {
    trainService.getTrainById.mockRejectedValue(new Error('not found'));
    await trainController.getTrainById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('createTrain returns 201', async () => {
    trainService.createTrain.mockResolvedValue({});
    await trainController.createTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('createTrain handles 400', async () => {
    trainService.createTrain.mockRejectedValue(new Error('bad'));
    await trainController.createTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('updateTrain returns 200', async () => {
    trainService.updateTrain.mockResolvedValue({});
    req.params.id = 't1';
    await trainController.updateTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('updateTrain handles 400', async () => {
    trainService.updateTrain.mockRejectedValue(new Error('bad'));
    await trainController.updateTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('deleteTrain returns 200', async () => {
    trainService.deleteTrain.mockResolvedValue({ message: 'deleted' });
    req.params.id = 't1';
    await trainController.deleteTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteTrain handles 400', async () => {
    trainService.deleteTrain.mockRejectedValue(new Error('bad'));
    await trainController.deleteTrain(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
