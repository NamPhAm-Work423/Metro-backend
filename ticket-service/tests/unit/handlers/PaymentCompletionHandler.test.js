const PaymentCompletionHandler = require('../../../src/services/ticket/handlers/PaymentCompletionHandler');
const { logger } = require('../../../src/config/logger');

// Mock logger to avoid log output during tests
jest.mock('../../../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
    }
}));

describe('PaymentCompletionHandler', () => {
    
    describe('determineTicketStatusAfterPayment', () => {
        it('should set short-term ticket (with fareId) to active status', () => {
            const ticket = {
                ticketId: 'test-ticket-1',
                fareId: 'some-fare-id'
            };

            const result = PaymentCompletionHandler.determineTicketStatusAfterPayment(ticket);

            expect(result.status).toBe('active');
            expect(result.activatedAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
        });

        it('should set long-term ticket (without fareId) to inactive status', () => {
            const ticket = {
                ticketId: 'test-ticket-2',
                fareId: null
            };

            const result = PaymentCompletionHandler.determineTicketStatusAfterPayment(ticket);

            expect(result.status).toBe('inactive');
            expect(result.activatedAt).toBeNull();
            expect(result.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error for null ticket', () => {
            expect(() => {
                PaymentCompletionHandler.determineTicketStatusAfterPayment(null);
            }).toThrow('Ticket object is required');
        });
    });

    describe('validateTicketForCompletion', () => {
        it('should return true for valid ticket status', () => {
            const ticket = { status: 'pending_payment' };
            const result = PaymentCompletionHandler.validateTicketForCompletion(ticket, 'test-payment');
            
            expect(result).toBe(true);
        });

        it('should return false for invalid ticket status', () => {
            const ticket = { status: 'active' };
            const result = PaymentCompletionHandler.validateTicketForCompletion(ticket, 'test-payment');
            
            expect(result).toBe(false);
        });
    });

    describe('getTicketTypeDescription', () => {
        it('should return "short-term" for ticket with fareId', () => {
            const ticket = { fareId: 'some-fare-id' };
            const result = PaymentCompletionHandler.getTicketTypeDescription(ticket);
            
            expect(result).toBe('short-term');
        });

        it('should return "long-term" for ticket without fareId', () => {
            const ticket = { fareId: null };
            const result = PaymentCompletionHandler.getTicketTypeDescription(ticket);
            
            expect(result).toBe('long-term');
        });
    });

    describe('processPaymentCompletion', () => {
        let mockTicket;

        beforeEach(() => {
            mockTicket = {
                ticketId: 'test-ticket',
                status: 'pending_payment',
                fareId: 'test-fare-id',
                update: jest.fn().mockResolvedValue()
            };
        });

        it('should successfully process short-term ticket payment completion', async () => {
            const result = await PaymentCompletionHandler.processPaymentCompletion(
                mockTicket, 
                'test-payment', 
                { paymentMethod: 'paypal' }
            );

            expect(result.success).toBe(true);
            expect(result.updateData.status).toBe('active');
            expect(result.ticketType).toBe('short-term');
            expect(mockTicket.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'active',
                activatedAt: expect.any(Date)
            }));
        });

        it('should successfully process long-term ticket payment completion', async () => {
            mockTicket.fareId = null; // Long-term ticket

            const result = await PaymentCompletionHandler.processPaymentCompletion(
                mockTicket, 
                'test-payment', 
                { paymentMethod: 'paypal' }
            );

            expect(result.success).toBe(true);
            expect(result.updateData.status).toBe('inactive');
            expect(result.ticketType).toBe('long-term');
            expect(mockTicket.update).toHaveBeenCalledWith(expect.objectContaining({
                status: 'inactive',
                activatedAt: null
            }));
        });

        it('should return failure for invalid ticket state', async () => {
            mockTicket.status = 'active'; // Invalid state

            const result = await PaymentCompletionHandler.processPaymentCompletion(
                mockTicket, 
                'test-payment', 
                {}
            );

            expect(result.success).toBe(false);
            expect(result.reason).toBe('Invalid ticket state for payment completion');
            expect(mockTicket.update).not.toHaveBeenCalled();
        });

        it('should return failure for missing ticket', async () => {
            const result = await PaymentCompletionHandler.processPaymentCompletion(
                null, 
                'test-payment', 
                {}
            );

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Ticket object is required');
        });

        it('should return failure for missing payment ID', async () => {
            const result = await PaymentCompletionHandler.processPaymentCompletion(
                mockTicket, 
                null, 
                {}
            );

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Payment ID is required');
        });

        it('should handle database errors gracefully', async () => {
            mockTicket.update.mockRejectedValue(new Error('Database connection failed'));

            const result = await PaymentCompletionHandler.processPaymentCompletion(
                mockTicket, 
                'test-payment', 
                {}
            );

            expect(result.success).toBe(false);
            expect(result.reason).toContain('Database connection failed');
        });
    });
});
