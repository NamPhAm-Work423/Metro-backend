const TransitPassService = require('../../../../src/services/transitPass.service');

jest.mock('../../../../src/services/transitPass/repositories/TransitPassRepository', () => ({
  findAll: jest.fn().mockResolvedValue([{ transitPassId: 'tp1' }]),
  findActive: jest.fn().mockResolvedValue([{ transitPassId: 'tp2', isActive: true }]),
  findById: jest.fn().mockResolvedValue({ transitPassId: 'tp1' }),
  findByType: jest.fn().mockResolvedValue(null),
  findByCurrency: jest.fn().mockResolvedValue([{ transitPassId: 'tp3', currency: 'VND' }]),
  create: jest.fn().mockResolvedValue({ transitPassId: 'tp4' }),
  update: jest.fn().mockResolvedValue({ transitPassId: 'tp1', name: 'updated' }),
  delete: jest.fn().mockResolvedValue(true),
  setActive: jest.fn().mockResolvedValue({ transitPassId: 'tp1', isActive: true }),
  bulkUpdate: jest.fn().mockResolvedValue(3)
}));

jest.mock('../../../../src/events/transisPass.producer.event', () => ({
  publishTransitPassCreated: jest.fn(),
  publishTransitPassUpdated: jest.fn(),
  publishTransitPassDeleted: jest.fn()
}));

const Repository = require('../../../../src/services/transitPass/repositories/TransitPassRepository');
const Events = require('../../../../src/events/transisPass.producer.event');

describe('TransitPassService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getAllTransitPasses', async () => {
    const res = await TransitPassService.getAllTransitPasses();
    expect(Repository.findAll).toHaveBeenCalled();
    expect(res).toEqual([{ transitPassId: 'tp1' }]);
  });

  test('getActiveTransitPasses', async () => {
    const res = await TransitPassService.getActiveTransitPasses();
    expect(Repository.findActive).toHaveBeenCalled();
    expect(res[0].isActive).toBe(true);
  });

  test('getTransitPassById', async () => {
    const res = await TransitPassService.getTransitPassById('tp1');
    expect(Repository.findById).toHaveBeenCalledWith('tp1');
    expect(res.transitPassId).toBe('tp1');
  });

  test('getTransitPassByType', async () => {
    await TransitPassService.getTransitPassByType('monthly_pass');
    expect(Repository.findByType).toHaveBeenCalledWith('monthly_pass');
  });

  test('getTransitPassesByCurrency', async () => {
    const res = await TransitPassService.getTransitPassesByCurrency('VND');
    expect(Repository.findByCurrency).toHaveBeenCalledWith('VND');
    expect(res[0].currency).toBe('VND');
  });

  test('createTransitPass publishes created event, dedupes existing type', async () => {
    Repository.findByType.mockResolvedValueOnce(null);
    const created = await TransitPassService.createTransitPass({ transitPassType: 'monthly_pass' });
    expect(Repository.create).toHaveBeenCalled();
    expect(Events.publishTransitPassCreated).toHaveBeenCalled();
    expect(created.transitPassId).toBe('tp4');

    // existing branch returns existing and warns (no new create)
    Repository.findByType.mockResolvedValueOnce({ transitPassType: 'monthly_pass', id: 'existing' });
    const existing = await TransitPassService.createTransitPass({ transitPassType: 'monthly_pass' });
    expect(existing.id).toBe('existing');
  });

  test('updateTransitPass publishes updated event, throws when not found', async () => {
    const updated = await TransitPassService.updateTransitPass('tp1', { name: 'updated' });
    expect(updated.name).toBe('updated');
    expect(Events.publishTransitPassUpdated).toHaveBeenCalled();

    Repository.update.mockResolvedValueOnce(null);
    await expect(TransitPassService.updateTransitPass('missing', {})).rejects.toThrow('Transit pass not found');
  });

  test('deleteTransitPass publishes deleted event, throws when not found', async () => {
    const res = await TransitPassService.deleteTransitPass('tp1');
    expect(res).toBe(true);
    expect(Events.publishTransitPassDeleted).toHaveBeenCalledWith('tp1');

    Repository.delete.mockResolvedValueOnce(false);
    await expect(TransitPassService.deleteTransitPass('missing')).rejects.toThrow('Transit pass not found');
  });

  test('setTransitPassActive publishes updated event, throws when not found', async () => {
    const res = await TransitPassService.setTransitPassActive('tp1', true);
    expect(res.isActive).toBe(true);
    expect(Events.publishTransitPassUpdated).toHaveBeenCalled();

    Repository.setActive.mockResolvedValueOnce(null);
    await expect(TransitPassService.setTransitPassActive('missing', true)).rejects.toThrow('Transit pass not found');
  });

  test('bulkUpdateTransitPasses returns updatedCount', async () => {
    const res = await TransitPassService.bulkUpdateTransitPasses({}, { isActive: false });
    expect(Repository.bulkUpdate).toHaveBeenCalled();
    expect(res).toEqual({ updatedCount: 3 });
  });
});


