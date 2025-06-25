const { Station } = require('../models/index.model');
const { Op } = require('sequelize');
const { logger } = require('../config/logger');
const kafkaProducer = require('../events/kafkaProducer');

/**
 * Create a new station
 * @param {Object} stationData - Station data
 * @param {string} userId - User ID who created the station
 * @returns {Object} - Created station
 */
async function createStation(stationData, userId = null) {
    try {
        const station = await Station.create(stationData);

        logger.info('Station created successfully', { 
            stationId: station.stationId,
            stationCode: station.stationCode,
            stationName: station.stationName,
            userId
        });

        // Publish station created event (async, don't wait)
        setImmediate(() => {
            kafkaProducer.publishStationEvent('STATION_CREATED', station.toJSON(), userId)
                .catch(err => {
                    logger.error('Failed to publish station created event', {
                        stationId: station.stationId,
                        error: err.message
                    });
                });
        });

        return station;

    } catch (err) {
        logger.error('Error creating station', { 
            error: err.message, 
            stack: err.stack,
            stationData: JSON.stringify(stationData),
            userId
        });
        throw err;
    }
}

/**
 * Get all stations
 * @param {Object} options - Query options
 * @returns {Array} - Array of stations
 */
async function getAllStations(options = {}) {
    try {
        const {
            isActive,
            limit,
            offset,
            sortBy = 'stationName',
            sortOrder = 'ASC'
        } = options;

        const whereClause = {};
        
        if (isActive !== undefined) {
            whereClause.isActive = isActive;
        }

        const queryOptions = {
            where: whereClause,
            order: [[sortBy, sortOrder]]
        };

        if (limit) {
            queryOptions.limit = parseInt(limit);
        }

        if (offset) {
            queryOptions.offset = parseInt(offset);
        }

        const stations = await Station.findAll(queryOptions);
        
        return stations;

    } catch (err) {
        logger.error('Error fetching all stations', { 
            error: err.message, 
            options 
        });
        throw err;
    }
}

/**
 * Get station by ID
 * @param {string} stationId - Station ID
 * @param {boolean} includeInactive - Whether to include inactive stations
 * @returns {Object|null} - Station or null if not found
 */
async function getStationById(stationId, includeInactive = false) {
    try {
        const whereClause = { stationId };
        
        if (!includeInactive) {
            whereClause.isActive = true;
        }

        const station = await Station.findOne({ where: whereClause });
        return station;
    } catch (err) {
        logger.error('Error fetching station by ID', { 
            error: err.message, 
            stationId 
        });
        throw err;
    }
}

/**
 * Get station by code
 * @param {string} stationCode - Station code
 * @returns {Object|null} - Station or null if not found
 */
async function getStationByCode(stationCode) {
    try {
        const station = await Station.findOne({ 
            where: { 
                stationCode,
                isActive: true 
            } 
        });
        return station;
    } catch (err) {
        logger.error('Error fetching station by code', { 
            error: err.message, 
            stationCode 
        });
        throw err;
    }
}

/**
 * Get multiple stations by IDs
 * @param {Array} stationIds - Array of station IDs
 * @returns {Array} - Array of stations
 */
async function getStationsByIds(stationIds) {
    try {
        const stations = await Station.findAll({
            where: {
                stationId: {
                    [Op.in]: stationIds
                }
            },
            order: [['stationName', 'ASC']]
        });
        return stations;
    } catch (err) {
        logger.error('Error fetching stations by IDs', { 
            error: err.message, 
            stationIds 
        });
        throw err;
    }
}

/**
 * Update station
 * @param {string} stationId - Station ID
 * @param {Object} updateData - Data to update
 * @param {boolean} includeInactive - Whether to include inactive stations for update
 * @param {string} userId - User ID who updated the station
 * @returns {Object|null} - Updated station or null if not found
 */
