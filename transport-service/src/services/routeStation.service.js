const { RouteStation, Route, Station } = require('../models/index.model');
const { Op } = require('sequelize');

class RouteStationService {
    async createRouteStation(routeStationData) {
        try {
            const routeStation = await RouteStation.create(routeStationData);
            return routeStation;
        } catch (error) {
            throw error;
        }
    }

    async createMultipleRouteStations(routeStationsData) {
        try {
            const routeStations = await RouteStation.bulkCreate(routeStationsData);
            return routeStations;
        } catch (error) {
            throw error;
        }
    }

    async getAllRouteStations(filters = {}) {
        try {
            const where = {};
            
            if (filters.routeId) {
                where.routeId = filters.routeId;
            }
            
            if (filters.stationId) {
                where.stationId = filters.stationId;
            }

            const routeStations = await RouteStation.findAll({
                where,
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration']
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'openTime', 'closeTime']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations;
        } catch (error) {
            throw error;
        }
    }

    async getRouteStationById(routeStationId) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId, {
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration', 'isActive']
                    },
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities', 'isActive']
                    }
                ]
            });
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            return routeStation;
        } catch (error) {
            throw error;
        }
    }

    async updateRouteStation(routeStationId, updateData) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId);
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            const updatedRouteStation = await routeStation.update(updateData);
            return updatedRouteStation;
        } catch (error) {
            throw error;
        }
    }

    async deleteRouteStation(routeStationId) {
        try {
            const routeStation = await RouteStation.findByPk(routeStationId);
            
            if (!routeStation) {
                throw new Error('RouteStation not found');
            }
            
            await routeStation.destroy();
            return { message: 'RouteStation deleted successfully' };
        } catch (error) {
            throw error;
        }
    }

    async getStationsByRoute(routeId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { routeId },
                include: [
                    {
                        model: Station,
                        attributes: ['stationId', 'name', 'location', 'facilities', 'openTime', 'closeTime', 'isActive']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations.map(rs => ({
                routeStationId: rs.routeStationId,
                sequence: rs.sequence,
                station: rs.Station
            }));
        } catch (error) {
            throw error;
        }
    }

    async getRoutesByStation(stationId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { stationId },
                include: [
                    {
                        model: Route,
                        attributes: ['routeId', 'name', 'originId', 'destinationId', 'distance', 'duration', 'isActive']
                    }
                ],
                order: [['sequence', 'ASC']]
            });
            
            return routeStations.map(rs => ({
                routeStationId: rs.routeStationId,
                sequence: rs.sequence,
                route: rs.Route
            }));
        } catch (error) {
            throw error;
        }
    }

    async setupCompleteRoute(routeId, stationSequences) {
        try {
            // Validate that route exists
            const route = await Route.findByPk(routeId);
            if (!route) {
                throw new Error('Route not found');
            }

            // Validate that all stations exist
            const stationIds = stationSequences.map(item => item.stationId);
            const stations = await Station.findAll({
                where: { stationId: { [Op.in]: stationIds } }
            });

            if (stations.length !== stationIds.length) {
                throw new Error('One or more stations not found');
            }

            // Validate sequence numbers are consecutive
            const sequences = stationSequences.map(item => item.sequence).sort((a, b) => a - b);
            for (let i = 0; i < sequences.length; i++) {
                if (sequences[i] !== i + 1) {
                    throw new Error('Sequences must be consecutive starting from 1');
                }
            }

            // Remove existing route-station associations
            await RouteStation.destroy({ where: { routeId } });

            // Create new associations
            const routeStationsData = stationSequences.map(item => ({
                routeId,
                stationId: item.stationId,
                sequence: item.sequence
            }));

            const createdRouteStations = await RouteStation.bulkCreate(routeStationsData);
            
            return {
                message: 'Route setup completed successfully',
                routeStations: createdRouteStations
            };
        } catch (error) {
            throw error;
        }
    }

    async getRoutePathWithDetails(routeId) {
        try {
            const route = await Route.findByPk(routeId, {
                include: [
                    {
                        model: RouteStation,
                        as: 'stations',
                        include: [
                            {
                                model: Station,
                                attributes: ['stationId', 'name', 'location', 'facilities', 'openTime', 'closeTime']
                            }
                        ],
                        order: [['sequence', 'ASC']]
                    }
                ]
            });

            if (!route) {
                throw new Error('Route not found');
            }

            return {
                routeInfo: {
                    routeId: route.routeId,
                    name: route.name,
                    originId: route.originId,
                    destinationId: route.destinationId,
                    distance: route.distance,
                    duration: route.duration,
                    isActive: route.isActive
                },
                path: route.stations.map(rs => ({
                    sequence: rs.sequence,
                    station: rs.Station
                })),
                totalStations: route.stations.length
            };
        } catch (error) {
            throw error;
        }
    }

    async findRoutesBetweenTwoStations(originStationId, destinationStationId) {
        try {
            // Find routes that contain both stations
            const routesWithOrigin = await RouteStation.findAll({
                where: { stationId: originStationId },
                attributes: ['routeId', 'sequence']
            });

            const routesWithDestination = await RouteStation.findAll({
                where: { stationId: destinationStationId },
                attributes: ['routeId', 'sequence']
            });

            // Find common routes
            const commonRoutes = routesWithOrigin.filter(origin => 
                routesWithDestination.some(dest => 
                    dest.routeId === origin.routeId && dest.sequence > origin.sequence
                )
            );

            if (commonRoutes.length === 0) {
                return [];
            }

            // Get full route details for common routes
            const routeIds = commonRoutes.map(route => route.routeId);
            const routes = await Route.findAll({
                where: { 
                    routeId: { [Op.in]: routeIds },
                    isActive: true
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

            return routes.map(route => {
                const originStation = route.stations.find(rs => rs.stationId === originStationId);
                const destinationStation = route.stations.find(rs => rs.stationId === destinationStationId);
                
                return {
                    routeInfo: {
                        routeId: route.routeId,
                        name: route.name,
                        distance: route.distance,
                        duration: route.duration
                    },
                    originSequence: originStation.sequence,
                    destinationSequence: destinationStation.sequence,
                    stationsBetween: route.stations.filter(rs => 
                        rs.sequence >= originStation.sequence && rs.sequence <= destinationStation.sequence
                    )
                };
            });
        } catch (error) {
            throw error;
        }
    }

    async validateRouteSequence(routeId) {
        try {
            const routeStations = await RouteStation.findAll({
                where: { routeId },
                order: [['sequence', 'ASC']]
            });

            if (routeStations.length === 0) {
                return { valid: false, message: 'No stations found for this route' };
            }

            // Check if sequences are consecutive starting from 1
            for (let i = 0; i < routeStations.length; i++) {
                if (routeStations[i].sequence !== i + 1) {
                    return { 
                        valid: false, 
                        message: `Invalid sequence at position ${i + 1}. Expected ${i + 1}, found ${routeStations[i].sequence}` 
                    };
                }
            }

            return { 
                valid: true, 
                message: 'Route sequence is valid',
                totalStations: routeStations.length
            };
        } catch (error) {
            throw error;
        }
    }

    async reorderRouteStations(routeId, newSequences) {
        try {
            // Validate input
            const routeStations = await RouteStation.findAll({ where: { routeId } });
            
            if (routeStations.length !== newSequences.length) {
                throw new Error('Number of sequences must match existing route stations');
            }

            // Update sequences
            const updatePromises = newSequences.map(item => 
                RouteStation.update(
                    { sequence: item.sequence },
                    { where: { routeStationId: item.routeStationId, routeId } }
                )
            );

            await Promise.all(updatePromises);

            // Validate the new sequence
            const validation = await this.validateRouteSequence(routeId);
            
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            return { 
                message: 'Route stations reordered successfully',
                validation
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new RouteStationService();
