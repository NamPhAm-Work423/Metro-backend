const { logger } = require('../../../config/logger');
const { publishTicketActivated } = require('../../../events/ticket.producer');

/**
 * Handler for payment completion logic following SOLID principles
 * Single Responsibility: Handles only payment completion status determination
 */
class PaymentCompletionHandler {
    
    /**
     * Determine the appropriate ticket status after payment completion
     * @param {Object} ticket - The ticket object
     * @param {Object} paymentData - Payment data from event
     * @returns {Object} Status update data
     */
    static determineTicketStatusAfterPayment(ticket, paymentData = {}) {
        if (!ticket) {
            throw new Error('Ticket object is required');
        }

        // Short-term tickets (fareId exists) -> activate immediately
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

        // Long-term tickets (fareId is null) -> remain inactive
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
        if (!ticket) {
            logger.warn('Null ticket provided for payment completion validation', {
                paymentId
            });
            return false;
        }
        
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
            previousStatus: ticket.status,
            newStatus: updateData.status,
            isActive: updateData.status === 'active',
            isPaymentConfirmed: updateData.status === 'payment_confirmed',
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
        // Validate required parameters
        if (!paymentId) {
            return {
                success: false,
                reason: 'Payment ID is required'
            };
        }

        if (!ticket) {
            return {
                success: false,
                reason: 'Ticket object is required'
            };
        }

        // Validate ticket state
        if (!this.validateTicketForCompletion(ticket, paymentId)) {
            return {
                success: false,
                reason: 'Invalid ticket state for payment completion'
            };
        }

        // Handle duplicate events for already processed tickets
        if (['active'].includes(ticket.status)) {
            logger.info('Duplicate payment event for already processed ticket - ignoring', {
                ticketId: ticket.ticketId,
                paymentId,
                currentStatus: ticket.status
            });
            
            return {
                success: true,
                updateData: { status: ticket.status },
                ticketType: this.getTicketTypeDescription(ticket),
                duplicate: true
            };
        }

        try {
            // Determine appropriate status
            const updateData = this.determineTicketStatusAfterPayment(ticket, paymentData);
            
            // Apply update
            await ticket.update(updateData);
            
            // Log completion
            this.logPaymentCompletion(ticket, paymentId, updateData, paymentData);
            
            // Publish ticket activated event only if ticket becomes active
            if (updateData.status === 'active') {
                try {
                    await publishTicketActivated(ticket, paymentData);
                    logger.info('Ticket activated event published successfully (webhook confirmed)', {
                        ticketId: ticket.ticketId,
                        paymentId,
                        webhookProcessed: paymentData.webhookProcessed
                    });
                } catch (publishError) {
                    logger.error('Failed to publish ticket activated event', {
                        ticketId: ticket.ticketId,
                        paymentId,
                        error: publishError.message
                    });
                    // Don't fail the whole process if event publishing fails
                }
            }
            
            return {
                success: true,
                updateData,
                ticketType: this.getTicketTypeDescription(ticket)
            };
        } catch (error) {
            logger.error('Database error during payment completion', {
                ticketId: ticket?.ticketId,
                paymentId,
                error: error.message
            });
            
            return {
                success: false,
                reason: `Database error: ${error.message}`
            };
        }
    }
}

module.exports = PaymentCompletionHandler;
