const { logger } = require('../../../config/logger');

/**
 * Handler for payment completion logic following SOLID principles
 * Single Responsibility: Handles only payment completion status determination
 */
class PaymentCompletionHandler {
    
    /**
     * Determine the appropriate ticket status after payment completion
     * @param {Object} ticket - The ticket object
     * @returns {Object} Status update data
     */
    static determineTicketStatusAfterPayment(ticket) {
        if (!ticket) {
            throw new Error('Ticket object is required');
        }

        // Short-term tickets (fareId exists) become active immediately
        if (ticket.fareId) {
            logger.debug('Setting short-term ticket to active status', {
                ticketId: ticket.ticketId,
                fareId: ticket.fareId
            });
            
            return {
                status: 'active',
                activatedAt: new Date(),
                updatedAt: new Date()
            };
        }
        
        // Long-term tickets (fareId is null) become inactive, ready for activation
        logger.debug('Setting long-term ticket to inactive status', {
            ticketId: ticket.ticketId,
            fareId: ticket.fareId
        });
        
        return {
            status: 'inactive',
            activatedAt: null,
            updatedAt: new Date()
        };
    }

    /**
     * Validate ticket state before processing payment completion
     * @param {Object} ticket - The ticket object
     * @param {string} paymentId - Payment ID for logging
     * @returns {boolean} True if ticket is valid for processing
     */
    static validateTicketForCompletion(ticket, paymentId) {
        const validStatuses = ['pending_payment'];
        
        if (!validStatuses.includes(ticket.status)) {
            logger.warn('Ticket not in valid state for payment completion', {
                ticketId: ticket.ticketId,
                paymentId,
                currentStatus: ticket.status,
                validStatuses
            });
            return false;
        }
        
        return true;
    }

    /**
     * Get ticket type description for logging
     * @param {Object} ticket - The ticket object
     * @returns {string} Ticket type description
     */
    static getTicketTypeDescription(ticket) {
        return ticket.fareId ? 'short-term' : 'long-term';
    }

    /**
     * Log payment completion details
     * @param {Object} ticket - The ticket object
     * @param {string} paymentId - Payment ID
     * @param {Object} updateData - Update data applied to ticket
     * @param {Object} paymentData - Payment data from event
     */
    static logPaymentCompletion(ticket, paymentId, updateData, paymentData) {
        const ticketType = this.getTicketTypeDescription(ticket);
        
        logger.info('Ticket status updated after payment completion', {
            ticketId: ticket.ticketId,
            paymentId,
            ticketType,
            previousStatus: 'pending_payment',
            newStatus: updateData.status,
            isActive: updateData.status === 'active',
            paymentMethod: paymentData.paymentMethod,
            webhookProcessed: paymentData.webhookProcessed || false,
            activatedAt: updateData.activatedAt
        });
    }

    /**
     * Process payment completion with proper status handling
     * @param {Object} ticket - The ticket object
     * @param {string} paymentId - Payment ID
     * @param {Object} paymentData - Payment data from event
     * @returns {Object} Update result
     */
    static async processPaymentCompletion(ticket, paymentId, paymentData) {
        // Validate ticket state
        if (!this.validateTicketForCompletion(ticket, paymentId)) {
            return {
                success: false,
                reason: 'Invalid ticket state'
            };
        }

        // Determine appropriate status
        const updateData = this.determineTicketStatusAfterPayment(ticket);
        
        // Apply update
        await ticket.update(updateData);
        
        // Log completion
        this.logPaymentCompletion(ticket, paymentId, updateData, paymentData);
        
        return {
            success: true,
            updateData,
            ticketType: this.getTicketTypeDescription(ticket)
        };
    }
}

module.exports = PaymentCompletionHandler;
