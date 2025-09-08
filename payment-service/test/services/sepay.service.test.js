// Mock models before requiring the service
jest.mock('../../src/models/index.model', () => ({
    Payment: {
        create: jest.fn(),
        findByPk: jest.fn(),
        update: jest.fn(),
        sequelize: {
            transaction: jest.fn().mockResolvedValue({
                commit: jest.fn(),
                rollback: jest.fn()
            })
        }
    },
    Transaction: {
        create: jest.fn()
    },
    PaymentLog: {
        create: jest.fn()
    }
}));

const SepayService = require('../../src/services/sepay.service');
const { Payment, Transaction, PaymentLog } = require('../../src/models/index.model');

describe('sepay.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Set up environment variables
        process.env.SEPAY_BANK = '970436';
        process.env.SEPAY_ACCOUNT_NO = '1234567890';
    });

    afterEach(() => {
        delete process.env.SEPAY_BANK;
        delete process.env.SEPAY_ACCOUNT_NO;
    });

    describe('createQr', () => {
        it('should create QR payment with valid parameters', async () => {
            const mockPayment = { paymentId: 'test-payment-123' };
            Payment.create.mockResolvedValue(mockPayment);
            PaymentLog.create.mockResolvedValue({});

            const params = {
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                amountVnd: 50000,
                orderDescription: 'Test payment'
            };

            const result = await SepayService.createQr(params);

            expect(Payment.create).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                ticketId: 'ticket-456',
                passengerId: 'passenger-789',
                paymentAmount: 50000,
                paymentMethod: 'sepay',
                paymentStatus: 'PENDING',
                paymentDate: expect.any(Date),
                currency: 'VND',
                description: 'Test payment',
                paymentGatewayResponse: null
            }, expect.objectContaining({ transaction: expect.any(Object) }));

            expect(PaymentLog.create).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                paymentLogType: 'PAYMENT',
                paymentLogStatus: 'PENDING',
                paymentLogDate: expect.any(Date)
            }, expect.objectContaining({ transaction: expect.any(Object) }));

            expect(result).toEqual({
                paymentId: 'test-payment-123',
                provider: 'sepay',
                amount: 50000,
                currency: 'VND',
                qrImage: expect.stringContaining('https://qr.sepay.vn/img?')
            });

            expect(result.qrImage).toContain('bank=970436');
            expect(result.qrImage).toContain('acc=1234567890');
            expect(result.qrImage).toContain('amount=50000');
            expect(result.qrImage).toContain('des=Test+payment');
        });

        it('should create QR payment with minimal parameters', async () => {
            const mockPayment = { paymentId: 'test-payment-456' };
            Payment.create.mockResolvedValue(mockPayment);
            PaymentLog.create.mockResolvedValue({});

            const params = {
                paymentId: 'test-payment-456',
                ticketId: 'ticket-789',
                passengerId: 'passenger-123',
                amountVnd: 25000
                // No orderDescription provided
            };

            const result = await SepayService.createQr(params);

            expect(result.qrImage).toContain('des=test-payment-456'); // Should use paymentId as description
        });

        it('should handle database errors during payment creation', async () => {
            const dbError = new Error('Database connection failed');
            Payment.create.mockRejectedValue(dbError);

            const params = {
                paymentId: 'test-payment-error',
                ticketId: 'ticket-error',
                passengerId: 'passenger-error',
                amountVnd: 10000
            };

            await expect(SepayService.createQr(params)).rejects.toThrow('Database connection failed');
        });
    });

    describe('handleWebhook', () => {
        it('should handle successful payment webhook', async () => {
            const mockPayment = {
                paymentId: 'test-payment-123',
                paymentStatus: 'PENDING',
                paymentAmount: 50000
            };
            Payment.findByPk.mockResolvedValue(mockPayment);
            Payment.update.mockResolvedValue([1]);
            Transaction.create.mockResolvedValue({});
            PaymentLog.create.mockResolvedValue({});

            const payload = {
                transaction_id: 'sepay-txn-123',
                amount: 50000,
                description: 'test-payment-123',
                status: 'completed'
            };

            const result = await SepayService.handleWebhook(payload);

            expect(Payment.findByPk).toHaveBeenCalledWith('test-payment-123');
            expect(Payment.update).toHaveBeenCalledWith(
                {
                    paymentStatus: 'COMPLETED',
                    paymentDate: expect.any(Date),
                    paymentGatewayResponse: payload
                },
                expect.objectContaining({ where: { paymentId: 'test-payment-123' } })
            );
            expect(Transaction.create).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                transactionAmount: 50000,
                transactionStatus: 'COMPLETED'
            }, expect.objectContaining({ transaction: expect.any(Object) }));
            expect(PaymentLog.create).toHaveBeenCalledWith({
                paymentId: 'test-payment-123',
                paymentLogType: 'WEBHOOK',
                paymentLogStatus: 'COMPLETED',
                paymentLogDate: expect.any(Date)
            }, expect.objectContaining({ transaction: expect.any(Object) }));

            expect(result).toEqual({ ok: true });
        });

        it('should handle non-completed payment status', async () => {
            const payload = {
                transaction_id: 'sepay-txn-456',
                amount: 30000,
                description: 'test-payment-456',
                status: 'pending'
            };

            const result = await SepayService.handleWebhook(payload);

            expect(Payment.findByPk).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle missing description in payload', async () => {
            const payload = {
                transaction_id: 'sepay-txn-789',
                amount: 40000,
                status: 'completed'
                // No description field
            };

            const result = await SepayService.handleWebhook(payload);

            expect(Payment.findByPk).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle payment not found', async () => {
            Payment.findByPk.mockResolvedValue(null);

            const payload = {
                transaction_id: 'sepay-txn-999',
                amount: 60000,
                description: 'non-existent-payment',
                status: 'completed'
            };

            const result = await SepayService.handleWebhook(payload);

            expect(Payment.findByPk).toHaveBeenCalledWith('non-existent-payment');
            expect(Payment.update).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle already completed payment (idempotent)', async () => {
            const mockPayment = {
                paymentId: 'test-payment-completed',
                paymentStatus: 'COMPLETED'
            };
            Payment.findByPk.mockResolvedValue(mockPayment);

            const payload = {
                transaction_id: 'sepay-txn-completed',
                amount: 70000,
                description: 'test-payment-completed',
                status: 'completed'
            };

            const result = await SepayService.handleWebhook(payload);

            expect(Payment.findByPk).toHaveBeenCalledWith('test-payment-completed');
            expect(Payment.update).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle empty payload', async () => {
            const result = await SepayService.handleWebhook({});

            expect(Payment.findByPk).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle null payload', async () => {
            const result = await SepayService.handleWebhook(null);

            expect(Payment.findByPk).not.toHaveBeenCalled();
            expect(result).toEqual({ ok: true });
        });

        it('should handle database errors during webhook processing', async () => {
            const mockPayment = {
                paymentId: 'test-payment-error',
                paymentStatus: 'PENDING',
                paymentAmount: 80000
            };
            Payment.findByPk.mockResolvedValue(mockPayment);
            Payment.update.mockRejectedValue(new Error('Database update failed'));

            const payload = {
                transaction_id: 'sepay-txn-error',
                amount: 80000,
                description: 'test-payment-error',
                status: 'completed'
            };

            await expect(SepayService.handleWebhook(payload)).rejects.toThrow('Database update failed');
        });
    });
});
