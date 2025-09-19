const PromotionRepository = require('../../../src/services/promotion/repositories/PromotionRepository');

jest.mock('../../../src/models/index.model', () => ({
  Promotion: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    sequelize: { fn: jest.fn(), col: jest.fn() },
  },
  Ticket: { count: jest.fn() },
}));

const { Promotion, Ticket } = require('../../../src/models/index.model');

describe('PromotionRepository', () => {
  const repo = new PromotionRepository();

  test('findByCode throws when not found', async () => {
    Promotion.findOne.mockResolvedValue(null);
    await expect(repo.findByCode('X')).rejects.toThrow('Promotion not found');
  });

  test('update by id or code resolves correct record', async () => {
    // simulate findByPk invalid UUID throws, then findOne by code returns a record
    Promotion.findByPk.mockRejectedValue(new Error('invalid input syntax for type uuid'));
    const record = { update: jest.fn().mockResolvedValue({ promotionId: 'p1' }), promotionId: 'p1', promotionCode: 'CODE' };
    Promotion.findOne.mockResolvedValue(record);
    const updated = await repo.update('CODE', { name: 'new' });
    expect(record.update).toHaveBeenCalledWith({ name: 'new' });
    expect(updated).toMatchObject({ promotionId: 'p1' });
  });

  test('delete blocks when has active tickets', async () => {
    Promotion.findByPk.mockResolvedValue({ destroy: jest.fn() });
    Ticket.count.mockResolvedValue(3);
    await expect(repo.delete('p1')).rejects.toThrow('Cannot delete');
  });
});


