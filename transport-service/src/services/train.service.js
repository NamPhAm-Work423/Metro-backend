const { Train, Trip, Route } = require('../models/index.model');
const { Op } = require('sequelize');

class TrainService {
    async createTrain(trainData) {
        try {
            const train = await Train.create(trainData);
            return train;
        } catch (error) {
            throw error;
        }
    }

    async getAllTrains(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.type) {
                where.type = filters.type;
            }
            
            if (filters.status) {
                where.status = filters.status;
            }
            
            if (filters.name) {
                where.name = { [Op.iLike]: `%${filters.name}%` };
            }
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            const trains = await Train.findAll({
                where,
                include: [
                    {
                        model: Trip,
                        as: 'trips',
                        attributes: ['tripId', 'routeId', 'departureTime', 'arrivalTime', 'dayOfWeek']
                    },
                    {
                        model: Route,
                        as: 'route',
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance']
                    }
                ],
                order: [['name', 'ASC']]
            });
            
            return trains;
        } catch (error) {
            throw error;
        }
    }

    async getTrainById(trainId) {
        try {
            const train = await Train.findByPk(trainId, {
                include: [
                    {
                        model: Trip,
                        as: 'trips',
                        attributes: ['tripId', 'routeId', 'departureTime', 'arrivalTime', 'dayOfWeek', 'isActive']
                    },
                    {
                        model: Route,
                        as: 'route',
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance']
                    }
                ]
            });
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            return train;
        } catch (error) {
            throw error;
        }
    }

    async updateTrain(trainId, updateData) {
        try {
            const train = await Train.findByPk(trainId);
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            const updatedTrain = await train.update(updateData);
            return updatedTrain;
        } catch (error) {
            throw error;
        }
    }

    async deleteTrain(trainId) {
        try {
            const train = await Train.findByPk(trainId);
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            await train.destroy();
            return { message: 'Train deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getActiveTrains() {
        try {
            return await Train.findAll({
                where: { isActive: true, status: 'active' },
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getTrainsByType(type) {
        try {
            return await Train.findAll({
                where: { isActive: true, type },
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getTrainsByStatus(status) {
        try {
            return await Train.findAll({
                where: { isActive: true, status },
                include: [
                    {
                        model: Trip,
                        as: 'trips',
                        attributes: ['tripId', 'routeId', 'departureTime', 'arrivalTime']
                    }
                ],
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async updateTrainStatus(trainId, status) {
        try {
            const train = await Train.findByPk(trainId);
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            const validStatuses = ['active', 'maintenance', 'out-of-service'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }
            
            const updatedTrain = await train.update({ status });
            return updatedTrain;
        } catch (error) {
            throw error;
        }
    }

    async scheduleMaintenanceForTrain(trainId, maintenanceDate) {
        try {
            const train = await Train.findByPk(trainId);
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            const updatedTrain = await train.update({
                status: 'maintenance',
                lastMaintenance: maintenanceDate
            });
            
            return updatedTrain;
        } catch (error) {
            throw error;
        }
    }

    async getTrainsNeedingMaintenance(daysThreshold = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
            
            const trains = await Train.findAll({
                where: {
                    isActive: true,
                    [Op.or]: [
                        { lastMaintenance: { [Op.lt]: cutoffDate } },
                        { lastMaintenance: null }
                    ]
                },
                order: [['lastMaintenance', 'ASC']]
            });
            
            return trains;
        } catch (error) {
            throw error;
        }
    }

    async getTrainUtilization(trainId) {
        try {
            const train = await Train.findByPk(trainId, {
                include: [
                    {
                        model: Trip,
                        as: 'trips',
                        where: { isActive: true },
                        attributes: ['tripId', 'routeId', 'departureTime', 'arrivalTime', 'dayOfWeek']
                    }
                ]
            });
            
            if (!train) {
                throw new Error('Train not found');
            }
            
            const totalTrips = train.trips.length;
            const daysOfWeek = [...new Set(train.trips.map(trip => trip.dayOfWeek))];
            
            return {
                trainId,
                name: train.name,
                totalTrips,
                activeDays: daysOfWeek.length,
                capacity: train.capacity,
                utilizationScore: (totalTrips / 7) * 100 // Percentage based on max 1 trip per day
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new TrainService();
