jest.mock('../../../../src/events/ticket.producer', () => ({ publishTicketActivated: jest.fn() }));
jest.mock('../../../../src/services/ticket/services/TicketPaymentService', () => ({
  processTicketPayment: jest.fn().mockResolvedValue({ paymentId: 'pay_1' }),
  waitForPaymentResponse: jest.fn().mockResolvedValue({ status: 'success' }),
}));

const paymentSvc = require('../../../../src/services/ticket/services/TicketPaymentService');
const TicketService = require('../../../../src/services/ticket/services/TicketService');

describe('TicketService payment and QR helpers', () => {
  const service = require('../../../../src/services/ticket/services/TicketService');

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env.TICKET_QR_SECRET = 'secret';
  });

  test('_generateQRCode returns base64 string when secret present', () => {
    const qr = service._generateQRCode('ticket-123');
    expect(typeof qr).toBe('string');
    expect(() => Buffer.from(qr, 'base64')).not.toThrow();
  });

  test('_generateQRCode throws when secret missing', () => {
    delete process.env.TICKET_QR_SECRET;
    expect(() => service._generateQRCode('t1')).toThrow('TICKET_QR_SECRET');
  });

  test('_processPayment throws on invalid amount', async () => {
    await expect(service._processPayment({ ticketId: 't1', ticketType: 'oneway' }, 'short-term', { amount: 'NaN' }))
      .rejects.toThrow('Payment amount is invalid');
  });

  test('_processPayment zero amount short-term throws', async () => {
    await expect(service._processPayment({ ticketId: 't1', ticketType: 'oneway' }, 'short-term', { amount: 0 }))
      .rejects.toThrow('Payment amount is not valid');
  });

  test('_processPayment zero amount long-term updates repository and returns nulls', async () => {
    const updateSpy = jest.spyOn(service.repository, 'update').mockResolvedValue({});
    const res = await service._processPayment({ ticketId: 't2', ticketType: 'monthly_pass' }, 'long-term', { amount: 0 });
    expect(updateSpy).toHaveBeenCalledWith('t2', expect.objectContaining({ paymentMethod: 'free' }));
    expect(res).toMatchObject({ paymentResult: { paymentId: null }, paymentResponse: null });
  });

  test('_processPayment happy path processes and optionally waits', async () => {
    const result = await service._processPayment({ ticketId: 't3', ticketType: 'oneway' }, 'short-term', { amount: 10000 }, true, 1000);
    expect(paymentSvc.processTicketPayment).toHaveBeenCalled();
    expect(paymentSvc.waitForPaymentResponse).toHaveBeenCalledWith('pay_1', 1000);
    expect(result.paymentResult.paymentId).toBe('pay_1');
    expect(result.paymentResponse).toMatchObject({ status: 'success' });
  });

  test('_processPayment returns failure when waitForPaymentResponse returns null', async () => {
    paymentSvc.waitForPaymentResponse.mockResolvedValueOnce(null);
    const result = await service._processPayment({ ticketId: 't4', ticketType: 'oneway' }, 'short-term', { amount: 10000 }, true, 1000);
    expect(result.paymentResponse).toBeNull();
  });

  test('_processPayment returns failure when processTicketPayment rejects', async () => {
    paymentSvc.processTicketPayment.mockRejectedValueOnce(new Error('network'));
    await expect(
      service._processPayment({ ticketId: 't5', ticketType: 'oneway' }, 'short-term', { amount: 10000 }, true, 1000)
    ).rejects.toThrow();
  });

  test('_buildTicketUsageInfo composes fields with breakdowns', () => {
    const info = service._buildTicketUsageInfo({
      ticketId: 't', status: 'active', passengerId: 'p', ticketType: 'oneway',
      originStationId: 'A', destinationStationId: 'B', validFrom: new Date(), validUntil: new Date(),
      usedList: [], stationCount: 2, fareId: 'f', promotionId: null, paymentMethod: 'card',
      originalPrice: 10000, discountAmount: 0, finalPrice: 10000, totalPrice: 10000, qrCode: 'QR',
      fareBreakdown: { passengerBreakdown: [], segmentFares: [], passengerType: 'adult' }
    });
    expect(info).toHaveProperty('ticketId', 't');
    expect(info).toHaveProperty('passengerBreakdown');
    expect(info).toHaveProperty('segmentFares');
    expect(info).toHaveProperty('passengerType', 'adult');
  });
});


