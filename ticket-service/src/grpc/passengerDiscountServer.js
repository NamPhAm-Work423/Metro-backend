const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

const PassengerDiscount = require('../models/passengerDiscount.model');

const PROTO_PATH = path.join(__dirname, '../proto/passengerDiscount.proto');
let discountProto;

try {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    discountProto = grpc.loadPackageDefinition(packageDefinition).passengerdiscount;
    logger.info('PassengerDiscount proto loaded successfully');
} catch (error) {
    logger.error('Error loading passenger discount proto file:', error);
    throw error;
}

const passengerDiscountService = {
    async GetPassengerDiscount(call, callback) {
        try {
            const { discountId } = call.request;
            const discount = await PassengerDiscount.findByPk(discountId);

            if (!discount) {
                return callback({
                    code: grpc.status.NOT_FOUND,
                    message: 'Passenger discount not found'
                });
            }

            callback(null, {
                discountId: discount.discountId,
                passengerType: discount.passengerType,
                discountType: discount.discountType,
                discountValue: Number(discount.discountValue),
                description: discount.description || '',
                isActive: discount.isActive,
                validFrom: discount.validFrom?.toISOString() || '',
                validUntil: discount.validUntil ? discount.validUntil.toISOString() : ''
            });
        } catch (error) {
            logger.error('Error getting passenger discount:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    },

    async ListPassengerDiscounts(call, callback) {
        try {
            const { passengerType, includeInactive, onlyCurrentlyValid } = call.request;

            const where = {};
            if (passengerType) where.passengerType = passengerType.toLowerCase();
            if (!includeInactive) where.isActive = true;

            const discounts = await PassengerDiscount.findAll({ where, order: [['passengerType', 'ASC']] });

            const now = new Date();
            const filtered = onlyCurrentlyValid
                ? discounts.filter(d => {
                    const validFrom = d.validFrom || new Date(0);
                    const validUntil = d.validUntil || null;
                    return d.isActive && validFrom <= now && (validUntil === null || validUntil >= now);
                })
                : discounts;

            const responses = filtered.map(d => ({
                discountId: d.discountId,
                passengerType: d.passengerType,
                discountType: d.discountType,
                discountValue: Number(d.discountValue),
                description: d.description || '',
                isActive: d.isActive,
                validFrom: d.validFrom?.toISOString() || '',
                validUntil: d.validUntil ? d.validUntil.toISOString() : ''
            }));

            callback(null, { discounts: responses, total: responses.length });
        } catch (error) {
            logger.error('Error listing passenger discounts:', error);
            callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
        }
    }
};

function startPassengerDiscountServer() {
    const server = new grpc.Server();
    server.addService(discountProto.PassengerDiscountService.service, passengerDiscountService);

    const port = process.env.TICKET_GRPC_PORT;
    const serverAddress = `0.0.0.0:${port}`;

    server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error) => {
        if (error) {
            logger.error('Failed to bind PassengerDiscount server:', error);
            throw error;
        }

        server.start();
        logger.info(`PassengerDiscount gRPC server running at ${serverAddress}`);
    });

    return server;
}

module.exports = { startPassengerDiscountServer };


