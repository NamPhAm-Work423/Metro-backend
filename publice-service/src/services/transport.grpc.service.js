const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');
const { config } = require('../config');

class TransportGrpcService {
    constructor() {
        this.retries = config.services.transport.retries;
        this.retryDelayMs = config.services.transport.retryDelayMs;
        this.client = null;
        this.initializeClient();
    }

    /**
     * Initialize gRPC client with protobuf definition
     */
    initializeClient() {
        try {
            const PROTO_PATH = path.resolve(__dirname, '../../../transport-service/src/proto/transport.proto');
            
            const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                keepCase: true,
                longs: String,
                enums: String,
                defaults: true,
                oneofs: true
            });

            const transportProto = grpc.loadPackageDefinition(packageDefinition).transport;
            
            this.client = new transportProto.TransportService(
                config.services.transport.grpcUrl || 'localhost:50051',
                grpc.credentials.createInsecure()
            );

            logger.info('gRPC client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize gRPC client', { error: error.message });
            throw error;
        }
    }

    /**
     * Retry wrapper for gRPC calls
     */
    async retryCall(fn, retries = this.retries) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                logger.warn(`Transport gRPC call failed (attempt ${attempt}/${retries})`, {
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
     * Convert gRPC callback to Promise
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
     * Fetch all routes from transport service
     */
    async fetchAllRoutes() {
        logger.info('Fetching all routes via gRPC');
        
        try {
            const response = await this.retryCall(() => 
                this.promisify(this.client.ListRoutes, {})
            );

            const routes = response.routes || [];
            logger.info('Successfully fetched routes via gRPC', { 
                count: routes.length 
            });

            return routes;
        } catch (error) {
            logger.error('Failed to fetch routes via gRPC', {
                error: error.message,
                code: error.code
            });
            throw new Error(`Failed to fetch routes: ${error.message}`);
        }
    }

    /**
     * Fetch specific route by ID
     */
    async fetchRouteById(routeId) {
        logger.info('Fetching route by ID via gRPC', { routeId });
        
        try {
            const response = await this.retryCall(() => 
                this.promisify(this.client.GetRoute, { routeId })
            );

            logger.info('Successfully fetched route via gRPC', { routeId });
            return response;
        } catch (error) {
            logger.error('Failed to fetch route via gRPC', {
                routeId,
                error: error.message,
                code: error.code
            });
            throw new Error(`Failed to fetch route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch stations for a specific route
     */
    async fetchRouteStations(routeId) {
        logger.info('Fetching stations for route via gRPC', { routeId });
        
        try {
            const response = await this.retryCall(() => 
                this.promisify(this.client.GetRouteStations, { routeId })
            );

            const stations = response.routeStations || [];
            logger.info('Successfully fetched route stations via gRPC', { 
                routeId,
                count: stations.length 
            });

            return stations;
        } catch (error) {
            logger.error('Failed to fetch route stations via gRPC', {
                routeId,
                error: error.message,
                code: error.code
            });
            throw new Error(`Failed to fetch stations for route ${routeId}: ${error.message}`);
        }
    }

    /**
     * Fetch all transport data in parallel
     */
    async fetchAllTransportData() {
        logger.info('Fetching all transport data via gRPC');
        
        try {
            const [routes, routeStations] = await Promise.all([
                this.fetchAllRoutes(),
                // Note: We'll collect route stations for each route
                this.fetchAllRoutes().then(routes => 
                    Promise.all(routes.map(route => 
                        this.fetchRouteStations(route.routeId)
                    ))
                )
            ]);

            const data = {
                routes,
                routeStations: routeStations.flat(),
                fetchedAt: new Date().toISOString()
            };

            logger.info('Successfully fetched all transport data via gRPC', {
                routesCount: routes.length,
                routeStationsCount: data.routeStations.length
            });

            return data;
        } catch (error) {
            logger.error('Failed to fetch transport data via gRPC', { error: error.message });
            throw error;
        }
    }

    /**
     * Check transport service health via gRPC
     */
    async checkHealth() {
        try {
            // Try to list routes as a health check
            await this.fetchAllRoutes();
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
     * Get service configuration for debugging
     */
    getConfig() {
        return {
            grpcUrl: config.services.transport.grpcUrl || 'localhost:50051',
            retries: this.retries,
            retryDelayMs: this.retryDelayMs
        };
    }
}

module.exports = TransportGrpcService; 