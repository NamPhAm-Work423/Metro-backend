// Mock the VNPay library before requiring the service
jest.mock('vnpay', () => {
    return {
        VNPay: jest.fn().mockImplementation(() => ({
            buildPaymentUrl: jest.fn((params) => {
                if (!params.vnp_Amount || !params.vnp_TxnRef) {
                    throw new Error('Invalid amount');
                }
                return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${params.vnp_Amount}&vnp_TxnRef=${params.vnp_TxnRef}`;
            }),
            verifyReturnUrl: jest.fn((query) => {
                if (!query.vnp_SecureHash) {
                    return { isSuccess: false, message: 'Invalid signature' };
                }
                if (query.vnp_ResponseCode === '00') {
                    return { isSuccess: true, message: 'success' };
                }
                return { isSuccess: false, message: 'failed' };
            }),
            verifyIpnCall: jest.fn((query) => {
                if (!query.vnp_SecureHash) {
                    return { isSuccess: false, message: 'Invalid signature' };
                }
                if (query.vnp_ResponseCode === '00') {
                    return { isSuccess: true, message: 'success' };
                }
                return { isSuccess: false, message: 'failed' };
            })
        }))
    };
});

const vnpayService = require('../../src/services/vnpay.service');

describe('vnpay.service', () => {
    describe('buildPaymentUrl', () => {
        it('should build payment URL with valid parameters', () => {
            const params = {
                vnp_Amount: 100000,
                vnp_IpAddr: '127.0.0.1',
                vnp_ReturnUrl: 'https://example.com/return',
                vnp_TxnRef: 'TEST123',
                vnp_OrderInfo: 'Test order',
                vnp_OrderType: 'other',
                vnp_CreateDate: '20250106151800'
            };

            const result = vnpayService.buildPaymentUrl(params);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result).toContain('https://');
        });

        it('should handle missing optional parameters', () => {
            const params = {
                vnp_Amount: 50000,
                vnp_IpAddr: '192.168.1.1',
                vnp_ReturnUrl: 'https://test.com/callback',
                vnp_TxnRef: 'MINIMAL123'
            };

            const result = vnpayService.buildPaymentUrl(params);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('verifyReturnUrl', () => {
        it('should verify successful payment return', () => {
            const query = {
                vnp_TxnRef: 'TEST123',
                vnp_Amount: '100000',
                vnp_BankCode: 'NCB',
                vnp_ResponseCode: '00',
                vnp_SecureHash: 'valid_hash'
            };

            const result = vnpayService.verifyReturnUrl(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('isSuccess');
            expect(result).toHaveProperty('message');
        });

        it('should handle failed payment return', () => {
            const query = {
                vnp_TxnRef: 'TEST123',
                vnp_Amount: '100000',
                vnp_ResponseCode: '07',
                vnp_SecureHash: 'valid_hash'
            };

            const result = vnpayService.verifyReturnUrl(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('isSuccess');
            expect(result).toHaveProperty('message');
        });

        it('should handle empty query parameters', () => {
            const query = {};

            const result = vnpayService.verifyReturnUrl(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });

    describe('verifyIpnCallback', () => {
        it('should verify successful IPN callback', () => {
            const query = {
                vnp_TxnRef: 'TEST123',
                vnp_Amount: '100000',
                vnp_ResponseCode: '00',
                vnp_SecureHash: 'valid_hash'
            };

            const result = vnpayService.verifyIpnCallback(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('isSuccess');
            expect(result).toHaveProperty('message');
        });

        it('should handle failed IPN callback', () => {
            const query = {
                vnp_TxnRef: 'TEST123',
                vnp_Amount: '100000',
                vnp_ResponseCode: '24',
                vnp_SecureHash: 'valid_hash'
            };

            const result = vnpayService.verifyIpnCallback(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
            expect(result).toHaveProperty('isSuccess');
            expect(result).toHaveProperty('message');
        });

        it('should handle malformed IPN callback', () => {
            const query = {
                invalid_field: 'test'
            };

            const result = vnpayService.verifyIpnCallback(query);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });
    });
});
