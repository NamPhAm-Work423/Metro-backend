const { TicketActivationService } = require('../../../../src/services/ticket/domain/TicketActivationService');

describe('TicketActivationService.activateLongTermTicket', () => {
  const makeTicket = (overrides = {}) => ({
    ticketId: 't1',
    ticketType: 'monthly_pass',
    status: 'inactive',
    passengerId: 'p1',
    paymentMethod: 'cash',
    qrCode: 'QR',
    update: jest.fn(function (fields) { return Promise.resolve({ ...this, ...fields }); }),
    reload: jest.fn(function () { return Promise.resolve(this); }),
    ...overrides,
  });

  test('activates long-term ticket and publishes event (ignored errors)', async () => {
    // Mock producer to avoid side effects
    jest.mock('../../../../src/events/ticket.producer', () => ({
      publishTicketActivated: jest.fn().mockResolvedValue(undefined),
    }));

    const ticket = makeTicket();
    const updated = await TicketActivationService.activateLongTermTicket(ticket);

    expect(ticket.update).toHaveBeenCalled();
    expect(updated.status).toBe('active');
    expect(updated.validFrom).toBeInstanceOf(Date);
    expect(updated.validUntil).toBeInstanceOf(Date);
  });

  test('throws for non-long-term ticket types', async () => {
    const ticket = makeTicket({ ticketType: 'single', status: 'inactive' });
    await expect(TicketActivationService.activateLongTermTicket(ticket)).rejects.toThrow('Only long-term tickets');
  });

  test('throws when already active', async () => {
    const ticket = makeTicket({ status: 'active' });
    await expect(TicketActivationService.activateLongTermTicket(ticket)).rejects.toThrow('already active');
  });

  test('throws when not paid/inactive', async () => {
    const ticket = makeTicket({ status: 'pending_payment' });
    await expect(TicketActivationService.activateLongTermTicket(ticket)).rejects.toThrow('must be paid');
  });
});


