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

    it('handles failed capture', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(async () => ({ id: 'ORDER456', status: 'CREATED' })),
        captureOrder: jest.fn(async () => ({ id: 'ORDER456', status: 'FAILED' })),
        getOrder: jest.fn(),
      }));

      const { createPaypalPayment, capturePaypalPayment } = require('../../src/services/payment.service');
      await createPaypalPayment({ paymentId: 'p-3', ticketId: 1, passengerId: 2, amount: 25, orderInfo: 't', currency: 'USD', returnUrl: 'r', cancelUrl: 'c' });
      const res = await capturePaypalPayment('ORDER456');
      expect(res.isSuccess).toBe(false);
      expect(res.message).toBe('Payment failed');
    });

    it('handles payment not found', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(),
        captureOrder: jest.fn(async () => ({ id: 'ORDER999', status: 'COMPLETED' })),
        getOrder: jest.fn(),
      }));

      const { capturePaypalPayment } = require('../../src/services/payment.service');
      const res = await capturePaypalPayment('ORDER999');
      expect(res.isSuccess).toBe(false);
      expect(res.message).toBe('Payment not found');
    });

    it('handles capture errors', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(),
        captureOrder: jest.fn(async () => { throw new Error('Capture failed'); }),
        getOrder: jest.fn(),
      }));

      const { capturePaypalPayment } = require('../../src/services/payment.service');
      const res = await capturePaypalPayment('ORDER_ERROR');
      expect(res.isSuccess).toBe(false);
      expect(res.message).toBe('Capture failed');
    });
  });

  describe('handleVnpayIpn', () => {
    it('handles successful IPN callback', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/vnpay.service', () => ({
        buildPaymentUrl: jest.fn(),
        verifyReturnUrl: jest.fn(),
        verifyIpnCallback: jest.fn(() => ({ isSuccess: true, message: 'success' })),
      }));

      const { createVnpayPayment, handleVnpayIpn } = require('../../src/services/payment.service');
      await createVnpayPayment({ ticketId: 1, passengerId: 2, amount: 10, orderInfo: 't', returnUrl: 'r', clientIp: 'ip' });
      const res = await handleVnpayIpn({ vnp_TxnRef: 'x' });
      expect(res.isSuccess).toBe(true);
      expect(res.message).toBe('success');
      expect(res.payment.paymentStatus).toBe('COMPLETED');
    });

    it('handles failed IPN callback', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/vnpay.service', () => ({
        buildPaymentUrl: jest.fn(),
        verifyReturnUrl: jest.fn(),
        verifyIpnCallback: jest.fn(() => ({ isSuccess: false, message: 'failed' })),
      }));

      const { createVnpayPayment, handleVnpayIpn } = require('../../src/services/payment.service');
      await createVnpayPayment({ ticketId: 1, passengerId: 2, amount: 10, orderInfo: 't', returnUrl: 'r', clientIp: 'ip' });
      const res = await handleVnpayIpn({ vnp_TxnRef: 'x' });
      expect(res.isSuccess).toBe(false);
      expect(res.message).toBe('failed');
      expect(res.payment.paymentStatus).toBe('FAILED');
    });

    it('handles payment not found in IPN', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/vnpay.service', () => ({
        buildPaymentUrl: jest.fn(),
        verifyReturnUrl: jest.fn(),
        verifyIpnCallback: jest.fn(() => ({ isSuccess: true, message: 'success' })),
      }));

      const { handleVnpayIpn } = require('../../src/services/payment.service');
      const res = await handleVnpayIpn({ vnp_TxnRef: 'nonexistent' });
      expect(res.isSuccess).toBe(false);
      expect(res.message).toBe('Payment not found');
    });
  });

  describe('createPayment', () => {
    it('creates payment record successfully', async () => {
      jest.resetModules();
      const { createPayment } = require('../../src/services/payment.service');
      
      const paymentData = {
        paymentId: 'test-payment-123',
        ticketId: 'ticket-456',
        passengerId: 'passenger-789',
        amount: 50000,
        paymentMethod: 'test',
        paymentStatus: 'PENDING',
        paymentGatewayResponse: { test: 'data' }
      };

      const result = await createPayment(paymentData);
      
      expect(result).toBeDefined();
      expect(result.paymentId).toBe('test-payment-123');
      expect(result.paymentAmount).toBe(50000);
      expect(result.paymentMethod).toBe('test');
      expect(result.paymentStatus).toBe('PENDING');
    });
  });

  describe('getPaypalOrder', () => {
    it('retrieves PayPal order details', async () => {
      jest.resetModules();
      jest.doMock('../../src/services/paypal.service', () => ({
        createOrder: jest.fn(),
        captureOrder: jest.fn(),
        getOrder: jest.fn(async () => ({ id: 'ORDER123', status: 'APPROVED' })),
      }));

      const { getPaypalOrder } = require('../../src/services/payment.service');
      const result = await getPaypalOrder('ORDER123');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('ORDER123');
      expect(result.status).toBe('APPROVED');
    });
  });
});


