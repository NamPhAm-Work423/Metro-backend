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
