const { Kafka } = require('kafkajs');
const { logger } = require('../config/logger');
const stationService = require('../services/station.service');

// Create Kafka instance
const kafka = Kafka({
    clientId: 'station-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    connectionTimeout: 10000,
    requestTimeout: 30000,
    retry: {
        retries: 5,
        initialRetryTime: 1000,
        maxRetryTime: 30000
    }
});

const consumer = kafka.consumer({ 
    groupId: 'station-service-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000
});

/**
 * Handle station events
 */
const handleStationEvent = async (message) => {
    try {
        const { eventType, data } = JSON.parse(message.value.toString());
        
        logger.info('Received station event', { 
            eventType, 
            stationId: data?.stationId,
            timestamp: new Date().toISOString()
        });

        switch (eventType) {
            case 'STATION_CREATED':
                await handleStationCreated(data);
                break;
            case 'STATION_UPDATED':
                await handleStationUpdated(data);
                break;
            case 'STATION_DELETED':
                await handleStationDeleted(data);
                break;
            default:
                logger.warn('Unknown station event type', { eventType, data });
        }

    } catch (error) {
        logger.error('Error handling station event', {
            error: error.message,
            stack: error.stack,
            message: message.value.toString()
        });
        throw error;
    }
};

/**
 * Handle route/schedule update events that might affect stations
 */
const handleRouteEvent = async (message) => {
    try {
        const { eventType, data } = JSON.parse(message.value.toString());
        
        logger.info('Received route event', { 
            eventType, 
            routeId: data?.routeId,
            timestamp: new Date().toISOString()
        });

        switch (eventType) {
            case 'ROUTE_CREATED':
                await handleRouteCreated(data);
                break;
            case 'ROUTE_UPDATED':
                await handleRouteUpdated(data);
                break;
            case 'SCHEDULE_UPDATED':
                await handleScheduleUpdated(data);
                break;
            default:
                logger.info('Route event not relevant to station service', { eventType });
        }

    } catch (error) {
        logger.error('Error handling route event', {
            error: error.message,
            stack: error.stack,
            message: message.value.toString()
        });
        throw error;
    }
};

/**
 * Handle station created event
 */
async function handleStationCreated(data) {
    try {
        logger.info('Processing station created event', { stationData: data });
        // Additional processing if needed
        // For example, updating related services or caches
    } catch (error) {
        logger.error('Error processing station created event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Handle station updated event
 */
async function handleStationUpdated(data) {
    try {
        logger.info('Processing station updated event', { stationData: data });
        // Additional processing if needed
        // For example, invalidating caches or notifying other services
    } catch (error) {
        logger.error('Error processing station updated event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Handle station deleted event
 */
async function handleStationDeleted(data) {
    try {
        logger.info('Processing station deleted event', { stationData: data });
        // Additional processing if needed
        // For example, cleaning up related data or notifying other services
    } catch (error) {
        logger.error('Error processing station deleted event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Handle route created event
 */
async function handleRouteCreated(data) {
    try {
        logger.info('Processing route created event', { routeData: data });
        // Update station information if the route affects stations
        if (data.stations && Array.isArray(data.stations)) {
            for (const stationInfo of data.stations) {
                // Update station with route information if needed
                await stationService.updateStation(stationInfo.stationId, {
                    // Update relevant station fields
                });
            }
        }
    } catch (error) {
        logger.error('Error processing route created event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Handle route updated event
 */
async function handleRouteUpdated(data) {
    try {
        logger.info('Processing route updated event', { routeData: data });
        // Update station information if the route changes affect stations
    } catch (error) {
        logger.error('Error processing route updated event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Handle schedule updated event
 */
async function handleScheduleUpdated(data) {
    try {
        logger.info('Processing schedule updated event', { scheduleData: data });
        // Update station operating hours or related information if needed
    } catch (error) {
        logger.error('Error processing schedule updated event', {
            error: error.message,
            data
        });
        throw error;
    }
}

/**
 * Start the Kafka consumer
 */
async function startConsumer() {
    try {
        await consumer.connect();
        logger.info('Kafka consumer connected successfully');

        // Subscribe to relevant topics
        await consumer.subscribe({ 
            topics: ['station-events', 'route-events', 'schedule-events'],
            fromBeginning: false 
        });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    logger.info('Received Kafka message', {
                        topic,
                        partition,
                        offset: message.offset,
                        timestamp: new Date().toISOString()
                    });

                    // Route message to appropriate handler based on topic
                    switch (topic) {
                        case 'station-events':
                            await handleStationEvent(message);
                            break;
                        case 'route-events':
                        case 'schedule-events':
                            await handleRouteEvent(message);
                            break;
                        default:
                            logger.warn('Received message from unknown topic', { topic });
                    }

                } catch (error) {
                    logger.error('Error processing Kafka message', {
                        error: error.message,
                        stack: error.stack,
                        topic,
                        partition,
                        offset: message.offset
                    });
                    
                    // Depending on your error handling strategy, you might want to:
                    // 1. Continue processing other messages
                    // 2. Pause the consumer
                    // 3. Send to dead letter queue
                    // For now, we'll continue processing
                }
            },
        });

        logger.info('Kafka consumer started and listening for messages');

    } catch (error) {
        logger.error('Error starting Kafka consumer', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Stop the Kafka consumer
 */
async function stopConsumer() {
    try {
        await consumer.disconnect();
        logger.info('Kafka consumer disconnected successfully');
    } catch (error) {
        logger.error('Error stopping Kafka consumer', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Disconnect from Kafka (alias for stopConsumer)
 */
async function disconnect() {
    return stopConsumer();
}

module.exports = {
    startConsumer,
    stopConsumer,
    disconnect
}; 