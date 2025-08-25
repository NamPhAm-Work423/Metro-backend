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
let passengerDiscountClient = null;
let transitPassClient = null;

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

// Initialize PassengerDiscount gRPC client
function initPassengerDiscountClient() {
    try {
        const PROTO_PATH = path.resolve(__dirname, '../proto/passengerDiscount.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });

        const discountProto = grpc.loadPackageDefinition(packageDefinition).passengerdiscount;
        passengerDiscountClient = new discountProto.PassengerDiscountService(
            config.ticket.url,
            grpc.credentials.createInsecure()
        );

        logger.info('PassengerDiscount gRPC client initialized', { url: config.ticket.url });
        return passengerDiscountClient;
    } catch (error) {
        logger.error('Failed to initialize passenger discount gRPC client', { error: error.message });
        throw error;
    }
}

// Initialize TransitPass gRPC client
function initTransitPassClient() {
    try {
        const PROTO_PATH = path.resolve(__dirname, '../proto/transitPass.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });

        const transitPassProto = grpc.loadPackageDefinition(packageDefinition).transitpass;
        transitPassClient = new transitPassProto.TransitPassService(
            config.ticket.url,
            grpc.credentials.createInsecure()
        );

        logger.info('TransitPass gRPC client initialized', { url: config.ticket.url });
        return transitPassClient;
    } catch (error) {
        logger.error('Failed to initialize transit pass gRPC client', { error: error.message });
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

// Get PassengerDiscount client
function getPassengerDiscountClient() {
    if (!passengerDiscountClient) {
        passengerDiscountClient = initPassengerDiscountClient();
    }
    return passengerDiscountClient;
}

// Get TransitPass client
function getTransitPassClient() {
    if (!transitPassClient) {
        transitPassClient = initTransitPassClient();
    }
    return transitPassClient;
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

// PassengerDiscount gRPC call with retry
async function callPassengerDiscount(method, request) {
    const client = getPassengerDiscountClient();

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
            logger.warn(`PassengerDiscount gRPC call failed (attempt ${attempt}/${config.ticket.retries})`, {
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

// TransitPass gRPC call with retry
async function callTransitPass(method, request) {
    const client = getTransitPassClient();

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
            logger.warn(`TransitPass gRPC call failed (attempt ${attempt}/${config.ticket.retries})`, {
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
    getPassengerDiscountClient,
    getTransitPassClient,
    callTransport,
    callTicket,
    callPassengerDiscount,
    callTransitPass,
    initTransportClient,
    initTicketClient,
    initPassengerDiscountClient,
    initTransitPassClient
};
