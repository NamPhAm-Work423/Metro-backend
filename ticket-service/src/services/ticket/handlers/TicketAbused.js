const { logger } = require('../../../config/logger');
const { Ticket } = require('../../../models/index.model');
const RotationQRCode = require('../helpers/RotationQRCode.helper');

/**
 * TicketAbused - detect abnormal usage patterns and lock ticket
 */
class TicketAbused {
    /**
     * Track usage and detect abuse based on recent usedList entries.
     * If abuse is detected, mark ticket as 'abused' and rotate QR code.
     *
     * Rules (initial heuristic):
     * - Long-term tickets: more than 3 uses within 60 seconds
     * - Any ticket: 2 uses within 10 seconds
     *
     * @param {import('../../../models/index.model').Ticket} ticketInstance
     * @returns {Promise<{ abused: boolean, reason?: string }>} Result
     */
    async trackAndDetectAbuse(ticketInstance) {
        try {
            const usedList = Array.isArray(ticketInstance.usedList) ? ticketInstance.usedList : [];
            if (usedList.length < 2) {
                return { abused: false };
            }

            const now = new Date();
            const times = usedList
                .map((d) => new Date(d))
                .filter((d) => !Number.isNaN(d.getTime()))
                .sort((a, b) => a.getTime() - b.getTime());

            const last = times[times.length - 1];
            const prev = times[times.length - 2];

            const secondsBetweenLastTwo = (last.getTime() - prev.getTime()) / 1000;

            // Rule 1: any ticket used twice within 10s
            if (secondsBetweenLastTwo <= 10) {
                await this._lockAndRotate(ticketInstance, 'Two usages within 10 seconds');
                return { abused: true, reason: 'Two usages within 10 seconds' };
            }

            // Rule 2: long-term specific burst: >3 uses within 60s window
            const isLongTerm = !['oneway', 'return'].includes(String(ticketInstance.ticketType || '').toLowerCase());
            if (isLongTerm) {
                const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
                const recentCount = times.filter((t) => t >= oneMinuteAgo).length;
                if (recentCount > 3) {
                    await this._lockAndRotate(ticketInstance, 'More than 3 usages within 60 seconds');
                    return { abused: true, reason: 'More than 3 usages within 60 seconds' };
                }
            }

            return { abused: false };
        } catch (error) {
            logger.error('Error detecting ticket abuse', { error: error.message, ticketId: ticketInstance?.ticketId });
            return { abused: false };
        }
    }

    async _lockAndRotate(ticketInstance, reason) {
        try {
            await ticketInstance.update({ status: 'abused' });
            logger.warn('Ticket marked as abused', {
                ticketId: ticketInstance.ticketId,
                reason,
                ticketType: ticketInstance.ticketType
            });
        } catch (error) {
            logger.error('Failed to lock and rotate abused ticket', {
                error: error.message,
                ticketId: ticketInstance?.ticketId
            });
        }
    }
}

module.exports = new TicketAbused();


