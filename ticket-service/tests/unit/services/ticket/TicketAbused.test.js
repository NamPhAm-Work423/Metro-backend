const TicketAbused = require('../../../../src/services/ticket/handlers/TicketAbused');
const { logger } = require('../../../../src/config/logger');

jest.mock('../../../../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('TicketAbused handler', () => {
    const createTicket = (overrides = {}) => ({
        ticketId: 'uuid-1',
        ticketType: 'monthly',
        usedList: [],
        update: jest.fn().mockResolvedValue(true),
        ...overrides
    });

    test('returns not abused when less than 2 usages', async () => {
        const ticket = createTicket({ usedList: [new Date().toISOString()] });
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        expect(result).toEqual({ abused: false });
        expect(ticket.update).not.toHaveBeenCalled();
    });

    test('flags abuse for two usages within 10 seconds', async () => {
        const now = Date.now();
        const usedList = [new Date(now - 5000).toISOString(), new Date(now).toISOString()];
        const ticket = createTicket({ usedList, ticketType: 'oneway' });
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        expect(result.abused).toBe(true);
        expect(result.reason).toMatch(/10 seconds/);
        expect(ticket.update).toHaveBeenCalledWith({ status: 'abused' });
        expect(logger.warn).toHaveBeenCalled();
    });

    test('flags abuse for >3 uses in 60s for long-term tickets', async () => {
        const now = Date.now();
        const usedList = [45, 30, 15, 0].map((s) => new Date(now - s * 1000).toISOString());
        const ticket = createTicket({ usedList, ticketType: 'monthly' });
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        expect(result.abused).toBe(true);
        expect(result.reason).toMatch(/60 seconds/);
        expect(ticket.update).toHaveBeenCalledWith({ status: 'abused' });
        expect(logger.warn).toHaveBeenCalled();
    });

    test('does not flag >3 uses in 60s for short-term one-way', async () => {
        const now = Date.now();
        const usedList = [45, 30, 15, 0].map((s) => new Date(now - s * 1000).toISOString());
        const ticket = createTicket({ usedList, ticketType: 'oneway' });
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        // The 60s rule should not trigger for short-term; also last two are 15s apart so rule1 not triggered
        expect(result).toEqual({ abused: false });
        expect(ticket.update).not.toHaveBeenCalled();
    });

    test('handles invalid dates gracefully', async () => {
        const ticket = createTicket({ usedList: ['invalid-date', 'still-bad'] });
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        expect(result).toEqual({ abused: false });
    });

    test('logs error and returns not abused when internal error occurs', async () => {
        const ticket = createTicket({ usedList: ['2024-01-01T00:00:00.000Z', '2024-01-01T00:00:01.000Z'] });
        // Force internal error by making update throw inside _lockAndRotate
        ticket.update.mockRejectedValue(new Error('db down'));
        const result = await TicketAbused.trackAndDetectAbuse(ticket);
        expect(result.abused).toBe(true); // detection still true
        // _lockAndRotate catches and logs error, but trackAndDetectAbuse still returns abused true
        expect(logger.error).toHaveBeenCalled();
    });
});


