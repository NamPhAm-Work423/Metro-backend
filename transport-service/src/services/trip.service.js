const { Trip, Route, Train, Stop, Station } = require('../models/index.model');
const { Op } = require('sequelize');

class TripService {
    async createTrip(tripData) {
        try {
            const trip = await Trip.create(tripData);
            return trip;
        } catch (error) {
            throw error;
        }
    }

    async getAllTrips(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.trainId) {
                where.trainId = filters.trainId;
            }
            
            if (filters.dayOfWeek) {
                where.dayOfWeek = filters.dayOfWeek;
            }
            
            if (filters.departureTimeFrom && filters.departureTimeTo) {
                where.departureTime = {
                    [Op.between]: [filters.departureTimeFrom, filters.departureTimeTo]
                };
            }

            const trips = await Trip.findAll({
                where,
                include: [
                    {
                        model: Route,
                        as: 'route',
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration']
                    },
                    {
                        model: Train,
                        as: 'train',
                        attributes: ['trainId', 'name', 'type', 'capacity', 'status']
                    },
                    {
                        model: Stop,
                        as: 'stops',
                        include: [
                            {
                                model: Station,
                                as: 'station',
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ],
                order: [['departureTime', 'ASC']]
            });
            
            return trips;
        } catch (error) {
            throw error;
        }
    }

    async getTripById(tripId) {
        try {
            const trip = await Trip.findByPk(tripId, {
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration']
                    },
                    {
                        model: Train,
                        attributes: ['trainId', 'name', 'type', 'capacity', 'status']
                    },
                    {
                        model: Stop,
                        as: 'stops',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location', 'facilities']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ]
            });
            
            if (!trip) {
                throw new Error('Trip not found');
            }
            
            return trip;
        } catch (error) {
            throw error;
        }
    }

    async updateTrip(tripId, updateData) {
        try {
            const trip = await Trip.findByPk(tripId);
            
            if (!trip) {
                throw new Error('Trip not found');
            }
            
            const updatedTrip = await trip.update(updateData);
            return updatedTrip;
        } catch (error) {
            throw error;
        }
    }

    async deleteTrip(tripId) {
        try {
            const trip = await Trip.findByPk(tripId);
            
            if (!trip) {
                throw new Error('Trip not found');
            }
            
            await trip.destroy();
            return { message: 'Trip deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getActiveTrips() {
        try {
            return await Trip.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: Route,
                        as: 'route',
                        attributes: ['routeId', 'name', 'originId', 'destinationId']
                    },
                    {
                        model: Train,
                        as: 'train',
                        attributes: ['trainId', 'name', 'type', 'capacity']
                    }
                ],
                order: [['departureTime', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getTripsByRoute(routeId) {
        try {
            return await Trip.findAll({
                where: { routeId, isActive: true },
                include: [
                    {
                        model: Train,
                        attributes: ['trainId', 'name', 'type', 'capacity', 'status']
                    },
                    {
                        model: Stop,
                        as: 'stops',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ],
                order: [['departureTime', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getTripsByTrain(trainId) {
        try {
            return await Trip.findAll({
                where: { trainId, isActive: true },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance']
                    }
                ],
                order: [['departureTime', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getTripsByDayOfWeek(dayOfWeek) {
        try {
            return await Trip.findAll({
                where: { dayOfWeek, isActive: true },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId']
                    },
                    {
                        model: Train,
                        attributes: ['trainId', 'name', 'type', 'capacity']
                    }
                ],
                order: [['departureTime', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getUpcomingTrips(currentTime, dayOfWeek) {
        try {
            return await Trip.findAll({
                where: {
                    isActive: true,
                    dayOfWeek,
                    departureTime: { [Op.gte]: currentTime }
                },
                include: [
                    {
                        model: Route,
                        as: 'route',
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'duration']
                    },
                    {
                        model: Train,
                        as: 'train',
                        attributes: ['trainId', 'name', 'type', 'capacity', 'status'],
                        where: { status: 'active' }
                    }
                ],
                order: [['departureTime', 'ASC']],
                limit: 10
            });
        } catch (error) {
            throw error;
        }
    }

    async findTripsBetweenStations(originStationId, destinationStationId, dayOfWeek) {
        try {
            const trips = await Trip.findAll({
                where: { dayOfWeek, isActive: true },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'duration']
                    },
                    {
                        model: Train,
                        attributes: ['trainId', 'name', 'type', 'capacity', 'status'],
                        where: { status: 'active' }
                    },
                    {
                        model: Stop,
                        as: 'stops',
                        where: {
                            stationId: { [Op.in]: [originStationId, destinationStationId] }
                        },
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ]
                    }
                ],
                order: [['departureTime', 'ASC']]
            });

            // Filter trips that visit both stations in correct order
            const validTrips = trips.filter(trip => {
                const stops = trip.stops.sort((a, b) => a.sequence - b.sequence);
                const originIndex = stops.findIndex(stop => stop.stationId === originStationId);
                const destinationIndex = stops.findIndex(stop => stop.stationId === destinationStationId);
                
                return originIndex !== -1 && destinationIndex !== -1 && originIndex < destinationIndex;
            });

            return validTrips;
        } catch (error) {
            throw error;
        }
    }

    async getTripStatistics(tripId) {
        try {
            const trip = await Trip.findByPk(tripId, {
                include: [
                    {
                        model: Route,
                        attributes: ['distance', 'duration']
                    },
                    {
                        model: Train,
                        attributes: ['capacity']
                    },
                    {
                        model: Stop,
                        as: 'stops'
                    }
                ]
            });

            if (!trip) {
                throw new Error('Trip not found');
            }

            return {
                tripId,
                totalStops: trip.stops.length,
                totalDistance: trip.Route.distance,
                estimatedDuration: trip.Route.duration,
                trainCapacity: trip.Train.capacity,
                departureTime: trip.departureTime,
                arrivalTime: trip.arrivalTime,
                dayOfWeek: trip.dayOfWeek
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new TripService();
