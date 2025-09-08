const { createPaypalOrder, capturePaypalPayment, getPaypalOrder, checkPaypalOrderStatus, handlePaypalWebhook } = require('../../src/controllers/paypal.controller');

jest.mock('../../src/services/paypal.service', () => ({
  createPaymentOrder: jest.fn(),
  capturePayment: jest.fn(),
  getOrder: jest.fn(),
  handleWebhookEvent: jest.fn(),
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const paypalService = require('../../src/services/paypal.service');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('PayPal Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createPaypalOrder returns 400 for missing fields', async () => {
    const req = { body: { ticketId: 't1' } };
    const res = mockRes();
    await createPaypalOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('createPaypalOrder returns 201 on success', async () => {
    const req = { body: { ticketId: 't1', passengerId: 'p1', amount: 100, currency: 'USD' } };
    const res = mockRes();
    paypalService.createPaymentOrder.mockResolvedValue({
      payment: { paymentId: 'pay_1' },
      paypalOrder: { id: 'ord_1' },
      approvalUrl: 'https://approve',
      captureUrl: 'https://capture',
    });
    await createPaypalOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, paymentId: 'pay_1', paypalOrderId: 'ord_1' }));
  });

  test('capturePaypalPayment returns 400 if orderId missing', async () => {
    const req = { params: {} };
    const res = mockRes();
    await capturePaypalPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('capturePaypalPayment returns 200 on success', async () => {
    const req = { params: { orderId: 'ord_1' } };
    const res = mockRes();
    paypalService.capturePayment.mockResolvedValue({
      payment: { paymentId: 'pay_1', paymentStatus: 'COMPLETED' },
      captureResult: { id: 'cap_1' },
    });
    await capturePaypalPayment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, status: 'COMPLETED' }));
  });

  test('getPaypalOrder returns status info', async () => {
    const req = { params: { orderId: 'ord_1' } };
    const res = mockRes();
    paypalService.getOrder.mockResolvedValue({ status: 'APPROVED', links: [{ rel: 'approve', href: 'u' }] });
    await getPaypalOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('checkPaypalOrderStatus maps statuses', async () => {
    const req = { params: { orderId: 'ord_2' } };
    const res = mockRes();
    paypalService.getOrder.mockResolvedValue({ status: 'CREATED', links: [{ rel: 'approve', href: 'u' }] });
    await checkPaypalOrderStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toEqual(expect.objectContaining({ action: 'REDIRECT_TO_APPROVAL', needsApproval: true }));
  });

  test('handlePaypalWebhook returns 200 on success', async () => {
    const req = { body: { id: 'evt' } };
    const res = mockRes();
    paypalService.handleWebhookEvent.mockResolvedValue();
    await handlePaypalWebhook(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});


