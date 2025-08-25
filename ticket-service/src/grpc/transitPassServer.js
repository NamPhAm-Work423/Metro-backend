const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

const TransitPass = require('../models/transitPass.model');

const PROTO_PATH = path.join(__dirname, '../proto/transitPass.proto');
let transitPassProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    transitPassProto = grpc.loadPackageDefinition(packageDefinition).transitpass;
    logger.info('TransitPass proto loaded successfully');
} catch (error) {
    logger.error('Error loading transit pass proto file:', error);
    throw error;
}

const transitPassService = {
    async GetTransitPass(call, callback) {
        try {
            const { transitPassId } = call.request;
            const tp = await TransitPass.findByPk(transitPassId);

            if (!tp) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Transit pass not found'
                });
            }

            callback(null, {
                transitPassId: tp.transitPassId,
                transitPassType: tp.transitPassType,
                price: Number(tp.price),
                currency: tp.currency,
                isActive: tp.isActive
            });
        } catch (error) {
            logger.error('Error getting transit pass:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    },

    async ListTransitPasses(call, callback) {
        try {
            const { transitPassType, includeInactive } = call.request;

            const where = {};
            if (transitPassType) where.transitPassType = transitPassType;
            if (!includeInactive) where.isActive = true;

            const tps = await TransitPass.findAll({ where, order: [['transitPassType', 'ASC']] });

            const responses = tps.map(tp => ({
                transitPassId: tp.transitPassId,
                transitPassType: tp.transitPassType,
                price: Number(tp.price),
                currency: tp.currency,
                isActive: tp.isActive
            }));

            callback(null, { transitPasses: responses, total: responses.length });
        } catch (error) {
            logger.error('Error listing transit passes:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    }
};

function startTransitPassServer() {
    const server = new grpc.Server();
    server.addService(transitPassProto.TransitPassService.service, transitPassService);

    const port = process.env.TICKET_GRPC_PORT;
    const serverAddress = `0.0.0.0:${port}`;

    server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error) => {
        if (error) {
            logger.error('Failed to bind TransitPass server:', error);
            throw error;
        }

        server.start();
        logger.info(`TransitPass gRPC server running at ${serverAddress}`);
    });

    return server;
}

module.exports = { startTransitPassServer };


