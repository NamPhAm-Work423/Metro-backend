const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

// Copy transport.proto from transport-service
const PROTO_PATH = path.join(__dirname, '../proto/transport.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const transportProto = grpc.loadPackageDefinition(packageDefinition).transport;

// Create client
// Resolve gRPC target: allow both combined URL or separate host/port env vars
let TRANSPORT_SERVICE_URL = process.env.TRANSPORT_GRPC_URL;

if (!TRANSPORT_SERVICE_URL || TRANSPORT_SERVICE_URL.trim() === '') {
    const host = process.env.TRANSPORT_GRPC_HOST || 'transport-service';
    const port = process.env.TRANSPORT_GRPC_PORT || '50051';
    TRANSPORT_SERVICE_URL = `${host}:${port}`;
}

// Log gRPC configuration for debugging
logger.info('gRPC Transport Client Configuration', {
    TRANSPORT_SERVICE_URL: TRANSPORT_SERVICE_URL,
    PROTO_PATH,
    serviceAvailable: !!transportProto.TransportService
});

const transportClient = new transportProto.TransportService(
    TRANSPORT_SERVICE_URL,
    grpc.credentials.createInsecure()
);

// Utility function to sleep
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper for gRPC calls
async function retryGrpcCall(operation, maxRetries = 5, delayMs = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await operation();
            return result;
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error(`gRPC call failed after ${maxRetries} attempts:`, {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    transportUrl: TRANSPORT_SERVICE_URL
                });
                throw error;
            }
            
            if (error.code === grpc.status.UNAVAILABLE || 
                error.message.includes('Name resolution failed') ||
                error.message.includes('UNAVAILABLE') ||
                error.message.includes('ECONNREFUSED')) {
                logger.warn(`gRPC call attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`, {
                    error: error.message,
                    code: error.code,
                    transportUrl: TRANSPORT_SERVICE_URL,
                    attempt,
                    maxRetries
                });
                await sleep(delayMs);
                delayMs *= 1.5; // Exponential backoff
            } else {
                // For other errors, don't retry
                logger.error('gRPC call failed with non-retryable error:', {
                    error: error.message,
                    code: error.code,
                    transportUrl: TRANSPORT_SERVICE_URL
                });
                throw error;
            }
        }
    }
}

class TransportClient {
    static async getRoute(routeId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.GetRoute({ routeId }, (error, response) => {
                    if (error) {
                        logger.error('Transport GetRoute error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async getStation(stationId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.GetStation({ stationId }, (error, response) => {
                    if (error) {
                        logger.error('Transport GetStation error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async getTrip(tripId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.GetTrip({ tripId }, (error, response) => {
                    if (error) {
                        logger.error('Transport GetTrip error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async getRoutesByStations(originStationId, destinationStationId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.GetRoutesByStations({ 
                    originStationId, 
                    destinationStationId 
                }, (error, response) => {
                    if (error) {
                        logger.error('Transport GetRoutesByStations error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async getAllRoutes() {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.ListRoutes({}, (error, response) => {
                    if (error) {
                        logger.error('Transport ListRoutes error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async getRouteStations(routeId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.GetRouteStations({ routeId }, (error, response) => {
                    if (error) {
                        logger.error('Transport GetRouteStations error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    static async calculateStationCount(routeId, originStationId, destinationStationId) {
        return retryGrpcCall(() => {
            return new Promise((resolve, reject) => {
                transportClient.CalculateStationCount({ 
                    routeId, 
                    originStationId, 
                    destinationStationId 
                }, (error, response) => {
                    if (error) {
                        logger.error('Transport CalculateStationCount error:', error);
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    // Health check method to test connectivity
    static async isTransportServiceReady() {
        try {
            logger.info('Testing transport service connectivity...', {
                transportUrl: TRANSPORT_SERVICE_URL
            });

            await retryGrpcCall(() => {
                return new Promise((resolve, reject) => {
                    transportClient.ListRoutes({}, (error, response) => {
                        if (error) {
                            logger.debug('Transport service health check failed:', {
                                error: error.message,
                                code: error.code,
                                transportUrl: TRANSPORT_SERVICE_URL
                            });
                            reject(error);
                        } else {
                            logger.info('Transport service health check successful', {
                                routeCount: response?.routes?.length || 0,
                                transportUrl: TRANSPORT_SERVICE_URL
                            });
                            resolve(response);
                        }
                    });
                });
            }, 3, 1000); // Fewer retries for health check
            
            logger.info('Transport service is ready and accessible');
            return true;
        } catch (error) {
            logger.error('Transport service is not available:', {
                error: error.message,
                code: error.code,
                transportUrl: TRANSPORT_SERVICE_URL,
                suggestion: 'Check if transport-service is running and accessible at the configured URL'
            });
            return false;
        }
    }
}

module.exports = TransportClient; 