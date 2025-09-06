const { PaymentStrategyFactory, PayPalPaymentStrategy, DefaultPaymentStrategy } = require('../../src/strategies/payment');

describe('Payment Strategy Tests', () => {
    // Clean up module cache before each test to ensure proper isolation
    beforeEach(() => {
        jest.resetModules();
    });
    describe('PaymentStrategyFactory', () => {
        test('should return PayPal strategy for paypal method', () => {
            const strategy = PaymentStrategyFactory.getStrategy('paypal');
            expect(strategy).toBeInstanceOf(PayPalPaymentStrategy);
            expect(strategy.getPaymentMethod()).toBe('paypal');
        });

        test('should return default strategy for unknown method', () => {
            const strategy = PaymentStrategyFactory.getStrategy('unknown');
            expect(strategy).toBeInstanceOf(DefaultPaymentStrategy);
            expect(strategy.getPaymentMethod()).toBe('default');
        });

        test('should return default strategy for null method', () => {
            const strategy = PaymentStrategyFactory.getStrategy(null);
            expect(strategy).toBeInstanceOf(DefaultPaymentStrategy);
        });

        test('should return available payment methods', () => {
            const methods = PaymentStrategyFactory.getAvailableMethods();
            expect(methods).toContain('paypal');
            expect(methods).toContain('default');
        });

        test('should check if method is supported', () => {
            expect(PaymentStrategyFactory.isMethodSupported('paypal')).toBe(true);
            expect(PaymentStrategyFactory.isMethodSupported('unknown')).toBe(false);
        });
    });

    describe('PayPalPaymentStrategy', () => {
        let strategy;

        beforeEach(() => {
            // Mock logger to reduce console noise during tests
            jest.doMock('../../src/config/logger', () => ({
                logger: {
                    error: jest.fn(),
                    warn: jest.fn(),
                    info: jest.fn(),
                    debug: jest.fn()
                }
            }));
            strategy = new PayPalPaymentStrategy();
        });

        test('should validate payment data correctly', () => {
            const validData = {
                paymentId: 'test-payment-id',
                ticketId: 'test-ticket-id',
                passengerId: 'test-passenger-id',
                amount: 100000,
                ticketData: {}
            };

            expect(strategy.validatePaymentData(validData)).toBe(true);
        });

        test('should reject invalid payment data', () => {
            const invalidData = {
                paymentId: 'test-payment-id',
                // missing required fields
                amount: 100000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        test('should convert VND to USD correctly', () => {
            const vndAmount = 260000;
            const usdAmount = strategy.convertVndToUsd(vndAmount);
            expect(usdAmount).toBe(10);
        });

        test('should detect PayPal timeout errors', () => {
            const timeoutError = new Error('Request timeout');
            const networkError = new Error('Network error');
            const authError = new Error('Client Authentication failed');
            const otherError = new Error('Other error');

            expect(strategy.isPayPalTimeoutError(timeoutError)).toBe(true);
            expect(strategy.isPayPalTimeoutError(networkError)).toBe(true);
            expect(strategy.isPayPalTimeoutError(authError)).toBe(true);
            expect(strategy.isPayPalTimeoutError(otherError)).toBe(false);
        });

        test('should generate approval link from paypal order links', () => {
            const paypalOrder = {
                id: 'ORDER123',
                links: [
                    { rel: 'approve', href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123' }
                ]
            };

            const approvalLink = strategy.generateApprovalLink(paypalOrder);
            expect(approvalLink).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER123');
        });

        test('should generate fallback approval link when no links', () => {
            const paypalOrder = {
                id: 'ORDER456'
                // No links property
            };

            const approvalLink = strategy.generateApprovalLink(paypalOrder);
            expect(approvalLink).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER456');
        });

        test('should generate alternative approval link when primary fails', () => {
            const paypalOrder = {
                id: 'ORDER789',
                links: [
                    { rel: 'self', href: 'https://api.sandbox.paypal.com/v2/checkout/orders/ORDER789' }
                    // No approve link
                ]
            };

            const approvalLink = strategy.generateApprovalLink(paypalOrder);
            expect(approvalLink).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER789');
        });

        test('should handle undefined order ID in approval link generation', () => {
            const paypalOrder = {
                id: undefined
            };

            const approvalLink = strategy.generateApprovalLink(paypalOrder);
            expect(approvalLink).toContain('undefined');
        });

        test('should process payment successfully', async () => {
            // Mock dependencies
            const mockPaypalOrder = {
                id: 'ORDER123',
                links: [{ rel: 'approve', href: 'https://approve.link' }]
            };
            const mockPaypalPayment = { paymentId: 'payment-123' };

            const mockCreatePaypalPayment = jest.fn().mockResolvedValue({
                paypalOrder: mockPaypalOrder,
                payment: mockPaypalPayment
            });
            const mockPublishEvent = jest.fn().mockResolvedValue();

            // Mock the payment service module
            jest.doMock('../../src/services/payment.service', () => ({
                createPaypalPayment: mockCreatePaypalPayment
            }));

            // Mock the events module
            jest.doMock('../../src/events/payment.producer', () => ({
                publishTicketPaymentReady: mockPublishEvent
            }));

            // Clear module cache and re-require
            jest.resetModules();
            const PayPalPaymentStrategy = require('../../src/strategies/payment/PayPalPaymentStrategy');
            const strategy = new PayPalPaymentStrategy();

            const paymentData = {
                paymentId: 'payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 260000, // VND amount
                ticketData: {
                    paymentSuccessUrl: 'https://success.com',
                    paymentCancelUrl: 'https://cancel.com'
                },
                ticketType: 'single'
            };

            const result = await strategy.processPayment(paymentData);

            expect(mockCreatePaypalPayment).toHaveBeenCalledWith({
                paymentId: 'payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 10, // Converted to USD
                orderInfo: 'Ticket payment for single - Ticket ID: ticket-456',
                currency: 'USD',
                returnUrl: 'https://success.com',
                cancelUrl: 'https://cancel.com'
            });

            expect(mockPublishEvent).toHaveBeenCalledWith(
                'ticket-456',
                'payment-123',
                'passenger-789',
                10, // USD amount
                mockPaypalOrder,
                'https://approve.link'
            );

            expect(result).toEqual({
                success: true,
                paymentId: 'payment-123',
                ticketId: 'ticket-456',
                approvalLink: 'https://approve.link',
                paypalOrder: mockPaypalOrder,
                paypalPayment: mockPaypalPayment
            });
        });

        test('should handle PayPal fallback on timeout error', async () => {
            const mockPublishEvent = jest.fn().mockResolvedValue();
            const mockCreatePayment = jest.fn().mockResolvedValue({ paymentId: 'payment-123' });

            jest.doMock('../../src/services/payment.service', () => ({
                createPaypalPayment: jest.fn().mockRejectedValue(new Error('Request timeout')),
                createPayment: mockCreatePayment
            }));

            jest.doMock('../../src/events/payment.producer', () => ({
                publishTicketPaymentReady: jest.fn(),
                publishTicketPaymentReadyFallback: mockPublishEvent
            }));

            jest.resetModules();
            const PayPalPaymentStrategy = require('../../src/strategies/payment/PayPalPaymentStrategy');
            const strategy = new PayPalPaymentStrategy();

            const paymentData = {
                paymentId: 'payment-timeout',
                ticketId: 'ticket-timeout',
                passengerId: 'passenger-timeout',
                amount: 260000,
                ticketData: {
                    paymentSuccessUrl: 'https://success.com',
                    paymentCancelUrl: 'https://cancel.com'
                },
                ticketType: 'single'
            };

            const result = await strategy.processPayment(paymentData);

            expect(mockCreatePayment).toHaveBeenCalledWith({
                paymentId: 'payment-timeout',
                ticketId: 'ticket-timeout',
                passengerId: 'passenger-timeout',
                amount: 10, // Converted to USD
                paymentMethod: 'paypal',
                paymentStatus: 'PENDING',
                paymentGatewayResponse: {
                    error: 'PayPal authentication failed',
                    fallbackMode: true,
                    originalError: 'Request timeout'
                }
            });

            expect(mockPublishEvent).toHaveBeenCalledWith(
                'ticket-timeout',
                'payment-timeout',
                'passenger-timeout',
                260000, // Original VND amount
                null // No approval link in fallback
            );

            expect(result).toEqual({
                success: true,
                paymentId: 'payment-timeout',
                ticketId: 'ticket-timeout',
                fallbackMode: true
            });
        });

        test('should throw error for non-timeout PayPal errors', async () => {
            jest.doMock('../../src/services/payment.service', () => ({
                createPaypalPayment: jest.fn().mockRejectedValue(new Error('Invalid PayPal credentials'))
            }));

            jest.resetModules();
            const PayPalPaymentStrategy = require('../../src/strategies/payment/PayPalPaymentStrategy');
            const strategy = new PayPalPaymentStrategy();

            const paymentData = {
                paymentId: 'payment-error',
                ticketId: 'ticket-error',
                passengerId: 'passenger-error',
                amount: 260000,
                ticketData: {
                    paymentSuccessUrl: 'https://success.com',
                    paymentCancelUrl: 'https://cancel.com'
                },
                ticketType: 'single'
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Invalid PayPal credentials');
        });

        test('should throw error for invalid payment data', async () => {
            const paymentData = {
                paymentId: 'payment-invalid',
                // Missing required fields
                amount: 260000
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Invalid payment data for PayPal');
        });
    });

    describe('DefaultPaymentStrategy', () => {
        let strategy;

        beforeEach(() => {
            // Mock logger to reduce console noise during tests
            jest.doMock('../../src/config/logger', () => ({
                logger: {
                    error: jest.fn(),
                    warn: jest.fn(),
                    info: jest.fn(),
                    debug: jest.fn()
                }
            }));
            strategy = new DefaultPaymentStrategy();
        });

        test('should validate payment data correctly', () => {
            const validData = {
                paymentId: 'test-payment-id',
                ticketId: 'test-ticket-id',
                passengerId: 'test-passenger-id',
                amount: 100000,
                paymentMethod: 'test-method'
            };

            expect(strategy.validatePaymentData(validData)).toBe(true);
        });

        test('should reject invalid payment data', () => {
            const invalidData = {
                paymentId: 'test-payment-id',
                // missing required fields
                amount: 100000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        test('should reject zero amount', () => {
            const invalidData = {
                paymentId: 'test-payment-id',
                ticketId: 'test-ticket-id',
                passengerId: 'test-passenger-id',
                amount: 0,
                paymentMethod: 'test-method'
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        test('should reject negative amount', () => {
            const invalidData = {
                paymentId: 'test-payment-id',
                ticketId: 'test-ticket-id',
                passengerId: 'test-passenger-id',
                amount: -1000,
                paymentMethod: 'test-method'
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        test('should process payment successfully', async () => {
            // Mock dependencies
            const mockPayment = {
                paymentId: 'test-payment-123',
                paymentStatus: 'COMPLETED'
            };

            const mockCreatePayment = jest.fn().mockResolvedValue(mockPayment);
            const mockPublishEvent = jest.fn().mockResolvedValue();

            // Mock the service and event modules
            jest.doMock('../../src/services/payment.service', () => ({
                createPayment: mockCreatePayment
            }));

            jest.doMock('../../src/events/payment.producer', () => ({
                publishTicketPaymentReadyNonPaypal: mockPublishEvent
            }));

            jest.resetModules();
            const DefaultPaymentStrategy = require('../../src/strategies/payment/DefaultPaymentStrategy');
            const strategy = new DefaultPaymentStrategy();

            const paymentData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                paymentMethod: 'test-method',
                ticketData: { test: 'data' },
                ticketType: 'single'
            };

            const result = await strategy.processPayment(paymentData);

            expect(mockCreatePayment).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                paymentMethod: 'test-method',
                paymentStatus: 'COMPLETED',
                paymentGatewayResponse: {
                    ticketData: { test: 'data' },
                    ticketType: 'single',
                    testMode: true,
                    message: 'Payment completed in test mode'
                }
            });

            expect(mockPublishEvent).toHaveBeenCalledWith('ticket-456', 'test-payment-123', 'test-method');

            expect(result).toEqual({
                success: true,
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                payment: mockPayment,
                testMode: true
            });
        }, 10000);

        test('should throw error for invalid payment data', async () => {
            const paymentData = {
                paymentId: 'test-payment-invalid',
                // Missing required fields
                amount: 50000
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Invalid payment data for default payment');
        });

        test('should handle database errors', async () => {
            const mockCreatePayment = jest.fn().mockRejectedValue(new Error('Database error'));

            jest.doMock('../../src/services/payment.service', () => ({
                createPayment: mockCreatePayment
            }));

            jest.resetModules();
            const DefaultPaymentStrategy = require('../../src/strategies/payment/DefaultPaymentStrategy');
            const strategy = new DefaultPaymentStrategy();

            const paymentData = {
                paymentId: 'test-payment-error',
                ticketId: 'ticket-error',
                passengerId: 'passenger-error',
                amount: 50000,
                paymentMethod: 'test-method'
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Database error');
        }, 10000);
    });
});

