const TicketCommunicationService = require('../../../../src/services/ticket/services/TicketCommunicationService');

jest.mock('../../../../src/models/index.model', () => ({
  Ticket: {
    findByPk: jest.fn(),
  },
  Fare: {},
  Promotion: {}
}));

jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } }));

const { Ticket } = require('../../../../src/models/index.model');

describe('TicketCommunicationService', () => {
  const service = require('../../../../src/services/ticket/services/TicketCommunicationService');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TICKET_QR_SECRET = 'secret';
  });

  test('maskPhoneNumber and maskEmail and maskContactInfo', () => {
    expect(service.maskPhoneNumber('0987654321')).toMatch(/\*{6}4321$/);
    expect(service.maskEmail('user@example.com')).toBe('us***@example.com');
    expect(service.maskContactInfo('user@example.com')).toBe('us***@example.com');
    expect(service.maskContactInfo('0987654321')).toMatch(/\*{6}4321$/);
  });

  test('sendTicketToPhone success', async () => {
    Ticket.findByPk.mockResolvedValue({ ticketId: 't1', passengerId: 'p1', status: 'active' });
    const res = await service.sendTicketToPhone('t1', '0987654321', 'p1');
    expect(res.success).toBe(true);
    expect(res.ticketSummary.ticketId).toBe('t1');
  });

  test('sendTicketToPhone throws when not found or wrong owner', async () => {
    Ticket.findByPk.mockResolvedValueOnce(null);
    await expect(service.sendTicketToPhone('missing', '0', 'p1')).rejects.toThrow('Ticket not found');

    Ticket.findByPk.mockResolvedValueOnce({ ticketId: 't1', passengerId: 'other' });
    await expect(service.sendTicketToPhone('t1', '0', 'p1')).rejects.toThrow('Unauthorized');
  });

  test('sendTicketToEmail success', async () => {
    Ticket.findByPk.mockResolvedValue({
      ticketId: 't1', passengerId: 'p1', status: 'active',
      fare: {}, promotion: null
    });
    const res = await service.sendTicketToEmail('t1', 'user@example.com', 'p1');
    expect(res.success).toBe(true);
    expect(res.ticketDetails.ticketId).toBe('t1');
  });

  test('sendTicketToEmail throws when not found or wrong owner', async () => {
    Ticket.findByPk.mockResolvedValueOnce(null);
    await expect(service.sendTicketToEmail('missing', 'u@e.com', 'p1')).rejects.toThrow('Ticket not found');

    Ticket.findByPk.mockResolvedValueOnce({ ticketId: 't1', passengerId: 'other' });
    await expect(service.sendTicketToEmail('t1', 'u@e.com', 'p1')).rejects.toThrow('Unauthorized');
  });

  test('getTicketWithQR success with secret', async () => {
    Ticket.findByPk.mockResolvedValue({
      ticketId: 't1', passengerId: 'p1', status: 'active',
      fare: {}, promotion: null
    });
    const res = await service.getTicketWithQR('t1', 'p1');
    expect(res.qrCode).toBeDefined();
    expect(res.qrCode.format).toBe('base64');
    expect(res.qrCode.metadata.ticketId).toBe('t1');
  });

  test('getTicketWithQR throws when not found, wrong owner, or secret missing', async () => {
    Ticket.findByPk.mockResolvedValueOnce(null);
    await expect(service.getTicketWithQR('missing', 'p1')).rejects.toThrow('Ticket not found');

    Ticket.findByPk.mockResolvedValueOnce({ ticketId: 't1', passengerId: 'other' });
    await expect(service.getTicketWithQR('t1', 'p1')).rejects.toThrow('Unauthorized');

    process.env.TICKET_QR_SECRET = '';
    Ticket.findByPk.mockResolvedValueOnce({ ticketId: 't1', passengerId: 'p1' });
    await expect(service.getTicketWithQR('t1', 'p1')).rejects.toThrow('TICKET_QR_SECRET is not configured');
  });

  test('generateQRData compacts payload and warns on large size threshold logic path', () => {
    const t = {
      ticketId: 't1', passengerId: 'p1', originStationId: 's1', destinationStationId: 's2',
      validFrom: new Date().toISOString(), validUntil: new Date(Date.now()+3600e3).toISOString(),
      totalPrice: 10000, fareBreakdown: { passengerBreakdown: { adult: 1 } }
    };
    const data = service.generateQRData(t);
    expect(data.ticketId).toBe('t1');
    expect(data.totalPassengers).toBe(1);
  });
});


