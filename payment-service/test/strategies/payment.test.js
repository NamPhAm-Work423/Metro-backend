const { PaymentStrategyFactory, PayPalPaymentStrategy, DefaultPaymentStrategy } = require('../../src/strategies/payment');

describe('Payment Strategy Tests', () => {
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
    });

    describe('DefaultPaymentStrategy', () => {
        let strategy;

        beforeEach(() => {
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
    });
});

