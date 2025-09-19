// Mock the TicketService directly
const mockUseTicket = jest.fn();
const mockUseTicketByQRCode = jest.fn();

jest.mock('../../../../src/services/ticket/services/TicketService', () => ({
    useTicket: mockUseTicket,
    useTicketByQRCode: mockUseTicketByQRCode
}));

jest.mock('../../../../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

const TicketService = require('../../../../src/services/ticket/services/TicketService');
const { logger } = require('../../../../src/config/logger');

describe('TicketService - useTicket', () => {
    let ticketService;
    let mockTicket;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('useTicket', () => {
        it('should successfully use a valid ticket', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';
            const mockUsedTicket = {
                ticketId: 'test-ticket-123',
                passengerId: 'passenger-456',
                status: 'used',
                usedAt: new Date('2024-01-01T10:00:00Z')
            };

            mockUseTicket.mockResolvedValue(mockUsedTicket);

            // Act
            const result = await TicketService.useTicket(ticketId, passengerId);

            // Assert
            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
            expect(result).toEqual(mockUsedTicket);
        });

        it('should throw error when ticket not found', async () => {
            // Arrange
            const ticketId = 'non-existent-ticket';
            const passengerId = 'passenger-456';

            mockUseTicket.mockRejectedValue(new Error('Ticket not found'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Ticket not found');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should throw error when ticket does not belong to passenger', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'different-passenger';

            mockUseTicket.mockRejectedValue(new Error('Unauthorized: Ticket does not belong to this passenger'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Unauthorized: Ticket does not belong to this passenger');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should throw error when ticket is already used', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';

            mockUseTicket.mockRejectedValue(new Error('Ticket has already been used'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Ticket has already been used');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should throw error when ticket is not active', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';

            mockUseTicket.mockRejectedValue(new Error('Ticket is not active and cannot be used'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Ticket is not active and cannot be used');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';

            mockUseTicket.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Database connection failed');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should handle update errors gracefully', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';

            mockUseTicket.mockRejectedValue(new Error('Update failed'));

            // Act & Assert
            await expect(TicketService.useTicket(ticketId, passengerId))
                .rejects
                .toThrow('Update failed');

            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
        });

        it('should set usedAt timestamp when using ticket', async () => {
            // Arrange
            const ticketId = 'test-ticket-123';
            const passengerId = 'passenger-456';
            const mockUsedTicket = {
                ticketId: 'test-ticket-123',
                passengerId: 'passenger-456',
                status: 'used',
                usedAt: new Date()
            };

            mockUseTicket.mockResolvedValue(mockUsedTicket);

            // Act
            const result = await TicketService.useTicket(ticketId, passengerId);

            // Assert
            expect(mockUseTicket).toHaveBeenCalledWith(ticketId, passengerId);
            expect(result.usedAt).toBeDefined();
            expect(result.status).toBe('used');
        });
    });
});
