const TicketValidatorService = require('../../../../src/services/ticket/services/TicketValidatorService');

jest.mock('../../../../src/models/index.model', () => ({
  Ticket: {
    findByPk: jest.fn(),
  },
}));

const { Ticket } = require('../../../../src/models/index.model');

describe('TicketValidatorService', () => {
  const svc = require('../../../../src/services/ticket/services/TicketValidatorService');

  const makeTicket = (overrides = {}) => ({
    ticketId: 't1',
    status: 'active',
    isActive: true,
    validFrom: new Date(Date.now() - 1000),
    validUntil: new Date(Date.now() + 3600_000),
    originStationId: 'A',
    destinationStationId: 'B',
    passengerId: 'p1',
    totalPrice: 10000,
    ticketType: 'oneway',
    ...overrides,
  });

  test('validateTicket returns not found when missing', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    const res = await svc.validateTicket('missing');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/not found/);
  });

  test('validateTicket returns false for expired', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ validUntil: new Date(Date.now() - 1000) }));
    const res = await svc.validateTicket('t1');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/expired/);
  });

  test('validateTicket returns false for not yet valid', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ validFrom: new Date(Date.now() + 10000) }));
    const res = await svc.validateTicket('t1');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/not yet valid/);
  });

  test('validateTicket returns false when status inactive', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ status: 'pending_payment' }));
    const res = await svc.validateTicket('t1');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/status is/);
  });

  test('validateTicket returns false when deactivated', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ isActive: false }));
    const res = await svc.validateTicket('t1');
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/deactivated/);
  });

  test('validateTicket returns valid with ticket summary', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket());
    const res = await svc.validateTicket('t1');
    expect(res.valid).toBe(true);
    expect(res.ticket).toHaveProperty('ticketId', 't1');
  });

  test('validateTicketAtGate returns invalid when not valid', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ validUntil: new Date(Date.now() - 1000) }));
    const res = await svc.validateTicketAtGate('t1', 'A', 'entry');
    expect(res.valid).toBe(false);
  });

  test('validateTicketAtGate allows passes', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ ticketType: 'monthly_pass' }));
    const res = await svc.validateTicketAtGate('t1', 'A', 'entry');
    expect(res.valid).toBe(true);
  });

  test('validateEntry denies wrong station', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ originStationId: 'X' }));
    const res = await svc.validateEntry('t1', 'A');
    expect(res.valid).toBe(false);
  });

  test('validateExit always true currently', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket());
    const res = await svc.validateExit('t1', 'B');
    expect(res.valid).toBe(true);
  });

  test('validateOwnership returns false when not found', async () => {
    Ticket.findByPk.mockResolvedValue(null);
    const res = await svc.validateOwnership('missing', 'p1');
    expect(res).toBe(false);
  });

  test('validateOwnership returns true when matches', async () => {
    Ticket.findByPk.mockResolvedValue(makeTicket({ passengerId: 'p1' }));
    const res = await svc.validateOwnership('t1', 'p1');
    expect(res).toBe(true);
  });
});


