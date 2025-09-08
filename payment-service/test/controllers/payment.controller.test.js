const { initiateVnpayPayment, handleVnpayReturn, handleVnpayIpn, initiateSepayPayment, handleSepayWebhook } = require('../../src/controllers/payment.controller');

jest.mock('../../src/services/payment.service', () => ({
  createVnpayPayment: jest.fn(),
  handleVnpayReturn: jest.fn(),
  handleVnpayIpn: jest.fn(),
}));

jest.mock('../../src/services/sepay.service', () => ({
  createQr: jest.fn(),
  handleWebhook: jest.fn(),
}));

jest.mock('../../src/kafka/kafkaProducer', () => ({ publish: jest.fn() }));

const paymentService = require('../../src/services/payment.service');
const SepayService = require('../../src/services/sepay.service');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Payment Controller (VNPay & Sepay simplified)', () => {
  afterEach(() => jest.clearAllMocks());

  test('initiateVnpayPayment 201 on success', async () => {
    const req = { body: { ticketId: 't', passengerId: 'p', amount: 1, orderInfo: 'o', returnUrl: 'r' }, ip: '127.0.0.1' };
    const res = mockRes();
    paymentService.createVnpayPayment.mockResolvedValue({ paymentUrl: 'u', payment: { paymentId: 'pid' } });
    await initiateVnpayPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, paymentId: 'pid' }));
  });

  test('handleVnpayReturn 200 happy path', async () => {
    const req = { query: { vnp_ResponseCode: '00' } };
    const res = mockRes();
    paymentService.handleVnpayReturn.mockResolvedValue({ isSuccess: true, message: 'ok', payment: { paymentId: 'pid' } });
    await handleVnpayReturn(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
  });

  test('handleVnpayIpn 200 happy path', async () => {
    const req = { body: { x: 1 } };
    const res = mockRes();
    paymentService.handleVnpayIpn.mockResolvedValue({ isSuccess: true, message: 'ok', payment: { paymentId: 'pid' } });
    await handleVnpayIpn(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'ok' });
  });

  test('initiateSepayPayment validates input', async () => {
    const res = mockRes();
    await initiateSepayPayment({ body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('initiateSepayPayment success', async () => {
    const res = mockRes();
    SepayService.createQr.mockResolvedValue({ qr: 'q' });
    await initiateSepayPayment({ body: { ticketId: 't', passengerId: 'p', amount: 10 } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('handleSepayWebhook ok', async () => {
    const res = mockRes();
    SepayService.handleWebhook.mockResolvedValue({ ok: true });
    await handleSepayWebhook({ body: { status: 'completed', description: 'pid' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});


