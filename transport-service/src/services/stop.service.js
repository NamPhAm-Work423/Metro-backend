const { Stop, Trip, Station, Route, Train } = require('../models/index.model');
const { Op } = require('sequelize');

class StopService {
    async createStop(stopData) {
        try {
            const stop = await Stop.create(stopData);
            return stop;
        } catch (error) {
            throw error;
        }
    }

    async createMultipleStops(stopsData) {
        try {
            const stops = await Stop.bulkCreate(stopsData);
            return stops;
        } catch (error) {
            throw error;
        }
    }

    async getAllStops(filters = {}) {
        try {
            const where = {};
            
            if (filters.tripId) {
                where.tripId = filters.tripId;
            }
            
            if (filters.stationId) {
                where.stationId = filters.stationId;
            }

            const stops = await Stop.findAll({
                where,
                include: [
                    {
                        model: Trip,
                        as: 'trip',
                        attributes: ['tripId', 'routeId', 'trainId', 'departureTime', 'arrivalTime', 'dayOfWeek']
                    },
                    {
                        model: Station,
                        as: 'station',
                        attributes: ['stationId', 'name', 'location', 'openTime', 'closeTime']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return stops;
        } catch (error) {
            throw error;
        }
    }

    async getStopById(stopId) {
        try {
            const stop = await Stop.findByPk(stopId, {
                include: [
                    {
                        model: Trip,
                        include: [
                            {
                                model: Route,
                                attributes: ['routeId', 'name', 'originId', 'destinationId']
                            },
                            {
                                model: Train,
                                attributes: ['trainId', 'name', 'type', 'capacity']
                            }
                        ]
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities']
                    }
                ]
            });
            
            if (!stop) {
                throw new Error('Stop not found');
            }
            
            return stop;
        } catch (error) {
            throw error;
        }
    }

    async updateStop(stopId, updateData) {
        try {
            const stop = await Stop.findByPk(stopId);
            
            if (!stop) {
                throw new Error('Stop not found');
            }
            
            const updatedStop = await stop.update(updateData);
            return updatedStop;
        } catch (error) {
            throw error;
        }
    }

    async deleteStop(stopId) {
        try {
            const stop = await Stop.findByPk(stopId);
            
            if (!stop) {
                throw new Error('Stop not found');
            }
            
            await stop.destroy();
            return { message: 'Stop deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getStopsByTrip(tripId) {
        try {
            const stops = await Stop.findAll({
                where: { tripId },
                include: [
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return stops;
        } catch (error) {
            throw error;
        }
    }

    async getStopsByStation(stationId) {
        try {
            const stops = await Stop.findAll({
                where: { stationId },
                include: [
                    {
                        model: Trip,
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
                        ]
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return stops;
        } catch (error) {
            throw error;
        }
    }

    async getStopsByTimeRange(startTime, endTime, dayOfWeek) {
        try {
            const stops = await Stop.findAll({
                where: {
                    [Op.or]: [
                        {
                            arrivalTime: {
                                [Op.between]: [startTime, endTime]
                            }
                        },
                        {
                            departureTime: {
                                [Op.between]: [startTime, endTime]
                            }
                        }
                    ]
                },
                include: [
                    {
                        model: Trip,
                        where: { dayOfWeek },
                        include: [
                            {
                                model: Route,
                                attributes: ['routeId', 'name']
                            },
                            {
                                model: Train,
                                attributes: ['trainId', 'name', 'type']
                            }
                        ]
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location']
                    }
                ],
                order: [['arrivalTime', 'ASC']]
            });
            
            return stops;
        } catch (error) {
            throw error;
        }
    }

    async getTripScheduleWithStops(tripId) {
        try {
            const trip = await Trip.findByPk(tripId, {
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration']
                    },
                    {
                        model: Train,
                        attributes: ['trainId', 'name', 'type', 'capacity']
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

            return {
                tripInfo: {
                    tripId: trip.tripId,
                    routeName: trip.Route.name,
                    trainName: trip.Train.name,
                    trainType: trip.Train.type,
                    capacity: trip.Train.capacity,
                    dayOfWeek: trip.dayOfWeek,
                    totalDistance: trip.Route.distance,
                    estimatedDuration: trip.Route.duration
                },
                schedule: trip.stops.map(stop => ({
                    stopId: stop.stopId,
                    sequence: stop.sequence,
                    stationName: stop.Station.name,
                    stationLocation: stop.Station.location,
                    arrivalTime: stop.arrivalTime,
                    departureTime: stop.departureTime,
                    facilities: stop.Station.facilities
                }))
            };
        } catch (error) {
            throw error;
        }
    }

    async getNextStopsAtStation(stationId, currentTime, dayOfWeek, limit = 5) {
        try {
            const upcomingStops = await Stop.findAll({
                where: {
                    stationId,
                    [Op.or]: [
                        {
                            arrivalTime: { [Op.gte]: currentTime }
                        },
                        {
                            departureTime: { [Op.gte]: currentTime }
                        }
                    ]
                },
                include: [
                    {
                        model: Trip,
                        where: { dayOfWeek, isActive: true },
                        include: [
                            {
                                model: Route,
                                attributes: ['routeId', 'name', 'originId', 'destinationId']
                            },
                            {
                                model: Train,
                                attributes: ['trainId', 'name', 'type', 'capacity'],
                                where: { status: 'active' }
                            }
                        ]
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location']
                    }
                ],
                order: [
                    [{ model: Trip, as: 'Trip' }, 'departureTime', 'ASC'],
                    ['arrivalTime', 'ASC']
                ],
                limit
            });
            
            return upcomingStops;
        } catch (error) {
            throw error;
        }
    }

    async validateStopSequence(tripId, stops) {
        try {
            // Check if sequences are unique and consecutive
            const sequences = stops.map(stop => stop.sequence).sort((a, b) => a - b);
            
            for (let i = 0; i < sequences.length; i++) {
                if (sequences[i] !== i + 1) {
                    throw new Error('Stop sequences must be consecutive starting from 1');
                }
            }

            // Check if times are logical (arrival <= departure, and times increase with sequence)
            const sortedStops = stops.sort((a, b) => a.sequence - b.sequence);
            
            for (let i = 0; i < sortedStops.length; i++) {
                const stop = sortedStops[i];
                
                // First stop should not have arrival time, last stop should not have departure time
                if (i === 0 && stop.arrivalTime) {
                    throw new Error('First stop should not have arrival time');
                }
                
                if (i === sortedStops.length - 1 && stop.departureTime) {
                    throw new Error('Last stop should not have departure time');
                }
                
                // Check if arrival <= departure for intermediate stops
                if (stop.arrivalTime && stop.departureTime && stop.arrivalTime > stop.departureTime) {
                    throw new Error(`Stop ${stop.sequence}: Arrival time must be before departure time`);
                }
                
                // Check if times increase with sequence
                if (i > 0) {
                    const prevStop = sortedStops[i - 1];
                    const currentArrival = stop.arrivalTime;
                    const prevDeparture = prevStop.departureTime;
                    
                    if (currentArrival && prevDeparture && currentArrival <= prevDeparture) {
                        throw new Error(`Stop ${stop.sequence}: Arrival time must be after previous stop's departure time`);
                    }
                }
            }

            return { valid: true, message: 'Stop sequence is valid' };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new StopService();
