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

class TransportClient {
    static async getRoute(routeId) {
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
    }

    static async getStation(stationId) {
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
    }

    static async getTrip(tripId) {
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
    }

    static async getRoutesByStations(originStationId, destinationStationId) {
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
    }

    static async getAllRoutes() {
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
    }

    static async getRouteStations(routeId) {
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
    }
}

module.exports = TransportClient; 