const request = require('supertest');
const app = require('../app');
const { Station } = require('../models/index.model');

// Mock Kafka producer to avoid actual Kafka calls during tests
jest.mock('../events/kafkaProducer', () => ({
    publishStationEvent: jest.fn().mockResolvedValue(),
    publishStationStatusChange: jest.fn().mockResolvedValue()
}));

describe('Station Service Tests', () => {
    
    beforeEach(async () => {
        // Clean up database before each test
        await Station.destroy({ where: {}, force: true });
    });

    afterAll(async () => {
        // Clean up database after all tests
        await Station.destroy({ where: {}, force: true });
    });

    describe('GET /v1/health', () => {
        it('should return health check status', async () => {
            const response = await request(app)
                .get('/v1/health')
                .expect(200);

            expect(response.body).toEqual({
                success: true,
                message: 'Station service is healthy',
                timestamp: expect.any(String)
            });
        });
    });

    describe('Public Endpoints', () => {
        describe('GET /v1/stations', () => {
            it('should return empty array when no stations exist', async () => {
                const response = await request(app)
                    .get('/v1/stations')
                    .expect(200);

                expect(response.body).toEqual({
                    success: true,
                    message: 'Stations retrieved successfully',
                    data: [],
                    count: 0
                });
            });

            it('should return only active stations', async () => {
                // Create test stations
                await Station.bulkCreate([
                    {
                        stationCode: 'TST01',
                        stationName: 'Active Station',
                        isActive: true
                    },
                    {
                        stationCode: 'TST02',
                        stationName: 'Inactive Station',
                        isActive: false
                    }
                ]);

                const response = await request(app)
                    .get('/v1/stations')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].stationName).toBe('Active Station');
                expect(response.body.data[0].isActive).toBe(true);
            });
        });

        describe('GET /v1/stations/:id', () => {
            it('should return station by ID', async () => {
                const stationData = {
                    stationCode: 'TST01',
                    stationName: 'Test Station',
                    address: 'Test Address'
                };

                const station = await Station.create(stationData);

                const response = await request(app)
                    .get(`/v1/stations/${station.stationId}`)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.stationId).toBe(station.stationId);
                expect(response.body.data.stationName).toBe('Test Station');
            });

            it('should return 404 for non-existent station', async () => {
                const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

                const response = await request(app)
                    .get(`/v1/stations/${nonExistentId}`)
                    .expect(404);

                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Station not found');
            });

            it('should return 400 for invalid ID format', async () => {
                const invalidId = 'invalid-id';

                const response = await request(app)
                    .get(`/v1/stations/${invalidId}`)
                    .expect(400);

                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Validation error');
            });
        });

        describe('GET /v1/stations/code/:code', () => {
            it('should return station by code', async () => {
                const stationData = {
                    stationCode: 'TST01',
                    stationName: 'Test Station'
                };

                await Station.create(stationData);

                const response = await request(app)
                    .get('/v1/stations/code/TST01')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.stationCode).toBe('TST01');
            });
        });

        describe('GET /v1/stations/search', () => {
            beforeEach(async () => {
                // Create test stations
                await Station.bulkCreate([
                    {
                        stationCode: 'TST01',
                        stationName: 'Test Station Central'
                    },
                    {
                        stationCode: 'TST02',
                        stationName: 'Downtown Station'
                    },
                    {
                        stationCode: 'BLU01',
                        stationName: 'Blue Line Central'
                    }
                ]);
            });

            it('should find stations by name', async () => {
                const response = await request(app)
                    .get('/v1/stations/search?q=Central')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(2);
                expect(response.body.data.every(station => 
                    station.stationName.includes('Central')
                )).toBe(true);
            });

            it('should find stations by code', async () => {
                const response = await request(app)
                    .get('/v1/stations/search?q=TST')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(2);
                expect(response.body.data.every(station => 
                    station.stationCode.includes('TST')
                )).toBe(true);
            });

            it('should return 400 for missing search query', async () => {
                const response = await request(app)
                    .get('/v1/stations/search')
                    .expect(400);

                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Search query parameter "q" is required');
            });
        });

        describe('GET /v1/stations/facility/:facility', () => {
            beforeEach(async () => {
                await Station.bulkCreate([
                    {
                        stationCode: 'TST01',
                        stationName: 'Station with Elevator',
                        facilities: ['elevator', 'escalator']
                    },
                    {
                        stationCode: 'TST02',
                        stationName: 'Station without Elevator',
                        facilities: ['escalator']
                    }
                ]);
            });

            it('should return stations with specific facility', async () => {
                const response = await request(app)
                    .get('/v1/stations/facility/elevator')
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(1);
                expect(response.body.data[0].stationName).toBe('Station with Elevator');
            });
        });
    });

    describe('Route Service Endpoints (requires authorization)', () => {
        const mockRouteServiceHeaders = {
            'x-user-roles': 'route-service',
            'x-user-id': 'route-service-user'
        };

        describe('GET /v1/stations/route/all', () => {
            it('should return all stations including inactive for route service', async () => {
                await Station.bulkCreate([
                    {
                        stationCode: 'TST01',
                        stationName: 'Active Station',
                        isActive: true
                    },
                    {
                        stationCode: 'TST02',
                        stationName: 'Inactive Station',
                        isActive: false
                    }
                ]);

                const response = await request(app)
                    .get('/v1/stations/route/all')
                    .set(mockRouteServiceHeaders)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(2);
            });

            it('should require authorization', async () => {
                const response = await request(app)
                    .get('/v1/stations/route/all')
                    .expect(401);

                expect(response.body.success).toBe(false);
            });
        });

        describe('POST /v1/stations/route/bulk', () => {
            it('should return multiple stations by IDs', async () => {
                const station1 = await Station.create({
                    stationCode: 'TST01',
                    stationName: 'Station 1'
                });

                const station2 = await Station.create({
                    stationCode: 'TST02',
                    stationName: 'Station 2'
                });

                const response = await request(app)
                    .post('/v1/stations/route/bulk')
                    .set(mockRouteServiceHeaders)
                    .send({ ids: [station1.stationId, station2.stationId] })
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(2);
            });
        });
    });

    describe('Admin Endpoints (requires admin authorization)', () => {
        const mockAdminHeaders = {
            'x-user-roles': 'admin',
            'x-user-id': 'admin-user'
        };

        describe('POST /v1/stations/admin', () => {
            it('should create a new station with valid data', async () => {
                const stationData = {
                    stationCode: 'TST01',
                    stationName: 'Test Station',
                    address: 'Test Address',
                    facilities: ['escalator', 'elevator']
                };

                const response = await request(app)
                    .post('/v1/stations/admin')
                    .set(mockAdminHeaders)
                    .send(stationData)
                    .expect(201);

                expect(response.body.success).toBe(true);
                expect(response.body.message).toBe('Station created successfully');
                expect(response.body.data).toMatchObject({
                    stationCode: 'TST01',
                    stationName: 'Test Station'
                });
            });

            it('should return validation error for missing required fields', async () => {
                const invalidData = {
                    stationName: 'Test Station'
                    // Missing stationCode
                };

                const response = await request(app)
                    .post('/v1/stations/admin')
                    .set(mockAdminHeaders)
                    .send(invalidData)
                    .expect(400);

                expect(response.body.success).toBe(false);
                expect(response.body.message).toBe('Validation error');
                expect(response.body.errors).toBeDefined();
            });

            it('should require admin authorization', async () => {
                const stationData = {
                    stationCode: 'TST01',
                    stationName: 'Test Station'
                };

                const response = await request(app)
                    .post('/v1/stations/admin')
                    .send(stationData)
                    .expect(401);

                expect(response.body.success).toBe(false);
            });
        });

        describe('PUT /v1/stations/admin/:id', () => {
            it('should update a station', async () => {
                const station = await Station.create({
                    stationCode: 'TST01',
                    stationName: 'Original Name'
                });

                const updateData = {
                    stationName: 'Updated Name',
                    address: 'New Address'
                };

                const response = await request(app)
                    .put(`/v1/stations/admin/${station.stationId}`)
                    .set(mockAdminHeaders)
                    .send(updateData)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data.stationName).toBe('Updated Name');
            });
        });

        describe('DELETE /v1/stations/admin/:id', () => {
            it('should soft delete a station', async () => {
                const station = await Station.create({
                    stationCode: 'TST01',
                    stationName: 'Test Station'
                });

                const response = await request(app)
                    .delete(`/v1/stations/admin/${station.stationId}`)
                    .set(mockAdminHeaders)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.message).toBe('Station deleted successfully');

                // Verify station is soft deleted
                const deletedStation = await Station.findByPk(station.stationId);
                expect(deletedStation.isActive).toBe(false);
            });
        });

        describe('GET /v1/stations/admin/all', () => {
            it('should return all stations including inactive for admin', async () => {
                await Station.bulkCreate([
                    {
                        stationCode: 'TST01',
                        stationName: 'Active Station',
                        isActive: true
                    },
                    {
                        stationCode: 'TST02',
                        stationName: 'Inactive Station',
                        isActive: false
                    }
                ]);

                const response = await request(app)
                    .get('/v1/stations/admin/all')
                    .set(mockAdminHeaders)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.data).toHaveLength(2);
            });
        });

        describe('PATCH /v1/stations/admin/:id/restore', () => {
            it('should restore a soft deleted station', async () => {
                const station = await Station.create({
                    stationCode: 'TST01',
                    stationName: 'Test Station',
                    isActive: false
                });

                const response = await request(app)
                    .patch(`/v1/stations/admin/${station.stationId}/restore`)
                    .set(mockAdminHeaders)
                    .expect(200);

                expect(response.body.success).toBe(true);
                expect(response.body.message).toBe('Station restored successfully');

                // Verify station is restored
                const restoredStation = await Station.findByPk(station.stationId);
                expect(restoredStation.isActive).toBe(true);
            });
        });
    });
}); 