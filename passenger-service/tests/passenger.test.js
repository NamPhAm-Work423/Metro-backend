const request = require('supertest');
const app = require('../src/app');
const { Passenger } = require('../src/models/index.model');

// Mock database
jest.mock('../src/models/index.model');

describe('Passenger Service API', () => {
    const mockUser = {
        id: 'test-user-id-123',
        email: 'test@example.com',
        roles: ['user']
    };

    const mockPassengerData = {
        passengerId: 'passenger-id-123',
        userId: 'test-user-id-123',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        address: '123 Test Street',
        emergencyContact: '0987654321',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /v1/passengers', () => {
        it('should create a new passenger profile', async () => {
            // Mock no existing passenger
            Passenger.findOne.mockResolvedValue(null);
            // Mock successful creation
            Passenger.create.mockResolvedValue(mockPassengerData);

            const response = await request(app)
                .post('/v1/passengers')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles))
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890',
                    dateOfBirth: '1990-01-01',
                    gender: 'male',
                    address: '123 Test Street',
                    emergencyContact: '0987654321'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Passenger profile created successfully');
            expect(response.body.data).toMatchObject({
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '1234567890'
            });
        });

        it('should return 409 if passenger profile already exists', async () => {
            // Mock existing passenger
            Passenger.findOne.mockResolvedValue(mockPassengerData);

            const response = await request(app)
                .post('/v1/passengers')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles))
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890'
                });

            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Passenger profile already exists');
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .post('/v1/passengers')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('User authentication required');
        });
    });

    describe('GET /v1/passengers/me', () => {
        it('should return current user passenger profile', async () => {
            Passenger.findOne.mockResolvedValue(mockPassengerData);

            const response = await request(app)
                .get('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '1234567890'
            });
        });

        it('should return 404 if passenger profile not found', async () => {
            Passenger.findOne.mockResolvedValue(null);

            const response = await request(app)
                .get('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles));

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Passenger profile not found');
        });
    });

    describe('PUT /v1/passengers/me', () => {
        it('should update passenger profile', async () => {
            const updatedPassenger = { ...mockPassengerData, firstName: 'Jane' };
            Passenger.findOne.mockResolvedValue({
                ...mockPassengerData,
                update: jest.fn().mockResolvedValue(updatedPassenger)
            });

            const response = await request(app)
                .put('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles))
                .send({
                    firstName: 'Jane',
                    lastName: 'Doe',
                    phoneNumber: '1234567890'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Passenger profile updated successfully');
        });

        it('should return 404 if passenger profile not found for update', async () => {
            Passenger.findOne.mockResolvedValue(null);

            const response = await request(app)
                .put('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles))
                .send({
                    firstName: 'Jane',
                    lastName: 'Doe'
                });

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Passenger profile not found');
        });
    });

    describe('DELETE /v1/passengers/me', () => {
        it('should deactivate passenger profile', async () => {
            Passenger.findOne.mockResolvedValue({
                ...mockPassengerData,
                update: jest.fn().mockResolvedValue({ ...mockPassengerData, isActive: false })
            });

            const response = await request(app)
                .delete('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles));

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Passenger profile deactivated successfully');
        });

        it('should return 404 if passenger profile not found for deletion', async () => {
            Passenger.findOne.mockResolvedValue(null);

            const response = await request(app)
                .delete('/v1/passengers/me')
                .set('x-user-id', mockUser.id)
                .set('x-user-email', mockUser.email)
                .set('x-user-roles', JSON.stringify(mockUser.roles));

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Passenger profile not found');
        });
    });
}); 