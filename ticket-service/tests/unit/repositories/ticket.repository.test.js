const TicketRepository = require('../../../src/services/ticket/repositories/TicketRepository');

jest.mock('../../../src/models/index.model', () => {
  const makeTicket = (overrides = {}) => ({
    ticketId: overrides.ticketId || 't-1',
    passengerId: overrides.passengerId || 'p-1',
    tripId: overrides.tripId || 'trip-1',
    status: overrides.status || 'pending',
    ticketType: overrides.ticketType || 'single',
    fareId: overrides.fareId || 'fare-1',
    paymentId: overrides.paymentId,
    isActive: overrides.isActive ?? true,
    notes: overrides.notes,
    specialRequests: overrides.specialRequests,
    totalPrice: overrides.totalPrice || 10000,
    basePrice: overrides.basePrice || 9000,
    discountAmount: overrides.discountAmount || 1000,
    destinationStationId: overrides.destinationStationId || 'S2',
    update: jest.fn(function (data) { return Object.assign(this, data); }),
    destroy: jest.fn(),
    save: jest.fn(async function(){ return this; }),
    activatedAt: null,
  });

  const db = { tickets: [] };

  const Ticket = {
    create: jest.fn(async (data) => { const t = makeTicket(data); db.tickets.push(t); return t; }),
    findByPk: jest.fn(async (id) => db.tickets.find(t => t.ticketId === id) || null),
    findOne: jest.fn(async ({ where }) => db.tickets.find(t => Object.keys(where).every(k => t[k] === where[k])) || null),
    findAll: jest.fn(async ({ where = {}, order } = {}) => {
      let items = db.tickets.filter(t => Object.keys(where).every(k => t[k] === where[k] || (where[k] && where[k]['$between'] && t[k] >= where[k]['$between'][0] && t[k] <= where[k]['$between'][1]) || (typeof where[k] === 'object' && where[k]['$like'] && String(t[k] || '').includes(where[k]['$like'].replace(/%/g, '')))));
      if (order) { items = items.slice(); }
      return items;
    }),
    update: jest.fn(async (data, { where }) => {
      const before = db.tickets.filter(t => Object.keys(where).every(k => t[k] === where[k]));
      before.forEach(t => Object.assign(t, data));
      return [before.length];
    }),
    count: jest.fn(async ({ where = {} } = {}) => db.tickets.filter(t => Object.keys(where).every(k => t[k] === where[k])).length),
    sequelize: { fn: jest.fn(), col: jest.fn() },
  };

  const Fare = {};
  const Promotion = {};

  return { Ticket, Fare, Promotion };
});

jest.mock('../../../src/config/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

describe('TicketRepository', () => {
  beforeEach(() => {
    const { Ticket } = require('../../../src/models/index.model');
    Ticket.create.mockClear();
    Ticket.findByPk.mockClear();
    Ticket.findOne.mockClear();
    Ticket.findAll.mockClear();
    Ticket.update.mockClear();
    Ticket.count.mockClear();
  });

  test('create and findById', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    const created = await repo.create({ ticketId: 'x1', passengerId: 'p1' });
    const found = await repo.findById('x1');
    expect(found.ticketId).toBe('x1');
    expect(created).toBe(found);
  });

  test('findById throws when missing', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await expect(repo.findById('missing')).rejects.toThrow('Ticket not found');
  });

  test('findAll applies various filters', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'a', passengerId: 'P', status: 'active', ticketType: 'single', originStationId: 'S1', destinationStationId: 'S2' });
    await repo.create({ ticketId: 'b', passengerId: 'Q', status: 'pending', ticketType: 'return', originStationId: 'S1', destinationStationId: 'S3' });
    const res = await repo.findAll({ passengerId: 'P', status: 'active' });
    expect(res).toHaveLength(1);
    expect(res[0].ticketId).toBe('a');
  });

  test('findByPassengerId filters and sorts', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'c', passengerId: 'R', status: 'active' });
    await repo.create({ ticketId: 'd', passengerId: 'R', status: 'pending' });
    const list = await repo.findByPassengerId('R', { status: 'active' });
    expect(list).toHaveLength(1);
    expect(list[0].ticketId).toBe('c');
  });

  test('findByPaymentId finds latest by paymentId', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'e', paymentId: 'pay-1' });
    const t = await repo.findByPaymentId('pay-1');
    expect(t.ticketId).toBe('e');
  });

  test('activateLongTermTicket sets active and timestamp', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'f', save: jest.fn(async function(){ return this; }) });
    const t = await repo.activateLongTermTicket('f');
    expect(t.status).toBe('active');
    expect(t.activatedAt).toBeInstanceOf(Date);
  });

  test('update throws when not found', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await expect(repo.update('none', { status: 'active' })).rejects.toThrow('Ticket not found');
  });

  test('update applies fields', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'g', status: 'pending' });
    const updated = await repo.update('g', { status: 'used' });
    expect(updated.status).toBe('used');
  });

  test('delete returns false when missing', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    const res = await repo.delete('missing');
    expect(res).toBe(false);
  });

  test('delete returns true when exists', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'h' });
    const res = await repo.delete('h');
    expect(res).toBe(true);
  });

  test('bulkUpdate returns count', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'i', status: 'pending' });
    const count = await repo.bulkUpdate({ status: 'pending' }, { status: 'active' });
    expect(count).toBeGreaterThan(0);
  });

  test('count returns number of tickets by filter', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    await repo.create({ ticketId: 'j', status: 'pending' });
    const count = await repo.count({ status: 'pending' });
    expect(count).toBeGreaterThan(0);
  });

  test('getStatistics executes grouped query (mocked)', async () => {
    const repo = require('../../../src/services/ticket/repositories/TicketRepository');
    // Ensure no throw; our mock returns [] by default
    await repo.getStatistics({});
    const { Ticket } = require('../../../src/models/index.model');
    expect(Ticket.findAll).toHaveBeenCalled();
  });
});


