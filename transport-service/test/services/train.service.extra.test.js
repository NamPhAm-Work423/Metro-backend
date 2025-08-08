const models = require('../../src/models/index.model');
const { Train } = models;
const trainService = require('../../src/services/train.service');

describe('train.service extra', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTrains filters and returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    await trainService.getAllTrains({ isActive: true, type: 'metro', status: 'active', name: 'A' });
    expect(Train.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getActiveTrains returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    const result = await trainService.getActiveTrains();
    expect(Train.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getTrainsByType returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    const result = await trainService.getTrainsByType('metro');
    expect(Train.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getTrainsByStatus returns list with include', async () => {
    Train.findAll.mockResolvedValue([]);
    const result = await trainService.getTrainsByStatus('active');
    expect(Train.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  test('getTrainsNeedingMaintenance returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    const result = await trainService.getTrainsNeedingMaintenance(15);
    expect(Train.findAll).toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});


