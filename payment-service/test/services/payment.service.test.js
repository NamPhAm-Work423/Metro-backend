// Models and DB are mapped via jest.config.js moduleNameMapper

describe('payment.service', () => {
  describe('createVnpayPayment', () => {
    it('creates payment and returns paymentUrl', async () => {
      // Mock vnpay service buildPaymentUrl
      jest.resetModules();
      jest.doMock('../../src/services/vnpay.service', () => ({
        buildPaymentUrl: jest.fn(() => 'https://vnpay.example/redirect'),
        verifyReturnUrl: jest.fn((q) => ({ isSuccess: true, message: 'ok' })),
        verifyIpnCallback: jest.fn((q) => ({ isSuccess: true, message: 'ok' })),
      }));

      const service = require('../../src/services/payment.service');

      const result = await service.createVnpayPayment({
        ticketId: 1,
        passengerId: 2,
        amount: 10,
        orderInfo: 'test',
        returnUrl: 'https://return',
        clientIp: '127.0.0.1',
      });

      expect(result.paymentUrl).toBe('https://vnpay.example/redirect');
      expect(result.payment).toBeDefined();
      expect(result.payment.paymentMethod).toBe('vnpay');
      expect(result.payment.paymentStatus).toBe('PENDING');
    });
  });

  describe('handleVnpayReturn', () => {
    it('updates payment status based on verification', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/vnpay.service', () => ({
        buildPaymentUrl: jest.fn(),
        verifyReturnUrl: jest.fn(() => ({ isSuccess: true, message: 'success' })),
        verifyIpnCallback: jest.fn(),
      }));

      const { createVnpayPayment, handleVnpayReturn } = require('../../src/services/payment.service');
      await createVnpayPayment({ ticketId: 1, passengerId: 2, amount: 10, orderInfo: 't', returnUrl: 'r', clientIp: 'ip' });
      const res = await handleVnpayReturn({ vnp_TxnRef: 'x' });
      expect(res.isSuccess).toBe(true);
      expect(res.message).toBe('success');
      expect(res.payment.paymentStatus).toBe('COMPLETED');
    });
  });

  describe('createPaypalPayment', () => {
    it('creates payment and calls paypal service', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(async () => ({ id: 'ORDER123', status: 'CREATED' })),
        captureOrder: jest.fn(),
        getOrder: jest.fn(),
      }));

      const { createPaypalPayment } = require('../../src/services/payment.service');
      const { paypalOrder, payment } = await createPaypalPayment({
        paymentId: 'p-1', ticketId: 1, passengerId: 2, amount: 15.5, orderInfo: 't', currency: 'USD', returnUrl: 'r', cancelUrl: 'c'
      });

      expect(paypalOrder.id).toBe('ORDER123');
      expect(payment.paymentStatus).toBe('PENDING');
      expect(payment.paymentGatewayResponse.paypalOrderId).toBe('ORDER123');
    });
  });

  describe('capturePaypalPayment', () => {
    it('captures order and updates payment', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(async () => ({ id: 'ORDER123', status: 'CREATED' })),
        captureOrder: jest.fn(async () => ({ id: 'ORDER123', status: 'COMPLETED' })),
        getOrder: jest.fn(),
      }));

      const { createPaypalPayment, capturePaypalPayment } = require('../../src/services/payment.service');
      await createPaypalPayment({ paymentId: 'p-2', ticketId: 1, passengerId: 2, amount: 20, orderInfo: 't', currency: 'USD', returnUrl: 'r', cancelUrl: 'c' });
      const res = await capturePaypalPayment('ORDER123');
      expect(res.isSuccess).toBe(true);
      expect(res.message).toBe('Payment completed');
    });
  });
});


