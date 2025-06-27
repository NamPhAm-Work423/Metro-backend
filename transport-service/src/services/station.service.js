const { Station, RouteStation, Stop } = require('../models/index.model');
const { Op } = require('sequelize');

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

    async updateStation(stationId, updateData) {
        try {
            const station = await Station.findByPk(stationId);
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            const updatedStation = await station.update(updateData);
            return updatedStation;
        } catch (error) {
            throw error;
        }
    }

    async deleteStation(stationId) {
        try {
            const station = await Station.findByPk(stationId);
            
            if (!station) {
                throw new Error('Station not found');
            }
            
            // Soft delete - set isActive to false
            await station.update({ isActive: false });
            return { message: 'Station deactivated successfully' };
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
