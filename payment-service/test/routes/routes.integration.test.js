const request = require('supertest');

jest.mock('../../src/services/payment.service', () => ({
  createVnpayPayment: jest.fn().mockResolvedValue({ paymentUrl: 'u', payment: { paymentId: 'pid' } }),
  handleVnpayReturn: jest.fn().mockResolvedValue({ isSuccess: true, message: 'ok', payment: { paymentId: 'pid' } }),
  handleVnpayIpn: jest.fn().mockResolvedValue({ isSuccess: true, message: 'ok', payment: { paymentId: 'pid' } }),
}));

const app = require('../../src/app');

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
  requestLogger: jest.fn(),
}));

jest.mock('../../src/middlewares/metrics.middleware', () => (req, res, next) => next());
jest.mock('../../src/kafka/kafkaProducer', () => ({ publish: jest.fn().mockResolvedValue(undefined) }));

// Mock network source validation by setting header expected by app
function svc() {
  return { 'x-service-auth': 'test' };
}

describe('Routes integration', () => {
  test('Health endpoint works', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  test('Payment routes 404 for unknown', async () => {
    const res = await request(app).get('/v1/payment/unknown').set(svc());
    expect(res.status).toBe(404);
  });

  test('VNPay route wiring: POST /v1/payment/vnpay', async () => {
    const res = await request(app).post('/v1/payment/vnpay').set(svc()).send({ ticketId: 't', passengerId: 'p', amount: 1, orderInfo: 'o', returnUrl: 'r' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('paymentId');
  });
});


