const passengerService = require('../services/passenger.service');
const asyncErrorHandler = require('../helpers/errorHandler.helper');
const passengerProducer = require('../events/passenger.producer.event');
const { addCustomSpan } = require('../tracing');
const { logger } = require('../config/logger');

/**
 * Event: Create passenger profile from user registration event
 * This is used by event consumers and should not depend on req/res.
 */
const createPassengerFromUserEvent = async (userData) => {
    return addCustomSpan('event.passenger.create-from-user', async (span) => {
        try {
            const {
                userId,
                username,
                email,
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                gender,
                address
            } = userData;

            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'passenger',
                'event.source': 'user.created',
                'user.id': userId || 'missing'
            });

            const existing = await passengerService.getPassengerByUserId(userId);
            if (existing) {
                logger.info('Passenger profile already exists (event)', { userId });
                span.setAttributes({ 'operation.result': 'exists' });
                return existing;
            }

            const passenger = await passengerService.createPassenger({
                userId,
                username,
                email,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                address: address || null
            });

            logger.info('Passenger profile created from event', {
                userId,
                username,
                passengerId: passenger.passengerId
            });

            span.setAttributes({ 'operation.success': true });
            return passenger;
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false });
            logger.error('Error in createPassengerFromUserEvent', {
                error: error.message,
                stack: error.stack,
                userData
            });
            throw error;
        }
    });
};

/**
 * Event: Handle user login for passenger cache sync
 */
const handleUserLoginEvent = async (userData) => {
    return addCustomSpan('event.passenger.user-login', async (span) => {
        try {
            span.setAttributes({
                'operation.type': 'sync',
                'operation.entity': 'passenger',
                'event.source': 'user.login',
                'user.id': userData.userId || 'missing',
                'user.roles.present': Array.isArray(userData.roles)
            });

            logger.info('Passenger controller handling user.login', {
                userId: userData.userId,
                roles: userData.roles
            });

            if (!userData.roles || !Array.isArray(userData.roles)) {
                logger.warn('Login event without roles');
                span.setAttributes({ 'operation.result': 'invalid_roles' });
                return;
            }

            if (userData.roles.includes('admin')) {
                const adminPassengerData = {
                    passengerId: process.env.ADMIN_PASSENGER_ID,
                    userId: userData.userId,
                    firstName: 'Admin',
                    lastName: 'User',
                    phoneNumber: '0000000000',
                    email: userData.email || null,
                    fullName: 'Admin User',
                    dateOfBirth: null,
                    gender: null,
                    updatedAt: new Date().toISOString()
                };

                await passengerService.setPassengerCache(adminPassengerData);
                logger.info('Admin passenger cache synced (login)', {
                    passengerId: adminPassengerData.passengerId,
                    userId: adminPassengerData.userId
                });
                span.setAttributes({ 'operation.success': true, 'operation.role': 'admin' });
                return;
            }

            if (!userData.roles.includes('passenger')) {
                logger.info('Login user is not passenger; skip cache sync', {
                    userId: userData.userId
                });
                span.setAttributes({ 'operation.result': 'non_passenger' });
                return;
            }

            const passenger = await passengerService.getPassengerByUserId(userData.userId);
            if (!passenger) {
                logger.error('Passenger not found for login cache sync', {
                    userId: userData.userId
                });
                span.setAttributes({ 'operation.result': 'not_found' });
                return;
            }

            await passengerService.syncPassengerCacheForUser(userData.userId, userData.email);
            logger.info('Passenger cache synced (login)', {
                passengerId: passenger.passengerId,
                userId: passenger.userId
            });
            span.setAttributes({ 'operation.success': true, 'operation.role': 'passenger' });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false });
            logger.error('Error in handleUserLoginEvent', {
                error: error.message,
                stack: error.stack,
                userData
            });
        }
    });
};

/**
 * Event: Handle passenger-sync-request coming from other services
 */
