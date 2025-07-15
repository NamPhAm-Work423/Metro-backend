const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { logger } = require('../config/logger');

// Simple configuration
const config = {
    transport: {
        url: process.env.TRANSPORT_GRPC_URL || 'transport-service:50051',
        retries: 3,
        retryDelayMs: 1000
    },
    ticket: {
        url: process.env.TICKET_GRPC_URL || 'ticket-service:50052',
        retries: 3,
        retryDelayMs: 1000
    },
    redis: {
        ttl: 3600 // 1 hour
    }
};

let transportClient = null;
let ticketClient = null;

// Initialize Transport gRPC client
function initTransportClient() {
    try {
        const PROTO_PATH = path.resolve(__dirname, '../proto/transport.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        
        const transportProto = grpc.loadPackageDefinition(packageDefinition).transport;
        transportClient = new transportProto.TransportService(
            config.transport.url,
            grpc.credentials.createInsecure()
        );
        
        logger.info('Transport gRPC client initialized', { url: config.transport.url });
        return transportClient;
    } catch (error) {
        logger.error('Failed to initialize transport gRPC client', { error: error.message });
        throw error;
    }
}

// Initialize Ticket gRPC client
function initTicketClient() {
    try {
        const PROTO_PATH = path.resolve(__dirname, '../proto/fare.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        
        const fareProto = grpc.loadPackageDefinition(packageDefinition).fare;
        ticketClient = new fareProto.FareService(
            config.ticket.url,
            grpc.credentials.createInsecure()
        );
        
        logger.info('Ticket gRPC client initialized', { url: config.ticket.url });
        return ticketClient;
    } catch (error) {
        logger.error('Failed to initialize ticket gRPC client', { error: error.message });
        throw error;
    }
}

// Get Transport client
function getTransportClient() {
    if (!transportClient) {
        transportClient = initTransportClient();
    }
    return transportClient;
}

// Get Ticket client
function getTicketClient() {
    if (!ticketClient) {
        ticketClient = initTicketClient();
    }
    return ticketClient;
}

// Transport gRPC call with retry
async function callTransport(method, request) {
    const client = getTransportClient();
    
    for (let attempt = 1; attempt <= config.transport.retries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                client[method](request, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.warn(`Transport gRPC call failed (attempt ${attempt}/${config.transport.retries})`, {
                method,
                error: error.message,
                attempt,
                retries: config.transport.retries
            });
            
            if (attempt === config.transport.retries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, config.transport.retryDelayMs * attempt));
        }
    }
}

// Ticket gRPC call with retry
async function callTicket(method, request) {
    const client = getTicketClient();
    
    for (let attempt = 1; attempt <= config.ticket.retries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                client[method](request, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            logger.warn(`Ticket gRPC call failed (attempt ${attempt}/${config.ticket.retries})`, {
                method,
                error: error.message,
                attempt,
                retries: config.ticket.retries
            });
            
            if (attempt === config.ticket.retries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, config.ticket.retryDelayMs * attempt));
        }
    }
}

module.exports = {
    config,
    getTransportClient,
    getTicketClient,
    callTransport,
    callTicket,
    initTransportClient,
    initTicketClient
};
