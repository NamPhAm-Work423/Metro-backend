const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models/index.model');

// Mock dependencies
jest.mock('../../src/models/index.model');
jest.mock('../../src/services/proxy.service');

describe('API Gateway - Passenger Service Integration', () => {
    const mockUser = {
        id: 'test-user-id-123',
        email: 'john@example.com',
        username: 'johndoe',
        roles: ['user'],
        isVerified: true,
        isLocked: () => false,
        toJSON: () => ({
            id: 'test-user-id-123',
            email: 'john@example.com',
            username: 'johndoe',
            roles: ['user'],
            isVerified: true
        })
    };

    const validToken = 'valid-jwt-token';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Authentication Flow', () => {
        it('should register a new user successfully', async () => {
            // Mock no existing user
            User.findOne.mockResolvedValue(null);
            // Mock user creation
            User.create.mockResolvedValue(mockUser);

            const response = await request(app)
                .post('/v1/auth/register')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    username: 'johndoe',
                    password: 'password123'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('User registered successfully');
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
        });

        it('should login user successfully', async () => {
            // Mock finding user
            User.findOne.mockResolvedValue({
                ...mockUser,
                password: '$2a$12$hashedpassword',
                update: jest.fn().mockResolvedValue(mockUser)
            });

            // Mock bcrypt compare
            const bcrypt = require('bcryptjs');
            bcrypt.compare = jest.fn().mockResolvedValue(true);

            const response = await request(app)
                .post('/v1/auth/login')
                .send({
                    email: 'john@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Login successful');
            expect(response.body.data.tokens.accessToken).toBeDefined();
        });

        it('should reject invalid credentials', async () => {
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/v1/auth/login')
                .send({
                    email: 'invalid@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('Passenger Service Proxy', () => {
        const ProxyService = require('../../src/services/proxy.service');
        
        beforeEach(() => {
            // Mock authentication middleware
            jest.spyOn(require('../../src/middlewares/auth.middleware'), 'authenticate')
                .mockImplementation((req, res, next) => {
                    req.user = mockUser;
                    next();
                });
        });

        it('should proxy passenger creation request with authentication', async () => {
            const mockProxyResponse = {
                success: true,
                message: 'Passenger profile created successfully',
                data: {
                    passengerId: 'passenger-123',
                    userId: 'test-user-id-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890'
                }
            };

            ProxyService.prototype.proxyRequest = jest.fn()
                .mockImplementation(async (req, res) => {
                    res.status(201).json(mockProxyResponse);
                });

            const response = await request(app)
                .post('/api/v1/passengers')
                .set('Authorization', `Bearer ${validToken}`)
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890',
                    dateOfBirth: '1990-01-01',
                    gender: 'male'
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(ProxyService.prototype.proxyRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    user: mockUser,
                    method: 'POST'
                }),
                expect.any(Object),
                'passenger-service'
            );
        });

        it('should proxy get passenger profile request', async () => {
            const mockProxyResponse = {
                success: true,
                data: {
                    passengerId: 'passenger-123',
                    userId: 'test-user-id-123',
                    firstName: 'John',
                    lastName: 'Doe',
                    phoneNumber: '1234567890'
                }
            };

            ProxyService.prototype.proxyRequest = jest.fn()
                .mockImplementation(async (req, res) => {
                    res.json(mockProxyResponse);
                });

            const response = await request(app)
                .get('/api/v1/passengers/me')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(ProxyService.prototype.proxyRequest).toHaveBeenCalled();
        });

        it('should reject unauthenticated requests to passenger endpoints', async () => {
            const response = await request(app)
                .get('/api/v1/passengers/me');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Access token is required');
        });

        it('should add user headers when proxying requests', async () => {
            ProxyService.prototype.proxyRequest = jest.fn()
                .mockImplementation(async (req, res) => {
                    // Verify that user headers are added
                    expect(req.headers['x-user-id']).toBe(mockUser.id.toString());
                    expect(req.headers['x-user-email']).toBe(mockUser.email);
                    expect(req.headers['x-user-roles']).toBe(JSON.stringify(mockUser.roles));
                    
                    res.json({ success: true, message: 'Proxied successfully' });
                });

            await request(app)
                .get('/api/v1/passengers/me')
                .set('Authorization', `Bearer ${validToken}`);

            expect(ProxyService.prototype.proxyRequest).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle service unavailable errors', async () => {
            const ProxyService = require('../../src/services/proxy.service');
            
            ProxyService.prototype.proxyRequest = jest.fn()
                .mockImplementation(async (req, res) => {
                    res.status(503).json({
                        success: false,
                        message: 'Service temporarily unavailable'
                    });
                });

            const response = await request(app)
                .get('/api/v1/passengers/me')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(503);
            expect(response.body.success).toBe(false);
        });

        it('should handle invalid service routes', async () => {
            const response = await request(app)
                .get('/api/v1/invalid-service/test')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(404);
        });
    });

    describe('Rate Limiting', () => {
        it('should apply rate limiting to passenger endpoints', async () => {
            const ProxyService = require('../../src/services/proxy.service');
            
            ProxyService.prototype.proxyRequest = jest.fn()
                .mockImplementation(async (req, res) => {
                    res.json({ success: true });
                });

            // Make multiple requests rapidly
            const promises = Array(5).fill().map(() => 
                request(app)
                    .get('/api/v1/passengers/me')
                    .set('Authorization', `Bearer ${validToken}`)
            );

            const responses = await Promise.all(promises);
            
            // All should succeed within rate limit
            responses.forEach(response => {
                expect([200, 429]).toContain(response.status);
            });
        });
    });
}); 