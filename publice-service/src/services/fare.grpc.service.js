const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');
const { config } = require('../config');

class FareGrpcService {
    constructor() {
        this.retries = config.services.ticket.retries;
        this.retryDelayMs = config.services.ticket.retryDelayMs;
        this.client = null;
        this.initializeClient();
    }

    /**
     * Initialize gRPC client with fare.proto definition
     */
    initializeClient() {
        try {
            const PROTO_PATH = path.resolve(__dirname, '../../../ticket-service/src/proto/fare.proto');
            const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });

            const fareProto = grpc.loadPackageDefinition(packageDefinition).fare;

            this.client = new fareProto.FareService(
                config.services.ticket.grpcUrl || 'localhost:50052',
                grpc.credentials.createInsecure()
            );

            logger.info('Fare gRPC client initialized');
        } catch (error) {
            logger.error('Failed to initialize Fare gRPC client', { error: error.message });
            throw error;
        }
    }

    /**
     * Generic retry wrapper for gRPC calls
     */
    async retryCall(fn, retries = this.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                logger.warn(`Fare gRPC call failed (attempt ${attempt}/${retries})`, {
                    error: error.message,
                    attempt,
                    retries
                });

                if (attempt === retries) {
                    throw error;
                }

                // Exponential backoff
                const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Convert gRPC callback style to Promise
     */
    promisify(method, request) {
        return new Promise((resolve, reject) => {
            method.call(this.client, request, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Fetch all fares via gRPC
     */
    async fetchAllFares(includeInactive = true) {
        logger.info('Fetching all fares via gRPC');
        try {
            const response = await this.retryCall(() =>
                this.promisify(this.client.ListFares, { includeInactive })
            );
            const fares = response.fares || [];
            logger.info('Successfully fetched fares via gRPC', { count: fares.length });
            return fares;
        } catch (error) {
            logger.error('Failed to fetch fares via gRPC', { error: error.message, code: error.code });
            throw new Error(`Failed to fetch fares: ${error.message}`);
        }
    }

    /**
     * Fetch fares by routeId via gRPC
     */
    async fetchFaresByRoute(routeId, includeInactive = true) {
        logger.info('Fetching fares by route via gRPC', { routeId });
        try {
            const response = await this.retryCall(() =>
                this.promisify(this.client.ListFares, { routeId, includeInactive })
            );
            const fares = response.fares || [];
            logger.info('Successfully fetched fares for route via gRPC', { routeId, count: fares.length });
            return fares;
        } catch (error) {
            logger.error('Failed to fetch fares for route via gRPC', { routeId, error: error.message, code: error.code });
            throw new Error(`Failed to fetch fares for route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch all transit passes via gRPC
     */
    async fetchAllTransitPasses(includeInactive = true) {
        logger.info('Fetching all transit passes via gRPC');
        try {
            const response = await this.retryCall(() =>
                this.promisify(this.client.ListTransitPasses, { includeInactive })
            );
            const passes = response.transitPasses || [];
            logger.info('Successfully fetched transit passes via gRPC', { count: passes.length });
            return passes;
        } catch (error) {
            logger.error('Failed to fetch transit passes via gRPC', { error: error.message, code: error.code });
            throw new Error(`Failed to fetch transit passes: ${error.message}`);
        }
    }

    /**
     * Fetch fares and transit passes in parallel
     */
    async fetchAllTicketData() {
        logger.info('Fetching all ticket data via gRPC');
        try {
            const [fares, transitPasses] = await Promise.all([
                this.fetchAllFares(),
                this.fetchAllTransitPasses()
            ]);

            const data = {
                fares,
                transitPasses,
                fetchedAt: new Date().toISOString()
            };

            logger.info('Successfully fetched all ticket data via gRPC', {
                faresCount: fares.length,
                transitPassesCount: transitPasses.length
            });

            return data;
        } catch (error) {
            logger.error('Failed to fetch ticket data via gRPC', { error: error.message });
            throw error;
        }
    }

    /**
     * Simple health check by attempting to list fares
     */
    async checkHealth() {
        try {
            await this.fetchAllFares(false);
            return {
                status: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Expose configuration for debugging
     */
    getConfig() {
        return {
            grpcUrl: config.services.ticket.grpcUrl || 'localhost:50052',
            retries: this.retries,
            retryDelayMs: this.retryDelayMs
        };
    }
}

module.exports = FareGrpcService; 