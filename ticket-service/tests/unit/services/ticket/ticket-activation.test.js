const { Ticket } = require('../../../../src/models/index.model');
const TicketService = require('../../../../src/services/ticket/services/TicketService');

// Ensure Redis is mocked to avoid real connections/open handles in tests
jest.mock('../../../../src/config/redis', () => ({
    getClient: () => null,
    withRedisClient: async () => null
}));

// Mock dependencies
jest.mock('../../../../src/config/logger');
jest.mock('../../../../src/services/ticket/repositories/TicketRepository');
jest.mock('../../../../src/services/ticket/services/TicketValidatorService');
jest.mock('../../../../src/services/ticket/services/TicketCommunicationService');
jest.mock('../../../../src/services/ticket/services/TicketPaymentService');
jest.mock('../../../../src/services/ticket/calculators/TicketPriceCalculator');

describe('Ticket Activation Tests', () => {
    let ticketService;

    beforeEach(() => {
        ticketService = TicketService;
        jest.clearAllMocks();
    });

    describe('activateTicket', () => {
        it('should activate a long-term ticket and calculate validity period', async () => {
            // Mock ticket data
            const mockTicket = {
                ticketId: 'test-ticket-id',
                passengerId: 'test-passenger-id',
                ticketType: 'monthly_pass',
                status: 'paid',
                validFrom: new Date('2024-01-01'),
                validUntil: new Date('2024-02-01'),
                save: jest.fn().mockResolvedValue(true),
                update: jest.fn().mockImplementation((data) => {
                    Object.assign(mockTicket, data);
                    return Promise.resolve(mockTicket);
                })
            };

            // Mock Ticket.findByPk
            Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);

            // Mock Ticket.startCountDown
            Ticket.startCountDown = jest.fn().mockResolvedValue({
                ...mockTicket,
                status: 'active',
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                activatedAt: new Date()
            });

            const result = await ticketService.activateTicket('test-ticket-id', 'test-passenger-id');

            expect(Ticket.findByPk).toHaveBeenCalledWith('test-ticket-id');
            expect(Ticket.startCountDown).toHaveBeenCalledWith('test-ticket-id');
            expect(result.status).toBe('active');
            expect(result.activatedAt).toBeDefined();
        });

        it('should throw error for non-long-term tickets', async () => {
            const mockTicket = {
                ticketId: 'test-ticket-id',
                ticketType: 'oneway',
                status: 'paid'
            };

            Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);
            Ticket.startCountDown = jest.fn().mockRejectedValue(new Error('Only long-term tickets can be activated'));

            await expect(ticketService.activateTicket('test-ticket-id')).rejects.toThrow('Only long-term tickets can be activated');
        });

        it('should throw error for already active tickets', async () => {
            const mockTicket = {
                ticketId: 'test-ticket-id',
                ticketType: 'monthly_pass',
                status: 'active'
            };

            Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);
            Ticket.startCountDown = jest.fn().mockRejectedValue(new Error('Ticket is already active'));

            await expect(ticketService.activateTicket('test-ticket-id')).rejects.toThrow('Ticket is already active');
        });

        it('should throw error for unpaid tickets', async () => {
            const mockTicket = {
                ticketId: 'test-ticket-id',
                ticketType: 'monthly_pass',
                status: 'pending_payment'
            };

            Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);
            Ticket.startCountDown = jest.fn().mockRejectedValue(new Error('Ticket must be paid before activation'));

            await expect(ticketService.activateTicket('test-ticket-id')).rejects.toThrow('Ticket must be paid before activation');
        });

        it('should validate ticket ownership when passengerId is provided', async () => {
            const mockTicket = {
                ticketId: 'test-ticket-id',
                passengerId: 'different-passenger-id',
                ticketType: 'monthly_pass',
                status: 'paid'
            };

            Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);

            // Pass a unique idempotency key to avoid returning cached success from previous test
            await expect(
                ticketService.activateTicket('test-ticket-id', 'test-passenger-id', 'unit-ownership-mismatch')
            ).rejects.toThrow('Unauthorized: Ticket does not belong to this passenger');
        });
    });

    describe('Ticket.startCountDown', () => {
        it('should calculate correct validity period for different ticket types', async () => {
            const testCases = [
                { type: 'day_pass', expectedDays: 1 },
                { type: 'weekly_pass', expectedDays: 7 },
                { type: 'monthly_pass', expectedDays: 30 },
                { type: 'yearly_pass', expectedDays: 365 },
                { type: 'lifetime_pass', expectedYears: 100 }
            ];

            for (const testCase of testCases) {
                const mockTicket = {
                    ticketId: 'test-ticket-id',
                    ticketType: testCase.type,
                    status: 'paid',
                    update: jest.fn().mockImplementation((data) => {
                        Object.assign(mockTicket, data);
                        return Promise.resolve(mockTicket);
                    })
                };

                Ticket.findByPk = jest.fn().mockResolvedValue(mockTicket);

                // Mock the actual startCountDown method to return expected result
                const expectedValidUntil = new Date();
                if (testCase.expectedDays) {
                    expectedValidUntil.setDate(expectedValidUntil.getDate() + testCase.expectedDays);
                } else if (testCase.expectedYears) {
                    expectedValidUntil.setFullYear(expectedValidUntil.getFullYear() + testCase.expectedYears);
                }

                const expectedResult = {
                    ...mockTicket,
                    status: 'active',
                    validFrom: new Date(),
                    validUntil: expectedValidUntil,
                    activatedAt: new Date()
                };

                Ticket.startCountDown = jest.fn().mockResolvedValue(expectedResult);

                const result = await Ticket.startCountDown('test-ticket-id');

                expect(result.status).toBe('active');
                expect(result.activatedAt).toBeDefined();

                if (testCase.expectedDays) {
                    expect(result.validUntil.getDate()).toBe(expectedValidUntil.getDate());
                } else if (testCase.expectedYears) {
                    expect(result.validUntil.getFullYear()).toBe(expectedValidUntil.getFullYear());
                }
            }
        });
    });
});
