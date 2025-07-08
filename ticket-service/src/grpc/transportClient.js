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
const TRANSPORT_SERVICE_URL = process.env.TRANSPORT_GRPC_URL || 'localhost:50051';
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
                logger.error(`gRPC call failed after ${maxRetries} attempts:`, error);
                throw error;
            }
            
            if (error.code === grpc.status.UNAVAILABLE || 
                error.message.includes('Name resolution failed') ||
                error.message.includes('UNAVAILABLE')) {
                logger.warn(`gRPC call attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms...`, {
                    error: error.message,
                    code: error.code
                });
                await sleep(delayMs);
                delayMs *= 1.5; // Exponential backoff
            } else {
                // For other errors, don't retry
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

    // Health check method to test connectivity
    static async isTransportServiceReady() {
        try {
            await retryGrpcCall(() => {
                return new Promise((resolve, reject) => {
                    transportClient.ListRoutes({}, (error, response) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(response);
                        }
                    });
                });
            }, 3, 1000); // Fewer retries for health check
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = TransportClient; 