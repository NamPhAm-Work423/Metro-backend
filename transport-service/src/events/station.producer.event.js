const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

/**
 * Station Event Producer - Handles publishing station-related events
 * Follows Single Responsibility Principle - only handles station event publishing
 */
class StationEventProducer {
    constructor() {
        this.topic = 'station-events';
    }

    /**
     * Publish station status change event
     * @param {Object} eventData - Event payload
     * @param {string} eventData.stationId - Station ID
     * @param {string} eventData.stationName - Station name
     * @param {string} eventData.location - Station location
     * @param {boolean} eventData.previousStatus - Previous isActive status
     * @param {boolean} eventData.newStatus - New isActive status
     * @param {string} eventData.reason - Reason for status change
     * @param {string} eventData.updatedBy - User who made the change
     * @param {Date} eventData.timestamp - Event timestamp
     * @param {Array} eventData.affectedRoutes - Array of affected routes
     */
    async publishStationStatusChange(eventData) {
        try {
            const event = {
                type: 'STATION_STATUS_CHANGED',
                version: '1.0',
                timestamp: eventData.timestamp || new Date().toISOString(),
                data: {
                    stationId: eventData.stationId,
                    stationName: eventData.stationName,
                    location: eventData.location,
                    previousStatus: eventData.previousStatus,
                    newStatus: eventData.newStatus,
                    reason: eventData.reason,
                    updatedBy: eventData.updatedBy,
                    affectedRoutes: eventData.affectedRoutes || [],
                    metadata: {
                        service: 'transport-service',
                        eventId: `station-${eventData.stationId}-${Date.now()}`
                    }
                }
            };

            await publish(this.topic, eventData.stationId, event);

            logger.info('Station status change event published', {
                stationId: eventData.stationId,
                previousStatus: eventData.previousStatus,
                newStatus: eventData.newStatus,
                topic: this.topic
            });

            return event;
        } catch (error) {
            logger.error('Failed to publish station status change event', {
                stationId: eventData.stationId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Publish station deactivation event (specific case when isActive changes from true to false)
     * @param {Object} eventData - Event payload
     * @param {Array} eventData.affectedRoutes - Array of affected routes
     */
    async publishStationDeactivation(eventData) {
        try {
            const event = {
                type: 'STATION_DEACTIVATED',
                version: '1.0',
                timestamp: eventData.timestamp || new Date().toISOString(),
                data: {
                    stationId: eventData.stationId,
                    stationName: eventData.stationName,
                    location: eventData.location,
                    reason: eventData.reason,
                    updatedBy: eventData.updatedBy,
                    deactivatedAt: eventData.timestamp || new Date().toISOString(),
                    affectedRoutes: eventData.affectedRoutes || [],
                    metadata: {
                        service: 'transport-service',
                        eventId: `station-deactivated-${eventData.stationId}-${Date.now()}`,
                        requiresNotification: true
                    }
                }
            };

            await publish(this.topic, eventData.stationId, event);

            logger.info('Station deactivation event published', {
                stationId: eventData.stationId,
                stationName: eventData.stationName,
                topic: this.topic
            });

            return event;
        } catch (error) {
            logger.error('Failed to publish station deactivation event', {
                stationId: eventData.stationId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = new StationEventProducer();