async function updateStation(stationId, updateData, includeInactive = false, userId = null) {
    try {
        const whereClause = { stationId };
        
        if (!includeInactive) {
            whereClause.isActive = true;
        }

        const station = await Station.findOne({ where: whereClause });
        
        if (!station) {
            logger.error('Station not found for update', { stationId, userId });
            return null;
        }

        const oldData = station.toJSON();
        await station.update(updateData);
        
        logger.info('Station updated successfully', { 
            stationId,
            updatedFields: Object.keys(updateData),
            userId
        });

        // Publish station updated event (async, don't wait)
        setImmediate(() => {
            kafkaProducer.publishStationEvent('STATION_UPDATED', {
                ...station.toJSON(),
                previousData: oldData,
                updatedFields: Object.keys(updateData)
            }, userId)
                .catch(err => {
                    logger.error('Failed to publish station updated event', {
                        stationId: station.stationId,
                        error: err.message
                    });
                });

            // If status changed, publish status change event
            if (updateData.hasOwnProperty('isActive') && oldData.isActive !== updateData.isActive) {
                kafkaProducer.publishStationStatusChange(
                    stationId, 
                    updateData.isActive, 
                    updateData.reason || 'Status updated',
                    userId
                )
                    .catch(err => {
                        logger.error('Failed to publish station status change event', {
                            stationId,
                            error: err.message
                        });
                    });
            }
        });

        return station;

    } catch (err) {
        logger.error('Error updating station', { 
            error: err.message, 
            stationId,
            updateData,
            userId
        });
        throw err;
    }
}

/**
 * Delete station (soft delete)
 * @param {string} stationId - Station ID
 * @param {string} userId - User ID who deleted the station
 * @returns {boolean} - True if deleted, false if not found
 */
async function deleteStation(stationId, userId = null) {
    try {
        const station = await Station.findOne({ 
            where: { 
                stationId,
                isActive: true 
            } 
        });
        
        if (!station) {
            logger.error('Station not found for deletion', { stationId, userId });
            return false;
        }

        const stationData = station.toJSON();
        await station.update({ isActive: false });
        
        logger.info('Station deleted successfully', { stationId, userId });

        // Publish station deleted event (async, don't wait)
        setImmediate(() => {
            kafkaProducer.publishStationEvent('STATION_DELETED', stationData, userId)
                .catch(err => {
                    logger.error('Failed to publish station deleted event', {
                        stationId,
                        error: err.message
                    });
                });

            // Publish status change event
            kafkaProducer.publishStationStatusChange(
                stationId, 
                false, 
                'Station deleted',
                userId
            )
                .catch(err => {
                    logger.error('Failed to publish station status change event for deletion', {
                        stationId,
                        error: err.message
                    });
                });
        });

        return true;

    } catch (err) {
        logger.error('Error deleting station', { 
            error: err.message, 
            stationId,
            userId
        });
        throw err;
    }
}

/**
 * Search stations by name or code
 * @param {string} searchTerm - Search term
 * @returns {Array} - Array of matching stations
 */
async function searchStations(searchTerm) {
    try {
        const stations = await Station.findAll({
            where: {
                [Op.or]: [
                    {
                        stationName: {
                            [Op.iLike]: `%${searchTerm}%`
                        }
                    },
                    {
                        stationCode: {
                            [Op.iLike]: `%${searchTerm}%`
                        }
                    }
                ],
                isActive: true
            },
            order: [['stationName', 'ASC']]
        });

        return stations;

    } catch (err) {
        logger.error('Error searching stations', { 
            error: err.message, 
            searchTerm 
        });
        throw err;
    }
}

/**
 * Get stations with specific facility
 * @param {string} facility - Facility name
 * @returns {Array} - Array of stations with the facility
 */
async function getStationsWithFacility(facility) {
    try {
        const stations = await Station.findAll({
            where: {
                facilities: {
                    [Op.contains]: [facility]
                },
                isActive: true
            },
            order: [['stationName', 'ASC']]
        });

        return stations;

    } catch (err) {
        logger.error('Error fetching stations with facility', { 
            error: err.message, 
            facility 
        });
        throw err;
    }
}

/**
 * Get stations count by status
 * @returns {Object} - Count statistics
 */
async function getStationStats() {
    try {
        const [totalStations, activeStations] = await Promise.all([
            Station.count(),
            Station.count({ where: { isActive: true } })
        ]);

        return {
            total: totalStations,
            active: activeStations,
            inactive: totalStations - activeStations
        };

    } catch (err) {
        logger.error('Error fetching station statistics', { 
            error: err.message 
        });
        throw err;
    }
}

module.exports = {
    createStation,
    getAllStations,
    getStationById,
    getStationByCode,
    getStationsByIds,
    updateStation,
    deleteStation,
    searchStations,
    getStationsWithFacility,
    getStationStats
}; 