const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

const { Fare, TransitPass } = require('../models/index.model');

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
                fareId: fare.id,
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

    async GetTransitPass(call, callback) {
        try {
            const { transitPassId } = call.request;
            const transitPass = await TransitPass.findByPk(transitPassId);

            if (!transitPass) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Transit pass not found'
                });
            }

            callback(null, {
                transitPassId: transitPass.id,
                transitPassType: transitPass.type,
                price: transitPass.price,
                currency: transitPass.currency,
                isActive: transitPass.isActive
            });
        } catch (error) {
            logger.error('Error getting transit pass:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    }
};

function startServer() {
    const server = new grpc.Server();
    server.addService(fareProto.FareService.service, fareService);
    
    const port = process.env.FARE_GRPC_PORT;
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