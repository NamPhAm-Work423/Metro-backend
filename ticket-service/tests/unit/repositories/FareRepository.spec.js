const FareRepository = require('../../../src/services/fare/repositories/FareRepository');

jest.mock('../../../src/models/index.model', () => ({
  Fare: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    sequelize: { fn: jest.fn(), col: jest.fn() },
  },
  Ticket: { count: jest.fn() },
}));

const { Fare, Ticket } = require('../../../src/models/index.model');

describe('FareRepository', () => {
  const repo = new FareRepository();

  test('findAll forwards filters to Fare.findAll with include/order', async () => {
    Fare.findAll.mockResolvedValue([{ fareId: 'f1' }]);
    const rows = await repo.findAll({ isActive: true, routeId: 'r1' });
    expect(Fare.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, routeId: 'r1' }),
        include: expect.any(Array),
        order: expect.any(Array),
      })
    );
    expect(rows).toHaveLength(1);
  });

  test('findById throws when not found', async () => {
    Fare.findByPk.mockResolvedValue(null);
    await expect(repo.findById('missing')).rejects.toThrow('Fare not found');
  });

  test('update throws when not found', async () => {
    Fare.findByPk.mockResolvedValue(null);
    await expect(repo.update('missing', { basePrice: 1 })).rejects.toThrow('Fare not found');
  });

  test('softDelete blocks when active tickets exist', async () => {
    Fare.findByPk.mockResolvedValue({ update: jest.fn() });
    Ticket.count.mockResolvedValue(2);
    await expect(repo.softDelete('f1')).rejects.toThrow('Cannot delete');
  });

  test('delete performs destroy when allowed', async () => {
    Fare.findByPk.mockResolvedValue({});
    Ticket.count.mockResolvedValue(0);
    Fare.destroy.mockResolvedValue(1);
    const res = await repo.delete('f1');
    expect(Fare.destroy).toHaveBeenCalledWith({ where: { fareId: 'f1' } });
    expect(res).toMatchObject({ message: expect.any(String) });
  });

  test('findByRoute builds where and orders', async () => {
    Fare.findAll.mockResolvedValue([{ fareId: 'f1' }]);
    const rows = await repo.findByRoute('r1', { ticketType: 'oneway', passengerType: 'adult' });
    expect(Fare.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ routeId: 'r1', isActive: true, ticketType: 'oneway', passengerType: 'adult' }),
      })
    );
    expect(rows).toHaveLength(1);
  });

  test('findActiveFareForRoute returns first match', async () => {
    Fare.findOne.mockResolvedValue({ fareId: 'f1' });
    const row = await repo.findActiveFareForRoute('r1');
    expect(row).toMatchObject({ fareId: 'f1' });
  });
});


