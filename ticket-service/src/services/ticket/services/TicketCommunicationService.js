const { Ticket, Fare, Promotion } = require('../../../models/index.model');
const { logger } = require('../../../config/logger');

class TicketCommunicationService {
    constructor() {
        this.validator = require('./TicketValidatorService');
    }

    /**
     * Send ticket to phone
     * @param {string} ticketId - Ticket ID
     * @param {string} phoneNumber - Phone number
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToPhone(ticketId, phoneNumber, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId);
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate ticket data for SMS
            const ticketSummary = {
                ticketId: ticket.ticketId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                totalPrice: ticket.totalPrice,
                status: ticket.status
            };
            
            // In real implementation, you would send SMS here
            logger.info('Ticket sent to phone', { 
                ticketId, 
                phoneNumber: this.maskPhoneNumber(phoneNumber), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${this.maskPhoneNumber(phoneNumber)}`,
                ticketSummary,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to phone', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Send ticket to email
     * @param {string} ticketId - Ticket ID
     * @param {string} email - Email address
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Send result
     */
    async sendTicketToEmail(ticketId, email, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            // Generate detailed ticket data for email
            const ticketDetails = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                originStation: ticket.originStationId,
                destinationStation: ticket.destinationStationId,
                ticketType: ticket.ticketType,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                basePrice: ticket.basePrice,
                discountAmount: ticket.discountAmount,
                totalPrice: ticket.totalPrice,
                status: ticket.status,
                fare: ticket.fare,
                promotion: ticket.promotion
            };
            
            // In real implementation, you would send email here
            logger.info('Ticket sent to email', { 
                ticketId, 
                email: this.maskEmail(email), 
                passengerId 
            });
            
            return {
                success: true,
                message: `Ticket sent to ${this.maskEmail(email)}`,
                ticketDetails,
                sentAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Error sending ticket to email', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Get ticket with QR code
     * @param {string} ticketId - Ticket ID
     * @param {string} passengerId - Passenger ID
     * @returns {Promise<Object>} Ticket with QR code
     */
    async getTicketWithQR(ticketId, passengerId) {
        try {
            const ticket = await Ticket.findByPk(ticketId, {
                include: [
                    {
                        model: Fare,
                        as: 'fare'
                    },
                    {
                        model: Promotion,
                        as: 'promotion',
                        required: false
                    }
                ]
            });
            
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            
            if (ticket.passengerId !== passengerId) {
                throw new Error('Unauthorized: Ticket does not belong to this passenger');
            }
            
            const qrData = {
                ticketId: ticket.ticketId,
                passengerId: ticket.passengerId,
                validFrom: ticket.validFrom,
                validUntil: ticket.validUntil,
                status: ticket.status,
                totalPrice: ticket.totalPrice,
                generatedAt: new Date().toISOString()
            };
            
            // Generate QR code (in real implementation, you would use a QR code library)
            const qrCodeData = Buffer.from(JSON.stringify(qrData)).toString('base64');
            
            logger.info('Ticket with QR code retrieved', { ticketId, passengerId });
            
            return {
                ticket,
                qrCode: {
                    data: qrCodeData,
                    format: 'base64',
                    metadata: qrData
                }
            };
        } catch (error) {
            logger.error('Error getting ticket with QR', { error: error.message, ticketId });
            throw error;
        }
    }

    /**
     * Generate QR code data for ticket
     * @param {Object} ticket - Ticket object
     * @returns {Object} QR code data
     */
    generateQRData(ticket) {
        return {
            passengerId: ticket.passengerId,
            originStationId: ticket.originStationId,
            destinationStationId: ticket.destinationStationId,
            validFrom: ticket.validFrom,
            validUntil: ticket.validUntil,
            status: 'active',
            ticketType: ticket.ticketType.toLowerCase(),
            totalPrice: ticket.totalPrice,
            totalPassengers: ticket.fareBreakdown?.totalPassengers || 1,
            passengerBreakdown: ticket.fareBreakdown?.passengerBreakdown || {},
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Mask phone number for privacy
     * @param {string} phoneNumber - Phone number to mask
     * @returns {string} Masked phone number
     */
    maskPhoneNumber(phoneNumber) {
        return phoneNumber.replace(/\d(?=\d{4})/g, '*');
    }

    /**
     * Mask email for privacy
     * @param {string} email - Email to mask
     * @returns {string} Masked email
     */
    maskEmail(email) {
        return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
    }

    /**
     * Mask contact information for privacy
     * @param {string} contact - Contact information to mask
     * @returns {string} Masked contact information
     */
    maskContactInfo(contact) {
        if (/@/.test(contact)) {
            return this.maskEmail(contact);
        }
        return this.maskPhoneNumber(contact);
    }
}

module.exports = new TicketCommunicationService();
