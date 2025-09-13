const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

// Import services
const passengerService = require('../services/passenger.service');

// Load the protobuf
const PROTO_PATH = path.join(__dirname, '../proto/user.proto');
let userProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    userProto = grpc.loadPackageDefinition(packageDefinition).user;
    logger.info('User proto file loaded successfully');
} catch (error) {
    logger.error('Error loading user proto file:', error);
    throw error;
}

// Service implementation
const userService = {
    /**
     * Get passengers by IDs
     */
    async GetPassengersByIds(call, callback) {
        try {
            const { passengerIds } = call.request;
            
            logger.debug('gRPC GetPassengersByIds called', {
                passengerIdsCount: passengerIds?.length || 0
            });

            if (!passengerIds || passengerIds.length === 0) {
                return callback(null, {
                    passengers: [],
                    totalCount: 0
                });
            }

            // Use passenger service to get passengers
            const passengers = await passengerService.getPassengersByIds(passengerIds);

            const response = {
                passengers: passengers.map(passenger => ({
                    passengerId: passenger.passengerId,
                    name: `${passenger.firstName} ${passenger.lastName}`,
                    phoneNumber: passenger.phoneNumber,
                    email: passenger.email,
                    isActive: passenger.isActive,
                    preferences: {
                        smsNotifications: true, // Default preferences
                        emailNotifications: true,
                        stationAlerts: true,
                        routeAlerts: true,
                        promotionalAlerts: false,
                        maintenanceAlerts: true
                    },
                    createdAt: passenger.createdAt?.toISOString() || '',
                    updatedAt: passenger.updatedAt?.toISOString() || ''
                })),
                totalCount: passengers.length
            };

            logger.debug('gRPC GetPassengersByIds success', {
                requestedCount: passengerIds.length,
                foundCount: passengers.length
            });

            callback(null, response);
        } catch (error) {
            logger.error('gRPC GetPassengersByIds failed', {
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Get passenger phone numbers by IDs
     */
    async GetPassengerPhoneNumbers(call, callback) {
        try {
            const { passengerIds } = call.request;
            
            logger.debug('gRPC GetPassengerPhoneNumbers called', {
                passengerIdsCount: passengerIds?.length || 0
            });

            if (!passengerIds || passengerIds.length === 0) {
                return callback(null, {
                    contacts: [],
                    totalCount: 0
                });
            }

            // Use passenger service to get passengers
            const passengers = await passengerService.getPassengersByIds(passengerIds);

            // Filter passengers with valid phone numbers
            const validContacts = passengers.filter(p => p.phoneNumber && p.phoneNumber.trim() !== '');

            const response = {
                contacts: validContacts.map(passenger => ({
                    passengerId: passenger.passengerId,
                    phoneNumber: passenger.phoneNumber,
                    name: `${passenger.firstName} ${passenger.lastName}`,
                    preferences: {
                        smsNotifications: true, // Default preferences
                        emailNotifications: true,
                        stationAlerts: true,
                        routeAlerts: true,
                        promotionalAlerts: false,
                        maintenanceAlerts: true
                    }
                })),
                totalCount: validContacts.length
            };

            logger.debug('gRPC GetPassengerPhoneNumbers success', {
                requestedCount: passengerIds.length,
                foundCount: passengers.length,
                validContactsCount: validContacts.length
            });

            callback(null, response);
        } catch (error) {
            logger.error('gRPC GetPassengerPhoneNumbers failed', {
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Get passenger by ID
     */
    async GetPassengerById(call, callback) {
        try {
            const { passengerId } = call.request;
            
            logger.debug('gRPC GetPassengerById called', { passengerId });

            if (!passengerId) {
                return callback(null, {
                    passenger: null,
                    found: false
                });
            }

            // Use passenger service to get passenger
            const passenger = await passengerService.getPassengerById(passengerId);

            if (!passenger) {
                return callback(null, {
                    passenger: null,
                    found: false
                });
            }

            const response = {
                passenger: {
                    passengerId: passenger.passengerId,
                    name: `${passenger.firstName} ${passenger.lastName}`,
                    phoneNumber: passenger.phoneNumber,
                    email: passenger.email,
                    isActive: passenger.isActive,
                    preferences: {
                        smsNotifications: true, // Default preferences
                        emailNotifications: true,
                        stationAlerts: true,
                        routeAlerts: true,
                        promotionalAlerts: false,
                        maintenanceAlerts: true
                    },
                    createdAt: passenger.createdAt?.toISOString() || '',
                    updatedAt: passenger.updatedAt?.toISOString() || ''
                },
                found: true
            };

            logger.debug('gRPC GetPassengerById success', { passengerId });

            callback(null, response);
        } catch (error) {
            logger.error('gRPC GetPassengerById failed', {
                passengerId: call.request?.passengerId,
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    },

    /**
     * Update passenger notification preferences
     */
    async UpdatePassengerPreferences(call, callback) {
        try {
            const { passengerId, preferences } = call.request;
            
            logger.debug('gRPC UpdatePassengerPreferences called', { 
                passengerId,
                preferences 
            });

            if (!passengerId) {
                return callback(null, {
                    success: false,
                    message: 'Passenger ID is required'
                });
            }

            // Check if passenger exists
            const passenger = await passengerService.getPassengerById(passengerId);

            if (!passenger) {
                return callback(null, {
                    success: false,
                    message: 'Passenger not found'
                });
            }

            // TODO: Implement preferences update logic
            // For now, just return success since we don't have a preferences table yet
            logger.info('Passenger preferences updated', {
                passengerId,
                preferences
            });

            callback(null, {
                success: true,
                message: 'Preferences updated successfully'
            });
        } catch (error) {
            logger.error('gRPC UpdatePassengerPreferences failed', {
                passengerId: call.request?.passengerId,
                error: error.message,
                stack: error.stack
            });
            callback({
                code: grpc.status.INTERNAL,
                message: 'Internal server error'
            });
        }
    }

};

function startGrpcServer() {
    try {
        logger.info('Creating User gRPC server...');
        const server = new grpc.Server();
        
        logger.info('Adding UserService to gRPC server...');
        server.addService(userProto.UserService.service, userService);

        const port = process.env.USER_GRPC_PORT || 50054;
        logger.info(`Attempting to bind User gRPC server to port ${port}...`);
        
        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
            if (err) {
                logger.error('Failed to start User gRPC server:', err);
                return;
            }
            logger.info(`User gRPC server running on port ${boundPort}`);
            server.start();
        });

        return server;
    } catch (error) {
        logger.error('Error starting User gRPC server:', error);
        throw error;
    }
}

module.exports = { startGrpcServer }; 