jest.useFakeTimers();

const service = require('../../../../src/services/ticket/services/TicketPaymentService');

jest.mock('../../../../src/models/index.model', () => ({
  Ticket: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  }
}));

jest.mock('../../../../src/events/ticket.producer', () => ({
  publishTicketCreated: jest.fn().mockResolvedValue('PAY_final_id'),
  generatePaymentId: jest.fn((ticketId, type) => `PAY_${type}_${ticketId || 'TEMP'}`),
  getPaymentData: jest.fn()
}));

jest.mock('node-cache', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map();
    return {
      set: (k, v) => store.set(k, v),
      get: (k) => store.get(k)
    };
  });
});

jest.mock('../../../../src/config/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } }));

const { Ticket } = require('../../../../src/models/index.model');
const Producer = require('../../../../src/events/ticket.producer');

describe('TicketPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  test('waitForPaymentResponse resolves from Kafka cache quickly', async () => {
    Producer.getPaymentData.mockImplementation((id) => id === 'PAY_short-term_ABC' ? { paymentUrl: 'http://pay', ticketId: 'ABC', paymentMethod: 'paypal', paypalOrderId: 'O1' } : null);
    const p = service.waitForPaymentResponse('PAY_short-term_ABC', 5000);
    jest.advanceTimersByTime(1000);
    const res = await p;
    expect(res).toMatchObject({ status: 'success', paymentUrl: 'http://pay' });
  });

  test('waitForPaymentResponse times out and returns null', async () => {
    Producer.getPaymentData.mockReturnValue(null);
    Ticket.findOne.mockResolvedValue(null);
    const p = service.waitForPaymentResponse('PAY_short-term_TEMP', 2500);
    jest.advanceTimersByTime(3000);
    const res = await p;
    expect(res).toBeNull();
  });

  test('getCachedOrFetch caches results', async () => {
    const key = 'k1';
    const fetch = jest.fn().mockResolvedValue(42);
    const first = await service.getCachedOrFetch(key, fetch, 60);
    const second = await service.getCachedOrFetch(key, fetch, 60);
    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('processTicketPayment updates paymentId flow and publishes', async () => {
    const mockTicket = { ticketId: 'T1', save: jest.fn(), totalPrice: 10000 };
    const res = await service.processTicketPayment(mockTicket, 'short-term', { paymentSuccessUrl: 'ok', paymentFailUrl: 'fail', currency: 'VND' });
    expect(mockTicket.save).toHaveBeenCalledTimes(2);
    expect(Producer.publishTicketCreated).toHaveBeenCalled();
    expect(res.paymentId).toBe('PAY_final_id');
  });

  test('payAdditionalFare throws when no additional fare is required', async () => {
    Ticket.findByPk.mockResolvedValue({ ticketId: 'T1', destinationStationId: 'D1', passengerId: 'P1' });
    await expect(service.payAdditionalFare('T1', 'D2')).rejects.toThrow('No additional fare required');
  });
});


