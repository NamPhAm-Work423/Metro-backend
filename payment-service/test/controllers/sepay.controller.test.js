const { createSepayOrder, getSepayOrder, checkSepayOrderStatus, captureSepayPayment, handleSepayWebhook } = require('../../src/controllers/sepay.controller');

jest.mock('../../src/services/sepay.service', () => ({
  createQr: jest.fn(),
  handleWebhook: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../src/kafka/kafkaProducer', () => ({
  publish: jest.fn(),
}));

jest.mock('../../src/models/index.model', () => ({
  Payment: { findByPk: jest.fn() },
  Transaction: { findOne: jest.fn() },
  PaymentLog: {},
}));

const SepayService = require('../../src/services/sepay.service');
const { Payment, Transaction } = require('../../src/models/index.model');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Sepay Controller', () => {
  afterEach(() => jest.clearAllMocks());

  test('createSepayOrder validates input', async () => {
    const req = { body: { ticketId: 't1' } };
    const res = mockRes();
    await createSepayOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createSepayOrder success', async () => {
    const req = { body: { ticketId: 't1', passengerId: 'p1', amount: 100 } };
    const res = mockRes();
    SepayService.createQr.mockResolvedValue({ qr: 'q', paymentId: 'id' });
    await createSepayOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('getSepayOrder 400 when missing orderId', async () => {
    const res = mockRes();
    await getSepayOrder({ params: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('getSepayOrder 404 when not found', async () => {
    Payment.findByPk.mockResolvedValue(null);
    const res = mockRes();
    await getSepayOrder({ params: { orderId: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('getSepayOrder 200 with transaction', async () => {
    Payment.findByPk.mockResolvedValue({ paymentId: 'id', ticketId: 't', passengerId: 'p', paymentAmount: 1, currency: 'VND', paymentStatus: 'PENDING', paymentMethod: 'SEPAY', createdAt: new Date(), paymentDate: null, description: '' });
    Transaction.findOne.mockResolvedValue({ transactionAmount: 1, transactionStatus: 'PENDING', createdAt: new Date() });
    const res = mockRes();
    await getSepayOrder({ params: { orderId: 'id' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('checkSepayOrderStatus returns canCapture', async () => {
    Payment.findByPk.mockResolvedValue({ paymentId: 'id', paymentStatus: 'PENDING', paymentDate: null });
    const res = mockRes();
    await checkSepayOrderStatus({ params: { orderId: 'id' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toEqual(expect.objectContaining({ success: true }));
  });

  test('captureSepayPayment validates status', async () => {
    const res = mockRes();
    await captureSepayPayment({ params: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Payment.findByPk.mockResolvedValue(null);
    await captureSepayPayment({ params: { orderId: 'id' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    Payment.findByPk.mockResolvedValue({ paymentStatus: 'COMPLETED', paymentId: 'id' });
    await captureSepayPayment({ params: { orderId: 'id' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    Payment.findByPk.mockResolvedValue({ paymentStatus: 'PENDING', paymentId: 'id' });
    await captureSepayPayment({ params: { orderId: 'id' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('handleSepayWebhook ok path', async () => {
    const res = mockRes();
    SepayService.handleWebhook.mockResolvedValue({ ok: true });
    await handleSepayWebhook({ body: { status: 'completed', description: 'pid' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});