const handlePassengerSyncRequest = async (payload) => {
    return addCustomSpan('event.passenger.sync-request', async (span) => {
        try {
            const { userId, requestedBy } = payload;

            span.setAttributes({
                'operation.type': 'sync',
                'operation.entity': 'passenger',
                'event.source': 'passenger-sync-request',
                'user.id': userId || 'missing',
                'requested.by': requestedBy || 'unknown'
            });

            logger.info('Passenger controller handling passenger-sync-request', {
                userId,
                requestedBy: requestedBy || 'unknown',
                source: payload.source || 'unknown'
            });

            const passenger = await passengerService.getPassengerByUserId(userId);
            if (!passenger) {
                logger.warn('Passenger not found for sync request', { userId, requestedBy });
                span.setAttributes({ 'operation.result': 'not_found' });
                return;
            }

            await passengerProducer.publishPassengerCacheSync(passenger);
            logger.info('Published passenger-cache-sync from controller', {
                userId,
                passengerId: passenger.passengerId,
                requestedBy
            });
            span.setAttributes({ 'operation.success': true });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false });
            logger.error('Error in handlePassengerSyncRequest', {
                error: error.message,
                stack: error.stack,
                payload
            });
        }
    });
};

// GET /v1/passengers/getallPassengers
const getAllPassengers = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.get-all', async (span) => {
        span.setAttributes({
            'operation.type': 'read',
            'operation.entity': 'passenger',
            'operation.scope': 'all',
            'request.authenticated': !!req.user,
            'user.role': req.user?.role || 'unknown'
        });
        
        try {
            logger.info('Fetching all passengers', {
                requestedBy: req.user?.id,
                userRole: req.user?.role
            });
            
            const passengers = await addCustomSpan('passenger.db.find-all', async (dbSpan) => {
                dbSpan.setAttributes({
                    'db.operation': 'SELECT',
                    'db.table': 'passengers',
                    'db.query.type': 'find_all'
                });
                
                const result = await passengerService.getAllPassengers();
                
                dbSpan.setAttributes({
                    'db.result.count': result.length,
                    'db.query.success': true
                });
                
                return result;
            });
            
            span.setAttributes({
                'operation.success': true,
                'response.data.count': passengers.length,
                'http.status_code': 200
            });
            
            logger.info('All passengers retrieved successfully', {
                count: passengers.length,
                requestedBy: req.user?.id
            });
            
            return res.status(200).json({ 
                success: true,
                message: 'Passengers retrieved successfully', 
                data: passengers,
                count: passengers.length
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({
                'operation.success': false,
                'error.type': error.constructor.name,
                'http.status_code': 500
            });
            
            logger.error('Failed to retrieve all passengers', {
                error: error.message,
                stack: error.stack,
                requestedBy: req.user?.id
            });
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ALL_PASSENGERS'
            });
        }
    });
});

// GET /v1/passengers/getPassengerById/:id
const getPassengerById = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.get-by-id', async (span) => {
        const { id } = req.params;
        
        span.setAttributes({
            'operation.type': 'read',
            'operation.entity': 'passenger',
            'operation.scope': 'single',
            'passenger.id': id,
            'request.authenticated': !!req.user,
            'user.role': req.user?.role || 'unknown'
        });
        
        try {
            logger.info('Fetching passenger by ID', {
                passengerId: id,
                requestedBy: req.user?.id,
                userRole: req.user?.role
            });
            
            const passenger = await addCustomSpan('passenger.db.find-by-id', async (dbSpan) => {
                dbSpan.setAttributes({
                    'db.operation': 'SELECT',
                    'db.table': 'passengers',
                    'db.query.type': 'find_by_id',
                    'db.query.passenger_id': id
                });
                
                const result = await passengerService.getPassengerById(id);
                
                dbSpan.setAttributes({
                    'db.result.found': !!result,
                    'db.query.success': true
                });
                
                return result;
            });
            
            if (!passenger) {
                span.setAttributes({
                    'operation.success': false,
                    'operation.result': 'not_found',
                    'http.status_code': 404
                });
                
                logger.warn('Passenger not found', {
                    passengerId: id,
                    requestedBy: req.user?.id
                });
                
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }
            
            span.setAttributes({
                'operation.success': true,
                'operation.result': 'found',
                'passenger.found_id': passenger.id,
                'http.status_code': 200
            });
            
            logger.info('Passenger retrieved successfully', {
                passengerId: id,
                requestedBy: req.user?.id
            });
            
            return res.status(200).json({
                success: true,
                message: 'Passenger retrieved successfully',
                data: passenger
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({
                'operation.success': false,
                'error.type': error.constructor.name,
                'http.status_code': 500
            });
            
            logger.error('Failed to retrieve passenger by ID', {
                error: error.message,
                stack: error.stack,
                passengerId: id,
                requestedBy: req.user?.id
            });
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_PASSENGER_BY_ID'
            });
        }
    });
});

