const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

const { Fare } = require('../models/index.model');

const PROTO_PATH = path.join(__dirname, '../proto/fare.proto');
let fareProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    fareProto = grpc.loadPackageDefinition(packageDefinition).fare;
    logger.info('Proto file loaded successfully');
} catch (error) {
    logger.error('Error loading proto file:', error);
    throw error;
}

const fareService = {
    async GetFare(call, callback) {
        try {
            const { fareId } = call.request;
            const fare = await Fare.findByPk(fareId);

            if (!fare) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Fare not found'
                });
            }

            callback(null, {
                fareId: fare.fareId,
                routeId: fare.routeId,
                basePrice: fare.basePrice,
                currency: fare.currency,
                isActive: fare.isActive
            });
        } catch (error) {
            logger.error('Error getting fare:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    },

    async ListFares(call, callback) {
        try {
            const { routeId, includeInactive } = call.request;
            
            // Build where clause
            const where = {};
            if (routeId) {
                where.routeId = routeId;
            }
            if (!includeInactive) {
                where.isActive = true;
            }

            const fares = await Fare.findAll({
                where,
                order: [['routeId', 'ASC']]
            });

            const fareResponses = fares.map(fare => ({
                fareId: fare.fareId,
                routeId: fare.routeId,
                basePrice: fare.basePrice,
                currency: fare.currency,
                isActive: fare.isActive
            }));

            callback(null, {
                fares: fareResponses,
                total: fareResponses.length
            });

        } catch (error) {
            logger.error('Error listing fares:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    },

    
};

function startServer() {
    const server = new grpc.Server();
    server.addService(fareProto.FareService.service, fareService);
    
    const port = process.env.TICKET_GRPC_PORT;
    const serverAddress = `0.0.0.0:${port}`;    
    
    server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            logger.error('Failed to bind server:', error);
            throw error;
        }
        
        server.start();
        logger.info(`gRPC server running at ${serverAddress}`);
    });

    return server;
}

module.exports = {
    startServer
};