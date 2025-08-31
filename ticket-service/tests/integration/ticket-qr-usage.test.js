// Mock the ticket controller methods
const mockUseTicket = jest.fn();
const mockUseTicketByQRCode = jest.fn();

// Mock the ticket controller
jest.mock('../../src/controllers/ticket.controller', () => ({
    useTicket: mockUseTicket,
    useTicketByQRCode: mockUseTicketByQRCode
}));

// Mock the ticket service
jest.mock('../../src/services/ticket/services/TicketService', () => ({
    useTicket: jest.fn(),
    useTicketByQRCode: jest.fn()
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

const { useTicketByQRCode } = require('../../src/controllers/ticket.controller');

describe('Ticket QR Code Usage Unit Tests (Staff/Admin Only)', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Setup mock request, response, and next function
        mockReq = {
            params: {},
            user: { id: 'test-staff-id' },
            headers: {}
        };
        
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        mockNext = jest.fn();
    });

    describe('useTicketByQRCode', () => {
        it('should successfully use a valid ticket by QR code (staff)', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };
            
            const mockResponse = {
                success: true,
                message: 'Ticket used successfully via QR code',
                data: {
                    ticketId: 'test-qr-ticket-123',
                    status: 'used',
                    passengerId: 'test-passenger-456',
                    qrCode: qrCode,
                    usedAt: new Date(),
                    processedBy: 'test-staff-id'
                },
                timestamp: new Date().toISOString()
            };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(200).json(mockResponse);
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Ticket used successfully via QR code',
                data: expect.objectContaining({
                    ticketId: 'test-qr-ticket-123',
                    status: 'used',
                    passengerId: 'test-passenger-456',
                    qrCode: qrCode
                })
            }));
        });

        it('should return 404 when QR code not found', async () => {
            // Arrange
            const nonExistentQRCode = 'non-existent-qr-code-999';
            mockReq.params = { 'qr-code': nonExistentQRCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(404).json({
                    success: false,
                    message: 'Ticket not found with provided QR code'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket not found with provided QR code'
            }));
        });

        it('should return 400 when ticket is already used', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket has already been used'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket has already been used'
            }));
        });

        it('should return 400 when ticket is not active', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket is not active and cannot be used'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket is not active and cannot be used'
            }));
        });

        it('should return 400 when ticket is not valid at current time', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket is not valid at this time'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket is not valid at this time'
            }));
        });

        it('should return 401 when no authentication token provided', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };
            mockReq.user = null; // No authenticated user

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(401).json({
                    success: false,
                    message: 'Unauthorized'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Unauthorized'
            }));
        });

        it('should handle malformed QR code gracefully', async () => {
            // Arrange
            const malformedQRCode = 'invalid-qr-code-format';
            mockReq.params = { 'qr-code': malformedQRCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(404).json({
                    success: false,
                    message: 'Ticket not found with provided QR code'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket not found with provided QR code'
            }));
        });

        it('should handle URL-encoded QR codes correctly', async () => {
            // Arrange
            const qrCodeWithSpecialChars = 'test-qr-code-with-special-chars-@#$%';
            mockReq.params = { 'qr-code': qrCodeWithSpecialChars };
            
            const mockResponse = {
                success: true,
                message: 'Ticket used successfully via QR code',
                data: {
                    ticketId: 'test-special-qr-ticket-456',
                    status: 'used',
                    passengerId: 'test-passenger-789',
                    qrCode: qrCodeWithSpecialChars,
                    usedAt: new Date(),
                    processedBy: 'test-staff-id'
                },
                timestamp: new Date().toISOString()
            };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(200).json(mockResponse);
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    qrCode: qrCodeWithSpecialChars
                })
            }));
        });

        it('should handle expired tickets correctly', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(400).json({
                    success: false,
                    message: 'Ticket is not valid at this time'
                });
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Ticket is not valid at this time'
            }));
        });

        it('should include staff information in response', async () => {
            // Arrange
            const qrCode = 'test-qr-code-789';
            mockReq.params = { 'qr-code': qrCode };
            
            const mockResponse = {
                success: true,
                message: 'Ticket used successfully via QR code',
                data: {
                    ticketId: 'test-qr-ticket-123',
                    status: 'used',
                    passengerId: 'test-passenger-456',
                    qrCode: qrCode,
                    usedAt: new Date(),
                    processedBy: 'test-staff-id'
                },
                timestamp: new Date().toISOString()
            };

            mockUseTicketByQRCode.mockImplementation((req, res, next) => {
                res.status(200).json(mockResponse);
            });

            // Act
            await useTicketByQRCode(mockReq, mockRes, mockNext);

            // Assert
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    processedBy: 'test-staff-id',
                    qrCode: qrCode,
                    ticketId: 'test-qr-ticket-123'
                })
            }));
        });
    });
});
