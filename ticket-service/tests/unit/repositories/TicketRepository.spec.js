const TicketRepository = require('../../../src/services/ticket/repositories/TicketRepository');

jest.mock('../../../src/models/index.model', () => ({
  Ticket: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    sequelize: { fn: jest.fn(), col: jest.fn() },
  },
  Fare: {},
  Promotion: {},
}));

const { Ticket } = require('../../../src/models/index.model');

describe('TicketRepository', () => {
  const repo = new TicketRepository.constructor ? new TicketRepository.constructor() : require('../../../src/services/ticket/repositories/TicketRepository');

  test('findById throws when not found', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    await expect(repo.findById('missing')).rejects.toThrow('Ticket not found');
  });

  test('update throws when not found', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    await expect(repo.update('missing', { status: 'active' })).rejects.toThrow('Ticket not found');
  });

  test('delete returns false when missing', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    const res = await repo.delete('missing');
    expect(res).toBe(false);
  });
});