// PUT /v1/passengers/updatePassenger/:id
const updatePassenger = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.update-by-id', async (span) => {
        const { id } = req.params;
        const updateData = req.body;

        span.setAttributes({
            'operation.type': 'update',
            'operation.entity': 'passenger',
            'passenger.id': id
        });

        try {
            const passenger = await passengerService.updatePassengerById(id, updateData);

            if (!passenger) {
                span.setAttributes({
                    'operation.success': false,
                    'operation.result': 'not_found',
                    'http.status_code': 404
                });
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }

            span.setAttributes({
                'operation.success': true,
                'http.status_code': 200
            });
            return res.status(200).json({
                success: true,
                message: 'Passenger updated successfully',
                data: passenger
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({
                'operation.success': false,
                'error.type': error.constructor?.name || 'Error',
                'http.status_code': 500
            });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_PASSENGER'
            });
        }
    });
});

// DELETE /v1/passengers/deletePassenger/:id
const deletePassenger = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.delete-by-id', async (span) => {
        const { id } = req.params;
        span.setAttributes({
            'operation.type': 'delete',
            'operation.entity': 'passenger',
            'passenger.id': id
        });
        try {
            const result = await passengerService.deletePassengerById(id);
            if (!result) {
                span.setAttributes({
                    'operation.success': false,
                    'operation.result': 'not_found',
                    'http.status_code': 404
                });
                return res.status(404).json({
                    success: false,
                    message: 'Passenger not found'
                });
            }
            span.setAttributes({
                'operation.success': true,
                'http.status_code': 200
            });
            return res.status(200).json({
                success: true,
                message: 'Passenger deleted successfully'
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({
                'operation.success': false,
                'error.type': error.constructor?.name || 'Error',
                'http.status_code': 500
            });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_DELETE_PASSENGER'
            });
        }
    });
});

// POST /v1/passengers/createPassenger
const createPassenger = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.create', async (span) => {
        try {
            const { firstName, lastName, username, phoneNumber, dateOfBirth, gender, address, emergencyContact } = req.body;
            const userId = req.headers['x-user-id'] || req.user?.id;

            span.setAttributes({
                'operation.type': 'create',
                'operation.entity': 'passenger',
                'user.id': userId
            });

            const existing = await passengerService.getPassengerByUserId(userId);
            if (existing) {
                span.setAttributes({ 'operation.result': 'conflict', 'http.status_code': 409 });
                return res.status(409).json({ 
                    success: false,
                    message: 'Passenger profile already exists' 
                });
            }
            
            const passengerData = {
                userId,
                username: username || `user_${userId.slice(-8)}`,
                firstName,
                lastName,
                phoneNumber: phoneNumber || null,
                dateOfBirth: dateOfBirth || null,
                gender: gender || null,
                address: address || null,
                emergencyContact: emergencyContact || null
            };
            
            const passenger = await passengerService.createPassenger(passengerData);

            span.setAttributes({ 'operation.success': true, 'http.status_code': 201 });
            return res.status(201).json({ 
                success: true, 
                message: 'Passenger profile created successfully',
                data: passenger 
            });
        } catch (err) {
            span.recordException(err);
            if (err.name === 'SequelizeValidationError') {
                span.setAttributes({ 'http.status_code': 400, 'operation.success': false });
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: err.errors.map(e => ({ field: e.path, message: e.message }))
                });
            }
            span.setAttributes({ 'http.status_code': 500, 'operation.success': false });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_CREATE_PASSENGER'
            });
        }
    });
});

// GET /v1/passengers/me
const getMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.get-me', async (span) => {
        try {
            const passenger = await passengerService.getPassengerByUserId(req.user.id);
            if (!passenger) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({ 
                    success: false,
                    message: 'Passenger profile not found' 
                });
            }
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({ 
                success: true,
                message: 'Passenger retrieved successfully',
                data: passenger 
            });
        } catch (err) {
            span.recordException(err);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_GET_ME'
            });
        }
    });
});

