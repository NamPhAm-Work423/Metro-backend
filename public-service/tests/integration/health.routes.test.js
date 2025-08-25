const request = require('supertest');

// Ensure mocks are set up BEFORE requiring the app (so controllers pick them up)
jest.mock('../../src/services/cache.service', () => {
    return jest.fn().mockImplementation(() => ({
        checkDataAvailability: jest.fn().mockResolvedValue({
            healthy: true,
            transport: true,
            ticket: true,
            error: null,
            timestamp: new Date().toISOString()
        }),
        getTransportData: jest.fn().mockResolvedValue({ routes: [{}], routeStations: [{}] }),
        getTicketData: jest.fn().mockResolvedValue({ fares: [{}], transitPasses: [{}] })
    }));
});

jest.mock('../../src/services/scheduler.service', () => {
    return jest.fn().mockImplementation(() => ({
        healthCheck: jest.fn().mockReturnValue({ healthy: true })
    }));
});

const App = require('../../src/app');

describe('Health routes', () => {
    let app;

    beforeEach(() => {
        const application = new App();
        app = application.getApp();
    });

    test('GET /health returns healthy when dependencies are healthy', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'healthy');
        expect(res.body).toHaveProperty('checks.grpcServices.transport', true);
    });

    test('GET /health/detailed aggregates checks', async () => {
        const res = await request(app).get('/health/detailed');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('checks.transportService.status');
        expect(res.body).toHaveProperty('checks.ticketService.status');
        expect(res.body).toHaveProperty('checks.dataAvailability.status', 'healthy');
    });

    test('GET /health/ready returns 200 when data available', async () => {
        const res = await request(app).get('/health/ready');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ready', true);
    });

    test('GET /health/live always returns 200', async () => {
        const res = await request(app).get('/health/live');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('alive', true);
    });
});


