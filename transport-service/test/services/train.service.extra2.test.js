const models = require('../../src/models/index.model');
const { Train } = models;
const service = require('../../src/services/train.service');

describe('train.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTrains rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getAllTrains({})).rejects.toThrow('db');
  });

  test('getTrainById not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(service.getTrainById('x')).rejects.toThrow('Train not found');
  });

  test('updateTrain not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(service.updateTrain('x', {})).rejects.toThrow('Train not found');
  });

  test('deleteTrain not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(service.deleteTrain('x')).rejects.toThrow('Train not found');
  });

  test('getActiveTrains rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getActiveTrains()).rejects.toThrow('db');
  });

  test('getTrainsByType rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTrainsByType('metro')).rejects.toThrow('db');
  });

  test('getTrainsByStatus rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTrainsByStatus('active')).rejects.toThrow('db');
  });

  test('updateTrainStatus invalid status', async () => {
    Train.findByPk.mockResolvedValue({ trainId: 'x' });
    await expect(service.updateTrainStatus('x', 'invalid')).rejects.toThrow('Invalid status');
  });

  test('getTrainsNeedingMaintenance rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(service.getTrainsNeedingMaintenance(10)).rejects.toThrow('db');
  });

  test('getTrainUtilization not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(service.getTrainUtilization('x')).rejects.toThrow('Train not found');
  });
});


