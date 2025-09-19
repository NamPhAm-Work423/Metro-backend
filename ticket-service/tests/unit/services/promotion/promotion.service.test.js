const PromotionService = require('../../../../src/services/promotion/PromotionService');

describe('PromotionService', () => {
  const repo = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findActive: jest.fn(),
    getStatistics: jest.fn(),
    expirePromotions: jest.fn()
  };
  const validator = {
    validatePromotion: jest.fn(),
    applyPromotion: jest.fn(),
    getPromotionUsageReport: jest.fn(),
    getPassPromotions: jest.fn(),
    applyPassUpgradePromotion: jest.fn(),
    getRoutePromotions: jest.fn()
  };

  let service;
  beforeEach(() => {
    jest.clearAllMocks();
    service = new PromotionService(repo, validator);
  });

  test('createPromotion delegates to repository', async () => {
    repo.create.mockResolvedValue({ id: 'p1' });
    const res = await service.createPromotion({ code: 'X' });
    expect(repo.create).toHaveBeenCalledWith({ code: 'X' });
    expect(res).toEqual({ id: 'p1' });
  });

  test('getAllPromotions forwards filters', async () => {
    repo.findAll.mockResolvedValue([{ id: 'p1' }]);
    const res = await service.getAllPromotions({ active: true });
    expect(repo.findAll).toHaveBeenCalledWith({ active: true });
    expect(res).toHaveLength(1);
  });

  test('getPromotionById and getPromotionByCode', async () => {
    repo.findById.mockResolvedValue({ id: 'p1' });
    repo.findByCode.mockResolvedValue({ id: 'p1' });
    await service.getPromotionById('p1');
    await service.getPromotionByCode('CODE');
    expect(repo.findById).toHaveBeenCalledWith('p1');
    expect(repo.findByCode).toHaveBeenCalledWith('CODE');
  });

  test('update by id and by code', async () => {
    repo.update.mockResolvedValue({ id: 'p1', name: 'n' });
    await service.updatePromotion('p1', { name: 'n' });
    await service.updatePromotionByCode('CODE', { name: 'n' });
    expect(repo.update).toHaveBeenNthCalledWith(1, 'p1', { name: 'n' });
    expect(repo.update).toHaveBeenNthCalledWith(2, 'CODE', { name: 'n' });
  });

  test('deletePromotion delegates to repository', async () => {
    repo.delete.mockResolvedValue(true);
    await service.deletePromotion('p1');
    expect(repo.delete).toHaveBeenCalledWith('p1');
  });

  test('active, stats, expire', async () => {
    repo.findActive.mockResolvedValue(['a']);
    repo.getStatistics.mockResolvedValue({ total: 1 });
    repo.expirePromotions.mockResolvedValue(2);
    await service.getActivePromotions({});
    await service.getPromotionStatistics({});
    await service.expirePromotions();
    expect(repo.findActive).toHaveBeenCalled();
    expect(repo.getStatistics).toHaveBeenCalled();
    expect(repo.expirePromotions).toHaveBeenCalled();
  });

  test('validation and application delegate to validator', async () => {
    validator.validatePromotion.mockResolvedValue({ valid: true });
    validator.applyPromotion.mockResolvedValue({ id: 'ok' });
    await service.validatePromotion('CODE', {});
    await service.applyPromotion('CODE', {});
    expect(validator.validatePromotion).toHaveBeenCalledWith('CODE', {});
    expect(validator.applyPromotion).toHaveBeenCalledWith('CODE', {});
  });

  test('reports and queries via validator', async () => {
    validator.getPromotionUsageReport.mockResolvedValue({});
    validator.getPassPromotions.mockResolvedValue([]);
    validator.applyPassUpgradePromotion.mockResolvedValue({});
    validator.getRoutePromotions.mockResolvedValue([]);
    await service.getPromotionUsageReport('id');
    await service.getPassPromotions('monthly_pass');
    await service.applyPassUpgradePromotion('PROMO', 100000, 'yearly_pass');
    await service.getRoutePromotions('route-1');
    expect(validator.getPromotionUsageReport).toHaveBeenCalledWith('id');
    expect(validator.getPassPromotions).toHaveBeenCalledWith('monthly_pass');
    expect(validator.applyPassUpgradePromotion).toHaveBeenCalledWith('PROMO', 100000, 'yearly_pass');
    expect(validator.getRoutePromotions).toHaveBeenCalledWith('route-1');
  });
});


