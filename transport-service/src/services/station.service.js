const { Station, RouteStation, Stop, Route } = require('../models/index.model');
const { Op } = require('sequelize');
const stationEventProducer = require('../events/station.producer.event');

class StationService {
    async createStation(stationData) {
        try {
            const station = await Station.create(stationData);
            return station;
        } catch (error) {
            throw error;
        }
    }

    async getAllStations(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.location) {
                where.location = { [Op.iLike]: `%${filters.location}%` };
            }
            
            if (filters.name) {
                where.name = { [Op.iLike]: `%${filters.name}%` };
            }

            const stations = await Station.findAll({
                where,
                include: [
                    {
                        model: RouteStation,
                        as: 'routes',
                        attributes: ['routeId', 'sequence']
                    }
                ],
                order: [['name', 'ASC']]
            });
            
            return stations;
        } catch (error) {
            throw error;
        }
    }

    async getStationById(stationId) {
        try {
            const station = await Station.findByPk(stationId, {
                include: [
                    {
                        model: RouteStation,
                        as: 'routes',
                        attributes: ['routeId', 'sequence']
                    },
                    {
                        model: Stop,
                        as: 'stops',
                        attributes: ['tripId', 'arrivalTime', 'departureTime', 'sequence']
                    }
                ]
            });
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            return station;
        } catch (error) {
            throw error;
        }
    }

    async updateStation(stationId, updateData, updatedBy = 'system') {
        try {
            const station = await Station.findByPk(stationId);
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            // Store previous state for event publishing
            const previousIsActive = station.isActive;
            
            const updatedStation = await station.update(updateData);
            
            // Check if isActive status changed from true to false
            if (previousIsActive === true && updatedStation.isActive === false) {
                await this.publishStationDeactivationEvent(updatedStation, updatedBy);
            }
            
            return updatedStation;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Publish station deactivation event when isActive changes from true to false
     * @param {Object} station - Updated station object
     * @param {string} updatedBy - User who made the change
     */
    async publishStationDeactivationEvent(station, updatedBy) {
        try {
            // Get all routes that contain this station
            const affectedRoutes = await this.getAffectedRoutes(station.stationId);
            
            const eventData = {
                stationId: station.stationId,
                stationName: station.name,
                location: station.location,
                previousStatus: true,
                newStatus: false,
                reason: 'Station deactivated by admin',
                updatedBy: updatedBy,
                timestamp: new Date().toISOString(),
                affectedRoutes: affectedRoutes
            };

            await stationEventProducer.publishStationDeactivation(eventData);

        } catch (error) {
            // Log error but don't throw to prevent update failure
            console.error('Failed to publish station deactivation event:', error);
        }
    }

    /**
     * Get all routes that contain the specified station
     * @param {string} stationId - Station ID
     * @returns {Array} Array of route information
     */
    async getAffectedRoutes(stationId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { stationId },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId']
                    }
                ],
                attributes: ['routeId', 'sequence']
            });

            return routeStations.map(rs => ({
                routeId: rs.routeId,
                routeName: rs.Route?.name || 'Unknown Route',
                sequence: rs.sequence,
                originId: rs.Route?.originId,
                destinationId: rs.Route?.destinationId
            }));
        } catch (error) {
            console.error('Failed to get affected routes:', error);
            return [];
        }
    }

    async deleteStation(stationId) {
        try {
            const station = await Station.findByPk(stationId);
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            await station.destroy();
            return { message: 'Station deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getActiveStations() {
        try {
            return await Station.findAll({
                where: { isActive: true },
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getStationsByOperatingHours(currentTime) {
        try {
            const stations = await Station.findAll({
                where: {
                    isActive: true,
                    openTime: { [Op.lte]: currentTime },
                    closeTime: { [Op.gte]: currentTime }
                },
                order: [['name', 'ASC']]
            });
            
            return stations;
        } catch (error) {
            throw error;
        }
    }

    async updateStationFacilities(stationId, facilities) {
        try {
            const station = await Station.findByPk(stationId);
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            const updatedStation = await station.update({ facilities });
            return updatedStation;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new StationService();
