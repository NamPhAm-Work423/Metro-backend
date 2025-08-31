// Mock the TicketService directly
const mockUseTicket = jest.fn();
const mockUseTicketByQRCode = jest.fn();

jest.mock('../../../src/services/ticket/services/TicketService', () => ({
    useTicket: mockUseTicket,
    useTicketByQRCode: mockUseTicketByQRCode
}));

jest.mock('../../../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

const TicketService = require('../../../src/services/ticket/services/TicketService');
const { logger } = require('../../../src/config/logger');

describe('TicketService - useTicketByQRCode', () => {
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('useTicketByQRCode', () => {
        it('should successfully use a valid ticket by QR code', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';
            const mockUsedTicket = {
                ticketId: 'test-ticket-123',
                passengerId: 'passenger-456',
                status: 'used',
                usedAt: new Date('2024-01-01T10:00:00Z')
            };

            mockUseTicketByQRCode.mockResolvedValue(mockUsedTicket);

            // Act
            const result = await TicketService.useTicketByQRCode(qrCode, staffId);

            // Assert
            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
            expect(result).toEqual(mockUsedTicket);
        });

        it('should throw error when ticket not found with QR code', async () => {
            // Arrange
            const qrCode = 'non-existent-qr-code';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Ticket not found with provided QR code'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Ticket not found with provided QR code');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should throw error when ticket is already used', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Ticket has already been used'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Ticket has already been used');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should throw error when ticket is not active', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Ticket is not active and cannot be used'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Ticket is not active and cannot be used');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should throw error when ticket is not valid yet', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Ticket is not valid at this time'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Ticket is not valid at this time');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should throw error when ticket has expired', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Ticket is not valid at this time'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Ticket is not valid at this time');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should handle database errors gracefully', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Database connection failed'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Database connection failed');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should handle update errors gracefully', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';

            mockUseTicketByQRCode.mockRejectedValue(new Error('Update failed'));

            // Act & Assert
            await expect(TicketService.useTicketByQRCode(qrCode, staffId))
                .rejects
                .toThrow('Update failed');

            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
        });

        it('should set usedAt timestamp when using ticket by QR code', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';
            const mockUsedTicket = {
                ticketId: 'test-ticket-123',
                passengerId: 'passenger-456',
                status: 'used',
                usedAt: new Date()
            };

            mockUseTicketByQRCode.mockResolvedValue(mockUsedTicket);

            // Act
            const result = await TicketService.useTicketByQRCode(qrCode, staffId);

            // Assert
            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
            expect(result.usedAt).toBeDefined();
            expect(result.status).toBe('used');
        });

        it('should handle edge case when ticket is valid exactly at current time', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            const staffId = 'staff-123';
            const mockUsedTicket = {
                ticketId: 'test-ticket-123',
                passengerId: 'passenger-456',
                status: 'used',
                usedAt: new Date()
            };

            mockUseTicketByQRCode.mockResolvedValue(mockUsedTicket);

            // Act
            const result = await TicketService.useTicketByQRCode(qrCode, staffId);

            // Assert
            expect(mockUseTicketByQRCode).toHaveBeenCalledWith(qrCode, staffId);
            expect(result.status).toBe('used');
        });
    });
});
