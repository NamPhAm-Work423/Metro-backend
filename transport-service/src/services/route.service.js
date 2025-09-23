const { Route, RouteStation, Station, Trip } = require('../models/index.model');
const { Op } = require('sequelize');

class RouteService {
    async createRoute(routeData) {
        try {
            const route = await Route.create(routeData);
            return route;
        } catch (error) {
            throw error;
        }
    }

    async getAllRoutes(filters = {}) {
        try {
            const where = {};
            
            if (filters.isActive !== undefined) {
                where.isActive = filters.isActive;
            }
            
            if (filters.name) {
                where.name = { [Op.iLike]: `%${filters.name}%` };
            }
            
            if (filters.originId) {
                where.originId = filters.originId;
            }
            
            if (filters.destinationId) {
                where.destinationId = filters.destinationId;
            }

            const routes = await Route.findAll({
                where,
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ],
                order: [['name', 'ASC']]
            });
            
            return routes;
        } catch (error) {
            console.error('[RouteService.getAllRoutes] error:', error);
            throw error;
        }
    }

    async getRouteById(routeId) {
        try {
            const route = await Route.findByPk(routeId, {
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location', 'facilities']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    },
                    {
                        model: Trip,
                        as: 'trips',
                        attributes: ['tripId', 'trainId', 'departureTime', 'arrivalTime', 'dayOfWeek', 'isActive']
                    }
                ]
            });
            
            if (!route) {
                throw new Error('Route not found');
            }
            
            return route;
        } catch (error) {
            throw error;
        }
    }

    async updateRoute(routeId, updateData) {
        try {
            const route = await Route.findByPk(routeId);
            
            if (!route) {
                throw new Error('Route not found');
            }
            
            const updatedRoute = await route.update(updateData);
            return updatedRoute;
        } catch (error) {
            throw error;
        }
    }

    async deleteRoute(routeId) {
        try {
            const route = await Route.findByPk(routeId);
            
            if (!route) {
                throw new Error('Route not found');
            }
            
            await route.destroy();
            return { message: 'Route deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getActiveRoutes() {
        try {
            return await Route.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ],
                order: [['name', 'ASC']]
            });
        } catch (error) {
            throw error;
        }
    }

    async getRoutesByStation(stationId) {
        try {
            const routes = await Route.findAll({
                where: { isActive: true },
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        where: { stationId },
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ]
                    }
                ]
            });
            
            return routes;
        } catch (error) {
            throw error;
        }
    }

    async findRoutesBetweenStations(originId, destinationId) {
        try {
            const routes = await Route.findAll({
                where: {
                    isActive: true,
                    [Op.or]: [
                        { originId, destinationId },
                        { originId: destinationId, destinationId: originId }
                    ]
                },
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ]
            });
            
            return routes;
        } catch (error) {
            throw error;
        }
    }

    async calculateRouteDistance(routeId) {
        try {
            const route = await Route.findByPk(routeId);
            
            if (!route) {
                throw new Error('Route not found');
            }
            
            return {
                routeId,
                distance: route.distance,
                estimatedDuration: route.duration
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new RouteService();
