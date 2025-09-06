// Mock dependencies before requiring the strategy
jest.mock('../../src/services/sepay.service', () => ({
    createQr: jest.fn(),
    handleWebhook: jest.fn()
}));

jest.mock('../../src/services/payment.service', () => ({
    createPayment: jest.fn()
}));

jest.mock('../../src/events/payment.producer', () => ({
    publishTicketPaymentReadyNonPaypal: jest.fn()
}));

const SepayPaymentStrategy = require('../../src/strategies/payment/SepayPaymentStrategy');
const SepayService = require('../../src/services/sepay.service');
const { createPayment } = require('../../src/services/payment.service');
const { publishTicketPaymentReadyNonPaypal } = require('../../src/events/payment.producer');

describe('SepayPaymentStrategy', () => {
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
        strategy = new SepayPaymentStrategy();
        jest.clearAllMocks();
    });

    describe('getPaymentMethod', () => {
        it('should return sepay as payment method', () => {
            expect(strategy.getPaymentMethod()).toBe('sepay');
        });
    });

    describe('validatePaymentData', () => {
        it('should validate correct payment data', () => {
            const validData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                currency: 'VND'
            };

            expect(strategy.validatePaymentData(validData)).toBe(true);
        });

        it('should reject missing paymentId', () => {
            const invalidData = {
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject missing ticketId', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                passengerId: 'passenger-789',
                amount: 50000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject missing passengerId', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                amount: 50000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject missing amount', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789'
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject zero or negative amount', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 0
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject negative amount', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: -1000
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should reject non-VND currency', () => {
            const invalidData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                currency: 'USD'
            };

            expect(strategy.validatePaymentData(invalidData)).toBe(false);
        });

        it('should accept VND currency', () => {
            const validData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                currency: 'VND'
            };

            expect(strategy.validatePaymentData(validData)).toBe(true);
        });

        it('should accept undefined currency (defaults to VND)', () => {
            const validData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000
            };

            expect(strategy.validatePaymentData(validData)).toBe(true);
        });
    });

    describe('processPayment', () => {
        it('should process payment successfully', async () => {
            const mockSepayResult = {
                paymentId: 'test-payment-123',
                provider: 'sepay',
                amount: 50000,
                currency: 'VND',
                qrImage: 'https://qr.sepay.vn/img?test=123'
            };

            const mockPayment = {
                paymentId: 'test-payment-123',
                paymentStatus: 'PENDING'
            };

            SepayService.createQr.mockResolvedValue(mockSepayResult);
            createPayment.mockResolvedValue(mockPayment);

            const paymentData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                ticketData: { test: 'data' },
                ticketType: 'single',
                orderDescription: 'Test payment'
            };

            const result = await strategy.processPayment(paymentData);

            expect(SepayService.createQr).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amountVnd: 50000,
                orderDescription: 'Test payment'
            });

            expect(createPayment).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000,
                paymentMethod: 'sepay',
                paymentStatus: 'PENDING',
                paymentGatewayResponse: {
                    sepayResult: mockSepayResult,
                    ticketData: { test: 'data' },
                    ticketType: 'single',
                    qrImageUrl: 'https://qr.sepay.vn/img?test=123'
                }
            });

            expect(result).toEqual({
                success: true,
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                payment: mockPayment,
                sepayResult: mockSepayResult,
                qrImageUrl: 'https://qr.sepay.vn/img?test=123',
                message: 'Sepay QR code generated successfully. Please scan to complete payment.'
            });
        });

        it('should use default order description when not provided', async () => {
            const mockSepayResult = {
                paymentId: 'test-payment-456',
                provider: 'sepay',
                amount: 30000,
                currency: 'VND',
                qrImage: 'https://qr.sepay.vn/img?test=456'
            };

            const mockPayment = {
                paymentId: 'test-payment-456',
                paymentStatus: 'PENDING'
            };

            SepayService.createQr.mockResolvedValue(mockSepayResult);
            createPayment.mockResolvedValue(mockPayment);

            const paymentData = {
                paymentId: 'test-payment-456',
                ticketId: 'ticket-789',
                passengerId: 'passenger-123',
                amount: 30000,
                ticketData: {},
                ticketType: 'monthly'
                // No orderDescription provided
            };

            await strategy.processPayment(paymentData);

            expect(SepayService.createQr).toHaveBeenCalledWith({
                paymentId: 'test-payment-456',
                ticketId: 'ticket-789',
                passengerId: 'passenger-123',
                amountVnd: 30000,
                orderDescription: 'Payment for ticket ticket-789'
            });
        });

        it('should throw error for invalid payment data', async () => {
            const paymentData = {
                paymentId: 'test-payment-invalid',
                // Missing required fields
                amount: 50000
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Invalid payment data for Sepay payment');
        });

        it('should handle Sepay service errors', async () => {
            SepayService.createQr.mockRejectedValue(new Error('Sepay service unavailable'));

            const paymentData = {
                paymentId: 'test-payment-error',
                ticketId: 'ticket-error',
                passengerId: 'passenger-error',
                amount: 50000
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Sepay service unavailable');
        });

        it('should handle payment creation errors', async () => {
            const mockSepayResult = {
                paymentId: 'test-payment-123',
                provider: 'sepay',
                amount: 50000,
                currency: 'VND',
                qrImage: 'https://qr.sepay.vn/img?test=123'
            };

            SepayService.createQr.mockResolvedValue(mockSepayResult);
            createPayment.mockRejectedValue(new Error('Database error'));

            const paymentData = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amount: 50000
            };

            await expect(strategy.processPayment(paymentData)).rejects.toThrow('Database error');
        });
    });

    describe('handlePaymentCompletion', () => {
        it('should handle successful payment completion', async () => {
            const mockWebhookResult = { ok: true };
            SepayService.handleWebhook.mockResolvedValue(mockWebhookResult);
            publishTicketPaymentReadyNonPaypal.mockResolvedValue();

            const webhookData = {
                transaction_id: 'sepay-txn-123',
                amount: 50000,
                description: 'test-payment-123',
                status: 'completed'
            };

            const result = await strategy.handlePaymentCompletion(webhookData);

            expect(SepayService.handleWebhook).toHaveBeenCalledWith(webhookData);
            expect(publishTicketPaymentReadyNonPaypal).toHaveBeenCalledWith(null, 'test-payment-123', 'sepay');
            expect(result).toEqual({ ok: true });
        });

        it('should handle failed payment completion', async () => {
            const mockWebhookResult = { ok: false, error: 'Payment failed' };
            SepayService.handleWebhook.mockResolvedValue(mockWebhookResult);

            const webhookData = {
                transaction_id: 'sepay-txn-456',
                amount: 30000,
                description: 'test-payment-456',
                status: 'failed'
            };

            const result = await strategy.handlePaymentCompletion(webhookData);

            expect(SepayService.handleWebhook).toHaveBeenCalledWith(webhookData);
            expect(publishTicketPaymentReadyNonPaypal).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: false, error: 'Payment failed' });
        });

        it('should handle webhook without description', async () => {
            const mockWebhookResult = { ok: true };
            SepayService.handleWebhook.mockResolvedValue(mockWebhookResult);

            const webhookData = {
                transaction_id: 'sepay-txn-789',
                amount: 40000,
                status: 'completed'
                // No description field
            };

            const result = await strategy.handlePaymentCompletion(webhookData);

            expect(SepayService.handleWebhook).toHaveBeenCalledWith(webhookData);
            expect(publishTicketPaymentReadyNonPaypal).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle webhook service errors', async () => {
            SepayService.handleWebhook.mockRejectedValue(new Error('Webhook processing failed'));

            const webhookData = {
                transaction_id: 'sepay-txn-error',
                amount: 60000,
                description: 'test-payment-error',
                status: 'completed'
            };

            await expect(strategy.handlePaymentCompletion(webhookData)).rejects.toThrow('Webhook processing failed');
        });
    });
});
