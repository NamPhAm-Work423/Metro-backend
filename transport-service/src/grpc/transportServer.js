const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

// Import models
const { Route, Station, Trip, RouteStation } = require('../models/index.model');

// Load the protobuf
const PROTO_PATH = path.join(__dirname, '../proto/transport.proto');
let transportProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    transportProto = grpc.loadPackageDefinition(packageDefinition).transport;
    logger.info('Proto file loaded successfully');
} catch (error) {
    logger.error('Error loading proto file:', error);
    throw error;
}

// Service implementation
const transportService = {
    async GetRoute(call, callback) {
        try {
            const { routeId } = call.request;
            const route = await Route.findByPk(routeId, {
                include: [
                    { model: Station, as: 'origin' },
                    { model: Station, as: 'destination' }
                ]
            });

            if (!route) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Route not found'
                });
            }

            const response = {
                routeId: route.routeId,
                name: route.name,
                originId: route.originId,
                destinationId: route.destinationId,
                distance: route.distance,
                duration: route.duration,
                isActive: route.isActive,
                origin: route.origin ? {
                    stationId: route.origin.stationId,
                    name: route.origin.name,
                    location: route.origin.location,
                    latitude: route.origin.latitude,
                    longitude: route.origin.longitude,
                    isActive: route.origin.isActive
                } : null,
                destination: route.destination ? {
                    stationId: route.destination.stationId,
                    name: route.destination.name,
                    location: route.destination.location,
                    latitude: route.destination.latitude,
                    longitude: route.destination.longitude,
                    isActive: route.destination.isActive
                } : null
            };

            callback(null, response);
        } catch (error) {
            logger.error('GetRoute error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    async GetStation(call, callback) {
        try {
            const { stationId } = call.request;
            const station = await Station.findByPk(stationId);

            if (!station) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Station not found'
                });
            }

            const response = {
                stationId: station.stationId,
                name: station.name,
                location: station.location,
                latitude: station.latitude,
                longitude: station.longitude,
                isActive: station.isActive
            };

            callback(null, response);
        } catch (error) {
            logger.error('GetStation error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    async GetTrip(call, callback) {
        try {
            const { tripId } = call.request;
            const trip = await Trip.findByPk(tripId, {
                include: [
                    { 
                        model: Route, 
                        as: 'route',
                        include: [
                            { model: Station, as: 'origin' },
                            { model: Station, as: 'destination' }
                        ]
                    }
                ]
            });

            if (!trip) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Trip not found'
                });
            }

            const response = {
                tripId: trip.tripId,
                routeId: trip.routeId,
                trainId: trip.trainId,
                departureTime: trip.departureTime || '',
                arrivalTime: trip.arrivalTime || '',
                dayOfWeek: trip.dayOfWeek || '',
                isActive: trip.isActive,
                route: trip.route ? {
                    routeId: trip.route.routeId,
                    name: trip.route.name,
                    originId: trip.route.originId,
                    destinationId: trip.route.destinationId,
                    distance: trip.route.distance,
                    duration: trip.route.duration,
                    isActive: trip.route.isActive,
                    origin: trip.route.origin ? {
                        stationId: trip.route.origin.stationId,
                        name: trip.route.origin.name,
                        location: trip.route.origin.location,
                        latitude: trip.route.origin.latitude,
                        longitude: trip.route.origin.longitude,
                        isActive: trip.route.origin.isActive
                    } : null,
                    destination: trip.route.destination ? {
                        stationId: trip.route.destination.stationId,
                        name: trip.route.destination.name,
                        location: trip.route.destination.location,
                        latitude: trip.route.destination.latitude,
                        longitude: trip.route.destination.longitude,
                        isActive: trip.route.destination.isActive
                    } : null
                } : null
            };

            callback(null, response);
        } catch (error) {
            logger.error('GetTrip error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    async GetRoutesByStations(call, callback) {
        try {
            const { originStationId, destinationStationId } = call.request;
            const routes = await Route.findAll({
                where: {
                    originId: originStationId,
                    destinationId: destinationStationId,
                    isActive: true
                },
                include: [
                    { model: Station, as: 'origin' },
                    { model: Station, as: 'destination' }
                ]
            });

            const response = {
                routes: routes.map(route => ({
                    routeId: route.routeId,
                    name: route.name,
                    originId: route.originId,
                    destinationId: route.destinationId,
                    distance: route.distance,
                    duration: route.duration,
                    isActive: route.isActive,
                    origin: route.origin ? {
                        stationId: route.origin.stationId,
                        name: route.origin.name,
                        location: route.origin.location,
                        latitude: route.origin.latitude,
                        longitude: route.origin.longitude,
                        isActive: route.origin.isActive
                    } : null,
                    destination: route.destination ? {
                        stationId: route.destination.stationId,
                        name: route.destination.name,
                        location: route.destination.location,
                        latitude: route.destination.latitude,
                        longitude: route.destination.longitude,
                        isActive: route.destination.isActive
                    } : null
                }))
            };

            callback(null, response);
        } catch (error) {
            logger.error('GetRoutesByStations error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    async ListRoutes(call, callback) {
        try {
            const routes = await Route.findAll({
                where: { isActive: true },
                include: [
                    { model: Station, as: 'origin' },
                    { model: Station, as: 'destination' }
                ]
            });

            const response = {
                routes: routes.map(route => ({
                    routeId: route.routeId,
                    name: route.name,
                    originId: route.originId,
                    destinationId: route.destinationId,
                    distance: route.distance,
                    duration: route.duration,
                    isActive: route.isActive,
                    origin: route.origin ? {
                        stationId: route.origin.stationId,
                        name: route.origin.name,
                        location: route.origin.location,
                        latitude: route.origin.latitude,
                        longitude: route.origin.longitude,
                        isActive: route.origin.isActive
                    } : null,
                    destination: route.destination ? {
                        stationId: route.destination.stationId,
                        name: route.destination.name,
                        location: route.destination.location,
                        latitude: route.destination.latitude,
                        longitude: route.destination.longitude,
                        isActive: route.destination.isActive
                    } : null
                }))
            };

            callback(null, response);
        } catch (error) {
            logger.error('ListRoutes error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Get all stations for a specific route ordered by sequence
     */
    async GetRouteStations(call, callback) {
        try {
            const { routeId } = call.request;

            const routeStations = await RouteStation.findAll({
                where: { routeId },
                include: [{ model: Station }],
                order: [['sequence', 'ASC']]
            });

            const response = {
                routeStations: routeStations.map(rs => ({
                    routeStationId: rs.routeStationId,
                    routeId: rs.routeId,
                    stationId: rs.stationId,
                    sequence: rs.sequence,
                    station: rs.Station ? {
                        stationId: rs.Station.stationId,
                        name: rs.Station.name,
                        location: rs.Station.location,
                        latitude: rs.Station.latitude,
                        longitude: rs.Station.longitude,
                        isActive: rs.Station.isActive
                    } : null
                }))
            };

            callback(null, response);
        } catch (error) {
            logger.error('GetRouteStations error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Calculate number of stations between origin and destination on a route
     */
    async CalculateStationCount(call, callback) {
        try {
            const { routeId, originStationId, destinationStationId } = call.request;

            const routeStations = await RouteStation.findAll({
                where: { routeId },
                attributes: ['stationId', 'sequence'],
                order: [['sequence', 'ASC']]
            });

            const origin = routeStations.find(rs => rs.stationId === originStationId);
            const destination = routeStations.find(rs => rs.stationId === destinationStationId);

            if (!origin || !destination) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Origin or destination station not found on this route'
                });
            }

            const stationCount = Math.abs(destination.sequence - origin.sequence) + 1;

            callback(null, {
                stationCount,
                routeId,
                originStationId,
                destinationStationId
            });
        } catch (error) {
            logger.error('CalculateStationCount error:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    }
};

function startGrpcServer() {
    try {
        logger.info('Creating gRPC server...');
        const server = new grpc.Server();
        
        logger.info('Adding service to gRPC server...');
        server.addService(transportProto.TransportService.service, transportService);

        const port = process.env.TRANSPORT_GRPC_PORT;
        logger.info(`Attempting to bind gRPC server to port ${port}...`);
        
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
            if (err) {
                logger.error('Failed to start gRPC server:', err);
                return;
            }
            logger.info(`Transport gRPC server running on port ${boundPort}`);
            server.start();
        });

        return server;
    } catch (error) {
        logger.error('Error starting gRPC server:', error);
        throw error;
    }
}

module.exports = { startGrpcServer }; 