// PUT /v1/passengers/me
const updateMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.update-me', async (span) => {
        try {
            const { firstName, lastName, phoneNumber, dateOfBirth, gender, address, emergencyContact } = req.body;
            const userId = req.user.id;
            
            span.setAttributes({ 'operation.type': 'update', 'user.id': userId });

            const updateData = {
                firstName,
                lastName,
                phoneNumber,
                dateOfBirth,
                gender,
                address,
                emergencyContact
            };
            
            const passenger = await passengerService.updatePassenger(userId, updateData);
            
            if (!passenger) {
                span.setAttributes({ 'operation.result': 'not_found', 'http.status_code': 404 });
                return res.status(404).json({ 
                    success: false,
                    message: 'Passenger profile not found' 
                });
            }
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({ 
                success: true,
                message: 'Passenger profile updated successfully',
                data: passenger 
            });
        } catch (err) {
            span.recordException(err);
            if (err.name === 'SequelizeValidationError') {
                span.setAttributes({ 'http.status_code': 400, 'operation.success': false });
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: err.errors.map(e => ({ field: e.path, message: e.message }))
                });
            }
            span.setAttributes({ 'http.status_code': 500, 'operation.success': false });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_UPDATE_ME'
            });
        }
    });
});

// DELETE /v1/passengers/me
const deleteMe = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.delete-me', async (span) => {
        try {
            const userId = req.user.userId || req.user.id;
            span.setAttributes({ 'operation.type': 'delete', 'user.id': userId || 'missing' });
            
            if (!userId) {
                span.setAttributes({ 'http.status_code': 400, 'operation.success': false });
                return res.status(400).json({
                    success: false,
                    message: 'User ID not found in request'
                });
            }

            const result = await passengerService.deletePassengerByUserId(userId);

            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_DELETE_ME'
            });
        }
    });
});

// POST /v1/passengers/sync-passenger
const syncPassenger = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.sync', async (span) => {
        try {
            const userId = req.user.userId || req.user.id;
            span.setAttributes({ 'operation.type': 'sync', 'user.id': userId || 'missing' });
            
            if (!userId) {
                span.setAttributes({ 'http.status_code': 400, 'operation.success': false });
                return res.status(400).json({
                    success: false,
                    message: 'User ID not found in request'
                });
            }

            const passenger = await passengerService.getPassengerByUserId(userId);
            
            if (!passenger) {
                span.setAttributes({ 'http.status_code': 404, 'operation.result': 'not_found' });
                return res.status(404).json({
                    success: false,
                    message: 'Passenger profile not found'
                });
            }

            await passengerProducer.publishPassengerCacheSync(passenger);
            
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Passenger data synchronized successfully',
                data: {
                    passengerId: passenger.passengerId,
                    syncedAt: new Date().toISOString()
                }
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_SYNC_PASSENGER'
            });
        }
    });
});

// DELETE /v1/passengers/deletePassengerById/:id

const deletePassengerById = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('passenger.delete-by-id.admin', async (span) => {
        try {
            const { id } = req.params;
            span.setAttributes({ 'operation.type': 'delete', 'operation.entity': 'passenger', 'passenger.id': id });
            const result = await passengerService.deletePassengerById(id);
            span.setAttributes({ 'operation.success': true, 'http.status_code': 200 });
            return res.status(200).json({
                success: true,
                message: 'Passenger deleted successfully',
                data: result
            });
        } catch (error) {
            span.recordException(error);
            span.setAttributes({ 'operation.success': false, 'http.status_code': 500 });
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: 'INTERNAL_ERROR_DELETE_PASSENGER_BY_ID'
            });
        }
    });
});

module.exports = { 
    getAllPassengers, 
    getPassengerById,
    updatePassenger,
    deletePassenger,
    createPassenger, 
    getMe, 
    updateMe, 
    deleteMe,
    syncPassenger,
    deletePassengerById,
    // Event handlers
    createPassengerFromUserEvent,
    handleUserLoginEvent,
    handlePassengerSyncRequest
}; 