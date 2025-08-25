const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

const { Fare } = require('../models/index.model');
const PassengerDiscount = require('../models/passengerDiscount.model');
const TransitPass = require('../models/transitPass.model');

function loadProto(relativePath) {
    const protoPath = path.join(__dirname, relativePath);
    const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });
    return grpc.loadPackageDefinition(packageDefinition);
}

async function buildFareService() {
    return {
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

                callback(null, { fares: fareResponses, total: fareResponses.length });
            } catch (error) {
                logger.error('Error listing fares:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        },
    };
}

async function buildPassengerDiscountService() {
    return {
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
}

async function buildTransitPassService() {
    return {
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
}

async function startCombinedGrpcServer() {
    try {
        // Load protos
        const farePkg = loadProto('../proto/fare.proto').fare;
        const discountPkg = loadProto('../proto/passengerDiscount.proto').passengerdiscount;
        const transitPassPkg = loadProto('../proto/transitPass.proto').transitpass;

        // Build services
        const fareService = await buildFareService();
        const passengerDiscountService = await buildPassengerDiscountService();
        const transitPassService = await buildTransitPassService();

        // Create and bind server once
        const server = new grpc.Server();
        server.addService(farePkg.FareService.service, fareService);
        server.addService(discountPkg.PassengerDiscountService.service, passengerDiscountService);
        server.addService(transitPassPkg.TransitPassService.service, transitPassService);

        const port = process.env.TICKET_GRPC_PORT;
        const serverAddress = `0.0.0.0:${port}`;

        await new Promise((resolve, reject) => {
            server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error) => {
                if (error) {
                    logger.error('Failed to bind combined gRPC server:', error);
                    reject(error);
                    return;
                }
                server.start();
                logger.info(`Combined Ticket gRPC server running at ${serverAddress}`);
                resolve();
            });
        });

        return server;
    } catch (error) {
        logger.error('Error starting combined gRPC server:', { error: error.message, stack: error.stack });
        throw error;
    }
}

module.exports = { startCombinedGrpcServer };


