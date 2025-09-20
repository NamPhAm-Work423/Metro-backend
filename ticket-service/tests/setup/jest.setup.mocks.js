// Provide an in-memory Sequelize instance to avoid real DB and side-effects
jest.mock('../../src/config/database', () => {
    const { Sequelize } = require('sequelize');
    // Use postgres dialect to avoid sqlite3 native dependency; no real connection is made without authenticate
    const sequelize = new Sequelize('postgres://user:pass@localhost:5432/testdb', {
        dialect: 'postgres',
        logging: false,
    });
    // Prevent any authentication attempts
    sequelize.authenticate = jest.fn().mockResolvedValue();
    sequelize.sync = jest.fn().mockResolvedValue();
    sequelize.close = jest.fn().mockResolvedValue();
    return sequelize;
});

// Mock Redis to prevent connection attempts during tests
jest.mock('../../src/config/redis', () => ({
    getClient: jest.fn(() => null),
    withRedisClient: jest.fn((operation) => Promise.resolve(null)),
    setWithExpiry: jest.fn(() => Promise.resolve(null)),
    initializeRedis: jest.fn(() => Promise.resolve(true))
}));

// Mock Kafka consumers to prevent connection attempts
jest.mock('../../src/events/passengerCache.consumer.event', () => ({
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve())
}));

jest.mock('../../src/events/payment.consumer.event', () => {
    return jest.fn().mockImplementation(() => ({
        start: jest.fn(() => Promise.resolve()),
        stop: jest.fn(() => Promise.resolve())
    }));
});

// Mock gRPC server to prevent connection attempts
jest.mock('../../src/grpc/combinedServer', () => ({
    startCombinedGrpcServer: jest.fn(() => Promise.resolve())
}));

// Mock seed functions
jest.mock('../../src/seed/index', () => ({
    runSeeds: jest.fn(() => Promise.resolve())
}));

// Mock passengerIdTracing service to prevent database queries
jest.mock('../../src/services/ticket/handlers/passengerIdTracing', () => ({
    getTicketsByRoutes: jest.fn(() => Promise.resolve({
        tickets: [],
        totalCount: 0
    })),
    getPassengerIdsByRoutes: jest.fn(() => Promise.resolve({
        passengerIds: [],
        totalCount: 0,
        traces: []
    })),
    checkTicketContainsRoutes: jest.fn(() => false),
    extractUniquePassengerIds: jest.fn(() => []),
    getTicketsWithFareBreakdown: jest.fn(() => Promise.resolve([])),
    traceTicketsByRoutes: jest.fn(() => ({
        matchedTickets: [],
        traces: []
    })),
    convertFareBreakdownToGrpc: jest.fn(() => null)
}));

// Mock tracing functions to prevent OpenTelemetry calls
jest.mock('../../src/tracing', () => ({
    addCustomSpan: jest.fn((name, fn) => {
        const mockSpan = {
            setAttributes: jest.fn(),
            recordException: jest.fn(),
            setStatus: jest.fn(),
            end: jest.fn()
        };
        
        if (typeof fn === 'function') {
            return fn(mockSpan);
        }
        return Promise.resolve();
    }),
    createCustomSpan: jest.fn((name, fn) => {
        const mockSpan = {
            setAttributes: jest.fn(),
            recordException: jest.fn(),
            setStatus: jest.fn(),
            end: jest.fn()
        };
        
        if (typeof fn === 'function') {
            return fn(mockSpan);
        }
        return Promise.resolve();
    })
}));

// Mute noisy console during tests to prevent "Cannot log after tests are done"
const noop = () => {};
jest.spyOn(console, 'error').mockImplementation(noop);
jest.spyOn(console, 'log').mockImplementation(noop);
jest.spyOn(console, 'warn').mockImplementation(noop);

