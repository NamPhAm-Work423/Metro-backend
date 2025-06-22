const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
// const { validateService, validateInstance } = require('../middlewares/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       required:
 *         - name
 *         - path
 *         - version
 *       properties:
 *         name:
 *           type: string
 *           description: Unique name of the service
 *           minLength: 3
 *           maxLength: 50
 *         description:
 *           type: string
 *           description: Service description
 *           maxLength: 500
 *         path:
 *           type: string
 *           description: Base path for the service
 *         version:
 *           type: string
 *           description: Service version (semantic versioning)
 *           pattern: '^\d+\.\d+\.\d+$'
 *         timeout:
 *           type: integer
 *           description: Request timeout in milliseconds
 *           minimum: 1000
 *           maximum: 30000
 *           default: 5000
 *         retries:
 *           type: integer
 *           description: Number of retry attempts
 *           minimum: 0
 *           maximum: 5
 *           default: 3
 *         circuitBreaker:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               default: true
 *             threshold:
 *               type: integer
 *               minimum: 1
 *               maximum: 100
 *               default: 5
 *             resetTimeout:
 *               type: integer
 *               minimum: 1000
 *               maximum: 60000
 *               default: 30000
 *         loadBalancer:
 *           type: object
 *           properties:
 *             strategy:
 *               type: string
 *               enum: [round-robin, weighted-round-robin]
 *               default: round-robin
 *             weights:
 *               type: object
 *               additionalProperties:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *         authentication:
 *           type: object
 *           properties:
 *             required:
 *               type: boolean
 *               default: true
 *             type:
 *               type: string
 *               enum: [jwt, api-key, none]
 *               default: jwt
 *         rateLimit:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *               default: true
 *             windowMs:
 *               type: integer
 *               minimum: 1000
 *               maximum: 3600000
 *               default: 900000
 *             max:
 *               type: integer
 *               minimum: 1
 *               maximum: 1000
 *               default: 100
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           default: active
 *     ServiceInstance:
 *       type: object
 *       required:
 *         - host
 *         - port
 *       properties:
 *         host:
 *           type: string
 *           description: Host address of the instance
 *         port:
 *           type: integer
 *           description: Port number
 *           minimum: 1
 *           maximum: 65535
 *         weight:
 *           type: integer
 *           description: Load balancing weight
 *           minimum: 1
 *           maximum: 10
 *           default: 1
 *         region:
 *           type: string
 *           description: Region identifier
 *           maxLength: 50
 *           default: default
 *         metadata:
 *           type: object
 *           description: Additional instance metadata
 *           default: {}
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Register a new service
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       201:
 *         description: Service registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Service registered successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         description: Invalid service data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *   get:
 *     summary: Get all services
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/services/{name}:
 *   get:
 *     summary: Get service by name
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Service name
 *     responses:
 *       200:
 *         description: Service details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/services/{serviceId}:
 *   put:
 *     summary: Update service configuration
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Service'
 *     responses:
 *       200:
 *         description: Service updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Service updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         description: Invalid service data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/services/{serviceId}/instances:
 *   post:
 *     summary: Register a new service instance
 *     tags: [Service Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceInstance'
 *     responses:
 *       201:
 *         description: Instance registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Service instance registered successfully
 *                 data:
 *                   $ref: '#/components/schemas/ServiceInstance'
 *       400:
 *         description: Invalid instance data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/services/{serviceId}/instances/{instanceId}:
 *   delete:
 *     summary: Remove a service instance
 *     tags: [Service Instances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Instance removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Service instance removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Instance not found
 */

/**
 * @swagger
 * /api/services/{serviceId}/health:
 *   get:
 *     summary: Perform health check on service instances
 *     tags: [Service Health]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Health check results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       instanceId:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [healthy, unhealthy]
 *                       responseTime:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /api/services/{serviceId}/next-instance:
 *   get:
 *     summary: Get next available instance for load balancing
 *     tags: [Service Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID
 *     responses:
 *       200:
 *         description: Next available instance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/ServiceInstance'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No available instances found
 */

/**
 * @route POST /api/services
 * @desc Register a new service (Only admin)
 */
router.post(
    '/',
    authenticate,
    authorize(['admin']),
    // validateService,
    serviceController.registerService
);

/**
 * @route GET /api/services
 * @desc Get all services
 */
router.get(
    '/',
    authenticate,
    serviceController.getAllServices
);

/**
 * @route GET /api/services/:name
 * @desc Get service by name
 */
router.get(
    '/:name',
    authenticate,
    serviceController.getServiceByName
);

/**
 * @route PUT /api/services/:serviceId
 * @desc Update service (Only admin)
 */
router.put(
    '/:serviceId',
    authenticate,
    authorize(['admin']),
    // validateService,
    serviceController.updateService
);

/**
 * @route POST /api/services/:serviceId/instances
 * @desc Register a new instance for service (Only admin)
 */
router.post(
    '/:serviceId/instances',
    authenticate,
    authorize(['admin']),
    // validateInstance,
    serviceController.registerInstance
);

/**
 * @route DELETE /api/services/:serviceId/instances/:instanceId
 * @desc Remove instance from service (Only admin)
 */
router.delete(
    '/:serviceId/instances/:instanceId',
    authenticate,
    authorize(['admin']),
    serviceController.removeInstance
);

/**
 * @route GET /api/services/:serviceId/health
 * @desc Check health of all instances of service
 */
router.get(
    '/:serviceId/health',
    authenticate,
    serviceController.healthCheck
);

/**
 * @route GET /api/services/:serviceId/next-instance
 * @desc Get next instance for load balancing
 */
router.get(
    '/:serviceId/next-instance',
    authenticate,
    serviceController.getNextInstance
);

module.exports = router; 