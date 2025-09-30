const TicketService = require('../../../../src/services/ticket/services/TicketService');

jest.mock('../../../../src/models/index.model', () => ({
  TransitPass: {
    findOne: jest.fn().mockResolvedValue({ price: '100000', currency: 'VND' }),
    transitPassType: ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'],
  },
  PassengerDiscount: {
    findOne: jest.fn().mockResolvedValue(null),
  },
  Promotion: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../../src/services/ticket/services/TicketPaymentService', () => ({
  processTicketPayment: jest.fn().mockResolvedValue({ paymentId: 'pay_long_1' }),
  waitForPaymentResponse: jest.fn().mockResolvedValue({ status: 'success' }),
}));

describe('TicketService long-term additional branches', () => {
  const service = require('../../../../src/services/ticket/services/TicketService');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TICKET_QR_SECRET = 'secret';
  });

  test('_generateQRCode returns base64 with 64-char HMAC signature', () => {
    const qr = service._generateQRCode('QR-DATA');
    expect(typeof qr).toBe('string');
    const payload = JSON.parse(Buffer.from(qr, 'base64').toString());
    expect(payload).toHaveProperty('ticketId', 'QR-DATA');
    expect(payload.signature).toMatch(/^[a-f0-9]{64}$/);
  });

  test('_createLongTermTicketInternal logs invalid pass type but continues', async () => {
    const infoSpy = jest.spyOn(require('../../../../src/config/logger').logger, 'info').mockImplementation(() => {});
    const errSpy = jest.spyOn(require('../../../../src/config/logger').logger, 'error').mockImplementation(() => {});

    const serviceModule = require('../../../../src/services/ticket/services/TicketService');
    const createSpy = jest.spyOn(serviceModule.repository, 'create').mockResolvedValue({
      ticketId: 't-long-1',
      passengerId: 'p1',
      qrCode: null,
      reload: jest.fn().mockResolvedValue(true),
    });
    const updateSpy = jest.spyOn(serviceModule.repository, 'update').mockResolvedValue({});

    const res = await serviceModule._createLongTermTicketInternal({
      passengerId: 'p1',
      passType: 'unknown',
      paymentMethod: 'card',
      currency: 'VND',
    });

    expect(createSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalledWith('t-long-1', expect.objectContaining({ qrCode: expect.any(String) }));
    expect(res).toHaveProperty('ticket');

    infoSpy.mockRestore();
    errSpy.mockRestore();
  });

  test('_createLongTermTicketInternal handles QR generation failure and falls back', async () => {
    const serviceModule = require('../../../../src/services/ticket/services/TicketService');
    const createSpy = jest.spyOn(serviceModule.repository, 'create').mockResolvedValue({
      ticketId: 't-long-2',
      passengerId: 'p1',
      qrCode: null,
      reload: jest.fn().mockResolvedValue(true),
    });
    jest.spyOn(serviceModule.repository, 'update').mockResolvedValue({});

    const qrSpy = jest.spyOn(serviceModule, '_generateQRCode').mockImplementation(() => { throw new Error('qr-fail'); });

    const res = await serviceModule._createLongTermTicketInternal({
      passengerId: 'p1',
      passType: 'monthly_pass',
      paymentMethod: 'card',
      currency: 'VND',
    });

    expect(createSpy).toHaveBeenCalled();
    expect(res).toHaveProperty('ticket');
    expect(res.ticket.qrCode).toBe('t-long-2');

    qrSpy.mockRestore();
  });
});


