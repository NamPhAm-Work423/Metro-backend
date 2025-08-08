const models = require('../../src/models/index.model');
const { Train, Trip } = models;
const trainService = require('../../src/services/train.service');

describe('train.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createTrain creates train', async () => {
    const payload = { name: 'T1' };
    const created = { trainId: 'tr1', ...payload };
    Train.create.mockResolvedValue(created);
    const result = await trainService.createTrain(payload);
    expect(Train.create).toHaveBeenCalledWith(payload);
    expect(result).toBe(created);
  });

  test('getAllTrains applies filters', async () => {
    await trainService.getAllTrains({ isActive: true, type: 'electric', status: 'active', name: 'Metro' });
    expect(Train.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.any(Object) }));
  });

  test('getTrainById returns train', async () => {
    const train = { trainId: 'tr1' };
    Train.findByPk.mockResolvedValue(train);
    const result = await trainService.getTrainById('tr1');
    expect(result).toBe(train);
  });

  test('getTrainById throws when not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(trainService.getTrainById('missing')).rejects.toThrow('Train not found');
  });

  test('updateTrain updates and returns', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ trainId: 'tr1' }) };
    Train.findByPk.mockResolvedValue(instance);
    const result = await trainService.updateTrain('tr1', { name: 'B' });
    expect(instance.update).toHaveBeenCalledWith({ name: 'B' });
    expect(result).toEqual({ trainId: 'tr1' });
  });

  test('deleteTrain destroys and returns message', async () => {
    const instance = { destroy: jest.fn().mockResolvedValue(1) };
    Train.findByPk.mockResolvedValue(instance);
    const result = await trainService.deleteTrain('tr1');
    expect(instance.destroy).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Train deleted successfully' });
  });

  test('getActiveTrains returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    await trainService.getActiveTrains();
    expect(Train.findAll).toHaveBeenCalled();
  });

  test('getTrainsByType returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    await trainService.getTrainsByType('electric');
    expect(Train.findAll).toHaveBeenCalled();
  });

  test('getTrainsByStatus returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    await trainService.getTrainsByStatus('active');
    expect(Train.findAll).toHaveBeenCalled();
  });

  test('updateTrainStatus validates and updates', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ status: 'maintenance' }) };
    Train.findByPk.mockResolvedValue(instance);
    const result = await trainService.updateTrainStatus('tr1', 'maintenance');
    expect(instance.update).toHaveBeenCalledWith({ status: 'maintenance' });
    expect(result).toEqual({ status: 'maintenance' });
  });

  test('scheduleMaintenanceForTrain sets status and date', async () => {
    const instance = { update: jest.fn().mockResolvedValue({ status: 'maintenance' }) };
    Train.findByPk.mockResolvedValue(instance);
    const result = await trainService.scheduleMaintenanceForTrain('tr1', '2025-01-01');
    expect(instance.update).toHaveBeenCalled();
    expect(result).toEqual({ status: 'maintenance' });
  });

  test('getTrainsNeedingMaintenance returns list', async () => {
    Train.findAll.mockResolvedValue([]);
    await trainService.getTrainsNeedingMaintenance(30);
    expect(Train.findAll).toHaveBeenCalled();
  });

  test('getTrainUtilization returns metrics', async () => {
    const train = { name: 'T1', capacity: 100, trips: [{ dayOfWeek: 'Mon' }, { dayOfWeek: 'Tue' }] };
    Train.findByPk.mockResolvedValue(train);
    const result = await trainService.getTrainUtilization('tr1');
    expect(result.totalTrips).toBe(2);
    expect(result.activeDays).toBe(2);
  });
});



// Additional positive cases (from extra file)
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

// Error paths (from extra2 file)
describe('train.service error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTrains rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(trainService.getAllTrains({})).rejects.toThrow('db');
  });

  test('getTrainById not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(trainService.getTrainById('x')).rejects.toThrow('Train not found');
  });

  test('updateTrain not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(trainService.updateTrain('x', {})).rejects.toThrow('Train not found');
  });

  test('deleteTrain not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(trainService.deleteTrain('x')).rejects.toThrow('Train not found');
  });

  test('getActiveTrains rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(trainService.getActiveTrains()).rejects.toThrow('db');
  });

  test('getTrainsByType rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(trainService.getTrainsByType('metro')).rejects.toThrow('db');
  });

  test('getTrainsByStatus rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(trainService.getTrainsByStatus('active')).rejects.toThrow('db');
  });

  test('updateTrainStatus invalid status', async () => {
    Train.findByPk.mockResolvedValue({ trainId: 'x' });
    await expect(trainService.updateTrainStatus('x', 'invalid')).rejects.toThrow('Invalid status');
  });

  test('getTrainsNeedingMaintenance rejects', async () => {
    Train.findAll.mockRejectedValue(new Error('db'));
    await expect(trainService.getTrainsNeedingMaintenance(10)).rejects.toThrow('db');
  });

  test('getTrainUtilization not found', async () => {
    Train.findByPk.mockResolvedValue(null);
    await expect(trainService.getTrainUtilization('x')).rejects.toThrow('Train not found');
  });
});
