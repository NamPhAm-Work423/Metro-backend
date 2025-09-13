const { Ticket } = require('../../../models/index.model');
const { logger } = require('../../../config/logger');
const ITicketStatusService = require('../interfaces/ITicketStatusService');

/**
 * Ticket Status Service
 * Following Single Responsibility Principle - handles only ticket status management
 */
class TicketStatusService extends ITicketStatusService {
    constructor() {
        super();
        this.validStatuses = ['active', 'inactive', 'pending_payment', 'used', 'expired', 'cancelled'];
        this.validTransitions = {
            'pending_payment': ['active', 'cancelled'],
            'inactive': ['active', 'cancelled'],
            'active': ['used', 'expired', 'cancelled'],
            'used': ['cancelled'], // Only allow cancellation after use
            'expired': ['cancelled'], // Only allow cancellation after expiry
            'cancelled': [] // No transitions from cancelled
        };
    }

    /**
     * Get all valid ticket statuses
     * @returns {Array<string>} Array of all valid statuses
     */
    getValidStatuses() {
        return [...this.validStatuses];
    }

    /**
     * Get valid status transitions for a given status
     * @param {string} status - Current status
     * @returns {Array<string>} Array of valid next statuses
     */
    getValidTransitions(status) {
        return this.validTransitions[status] || [];
    }

    /**
     * Validate status transition
     * @param {string} currentStatus - Current ticket status
     * @param {string} newStatus - New status to transition to
     * @returns {boolean} Whether transition is valid
     */
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = this.getValidTransitions(currentStatus);
        return validTransitions.includes(newStatus);
    }

    /**
     * Update ticket status with validation
     * @param {string} ticketId - Ticket ID
     * @param {string} newStatus - New status to set
     * @param {string} reason - Reason for status change (optional)
     * @param {string} updatedBy - User ID who is updating the status
     * @returns {Promise<Object>} Updated ticket
     */
    async updateTicketStatus(ticketId, newStatus, reason = null, updatedBy = null) {
        try {
            // Validate status
            if (!this.validStatuses.includes(newStatus)) {
                throw new Error(`Invalid status. Must be one of: ${this.validStatuses.join(', ')}`);
            }

            // Get current ticket
            const ticket = await Ticket.findByPk(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            const currentStatus = ticket.status;
            
            // Validate status transition
            if (!this.validateStatusTransition(currentStatus, newStatus)) {
                throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
            }

            // Prepare update data
            const updateData = {
                status: newStatus,
                updatedAt: new Date()
            };

            // Add specific fields based on status
            this._addStatusSpecificFields(updateData, newStatus, ticket, reason);

            // Update ticket
            const updatedTicket = await ticket.update(updateData);

            logger.info('Ticket status updated successfully', {
                ticketId,
                oldStatus: currentStatus,
                newStatus,
                reason,
                updatedBy,
                ticketType: ticket.ticketType,
                passengerId: ticket.passengerId
            });

            return updatedTicket;
        } catch (error) {
            logger.error('Error updating ticket status', {
                error: error.message,
                ticketId,
                newStatus,
                reason,
                updatedBy
            });
            throw error;
        }
    }

    /**
     * Add status-specific fields to update data
     * @private
     * @param {Object} updateData - Update data object
     * @param {string} newStatus - New status
     * @param {Object} ticket - Current ticket
     * @param {string} reason - Reason for change
     */
    _addStatusSpecificFields(updateData, newStatus, ticket, reason) {
        switch (newStatus) {
            case 'active':
                if (ticket.status === 'inactive' && !ticket.validFrom) {
                    // For long-term tickets, set validity period when activating
                    const { validFrom, validUntil } = Ticket.calculateValidityPeriod(ticket.ticketType);
                    updateData.validFrom = validFrom;
                    updateData.validUntil = validUntil;
                    updateData.activatedAt = new Date();
                }
                break;
            case 'used':
                updateData.usedList = [...(ticket.usedList || []), new Date()];
                break;
            case 'expired':
                // No additional fields needed for expired
                break;
            case 'cancelled':
                updateData.isActive = false;
                updateData.cancelledAt = new Date();
                if (reason) {
                    updateData.cancellationReason = reason;
                }
                break;
        }
    }
}

module.exports = new TicketStatusService();
