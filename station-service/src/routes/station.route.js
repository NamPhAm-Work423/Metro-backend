const express = require('express');
const router = express.Router();
const stationController = require('../controllers/station.controller');
const { authorizeRoles, requireAuth } = require('../middlewares/authorization');
const { body, param, query } = require('express-validator');

// Validation middleware for station creation/update
const stationValidation = [
    body('stationCode')
        .notEmpty()
        .withMessage('Station code is required')
        .isLength({ min: 2, max: 10 })
        .withMessage('Station code must be between 2 and 10 characters'),
    body('stationName')
        .notEmpty()
        .withMessage('Station name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Station name must be between 2 and 100 characters'),
    body('address')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Address must not exceed 1000 characters'),
    body('facilities')
        .optional()
        .isArray()
        .withMessage('Facilities must be an array'),
    body('operatingHours')
        .optional()
        .isObject()
        .withMessage('Operating hours must be an object')
];

const updateStationValidation = [
    body('stationCode')
        .optional()
        .isLength({ min: 2, max: 10 })
        .withMessage('Station code must be between 2 and 10 characters'),
    body('stationName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Station name must be between 2 and 100 characters'),
    body('address')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Address must not exceed 1000 characters'),
    body('facilities')
        .optional()
        .isArray()
        .withMessage('Facilities must be an array'),
    body('operatingHours')
        .optional()
        .isObject()
        .withMessage('Operating hours must be an object')
];

const idValidation = [
    param('id')
        .isUUID()
        .withMessage('Invalid station ID format')
];

const codeValidation = [
    param('code')
        .isLength({ min: 2, max: 10 })
        .withMessage('Invalid station code format')
];

const facilityValidation = [
    param('facility')
        .notEmpty()
        .withMessage('Facility name is required')
];

const searchValidation = [
    query('q')
        .notEmpty()
        .withMessage('Search query is required')
        .isLength({ min: 1, max: 100 })
        .withMessage('Search query must be between 1 and 100 characters')
];

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: Get all active stations (Public)
 *     description: Retrieve all active stations for passenger use
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 */
router.get('/', stationController.getAllStations);

/**
 * @swagger
 * /stations/search:
 *   get:
 *     summary: Search stations (Public)
 *     description: Search stations by name or code
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 */
router.get('/search', searchValidation, stationController.searchStations);

/**
 * @swagger
 * /stations/facility/{facility}:
 *   get:
 *     summary: Get stations with specific facility (Public)
 *     description: Retrieve all stations that have a specific facility
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Stations with facility retrieved successfully
 */
router.get('/facility/:facility', facilityValidation, stationController.getStationsWithFacility);

/**
 * @swagger
 * /stations/code/{code}:
 *   get:
 *     summary: Get station by code (Public)
 *     description: Retrieve a specific station by code
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Station retrieved successfully
 *       404:
 *         description: Station not found
 */
router.get('/code/:code', codeValidation, stationController.getStationByCode);

/**
 * @swagger
 * /stations/{id}:
 *   get:
 *     summary: Get station by ID (Public)
 *     description: Retrieve a specific active station by ID
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Station retrieved successfully
 *       404:
 *         description: Station not found
 */
router.get('/:id', idValidation, stationController.getStationById);

// ============================================
// ROUTE SERVICE INTERNAL API
// ============================================

/**
 * @swagger
 * /stations/route/all:
 *   get:
 *     summary: Get all stations for route service
 *     description: Internal API for route service to get all stations (including inactive)
 *     tags: [Route Service]
 *     security:
 *       - serviceAuth: []
 *     responses:
 *       200:
 *         description: All stations retrieved for route service
 */
router.get('/route/all', ...authorizeRoles('route-service', 'admin'), stationController.getAllStationsForRoute);

/**
 * @swagger
 * /stations/route/bulk:
 *   post:
 *     summary: Get multiple stations by IDs
 *     description: Internal API for route service to get stations by multiple IDs
 *     tags: [Route Service]
 *     security:
 *       - serviceAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Stations retrieved successfully
 */
router.post('/route/bulk', ...authorizeRoles('route-service', 'admin'), stationController.getStationsByIds);

/**
 * @swagger
 * /stations/route/{id}/status:
 *   patch:
 *     summary: Update station status
 *     description: Internal API for route service to activate/deactivate stations
 *     tags: [Route Service]
 *     security:
 *       - serviceAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Station status updated successfully
 */
router.patch('/route/:id/status', idValidation, ...authorizeRoles('route-service', 'admin'), stationController.updateStationStatus);

// ============================================
// ADMIN ROUTES (Full CRUD access)
// ============================================

/**
 * @swagger
 * /stations/admin/all:
 *   get:
 *     summary: Get all stations for admin
 *     description: Admin access to all stations including inactive ones
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All stations retrieved for admin
 */
router.get('/admin/all', ...authorizeRoles('admin'), stationController.getAllStationsAdmin);

/**
 * @swagger
 * /stations/admin/{id}:
 *   get:
 *     summary: Get station by ID for admin
 *     description: Admin access to station details including inactive stations
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Station retrieved successfully
 */
router.get('/admin/:id', idValidation, ...authorizeRoles('admin'), stationController.getStationByIdAdmin);

/**
 * @swagger
 * /stations/admin:
 *   post:
 *     summary: Create a new station
 *     description: Admin only - create a new station
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stationCode
 *               - stationName
 *             properties:
 *               stationCode:
 *                 type: string
 *               stationName:
 *                 type: string
 *               address:
 *                 type: string
 *               facilities:
 *                 type: array
 *                 items:
 *                   type: string
 *               operatingHours:
 *                 type: object
 *     responses:
 *       201:
 *         description: Station created successfully
 */
router.post('/admin', stationValidation, ...authorizeRoles('admin'), stationController.createStation);

/**
 * @swagger
 * /stations/admin/{id}:
 *   put:
 *     summary: Update station
 *     description: Admin only - update a station
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Station updated successfully
 */
router.put('/admin/:id', idValidation, updateStationValidation, ...authorizeRoles('admin'), stationController.updateStation);

/**
 * @swagger
 * /stations/admin/{id}:
 *   delete:
 *     summary: Delete station
 *     description: Admin only - soft delete a station
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Station deleted successfully
 */
router.delete('/admin/:id', idValidation, ...authorizeRoles('admin'), stationController.deleteStation);

/**
 * @swagger
 * /stations/admin/{id}/restore:
 *   patch:
 *     summary: Restore deleted station
 *     description: Admin only - restore a soft deleted station
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Station restored successfully
 */
router.patch('/admin/:id/restore', idValidation, ...authorizeRoles('admin'), stationController.restoreStation);

module.exports = router; 