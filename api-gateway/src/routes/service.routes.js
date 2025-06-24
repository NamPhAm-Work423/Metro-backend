const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { authenticate } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     ServiceRequest:
 *       type: object
 *       required:
 *         - name
 *         - endPoint
 *       properties:
 *         name:
 *           type: string
 *           description: Unique service name
 *           example: passenger-service
 *         endPoint:
 *           type: string
 *           description: Service endpoint path
 *           example: passengers
 *         description:
 *           type: string
 *           description: Service description
 *           example: Passenger management service
 *         version:
 *           type: string
 *           description: Service version
 *           example: 1.0.0
 *         timeout:
 *           type: integer
 *           description: Request timeout in milliseconds
 *           example: 5000
 *         retries:
 *           type: integer
 *           description: Number of retry attempts
 *           example: 3
 *     ServiceInstanceRequest:
 *       type: object
 *       required:
 *         - id
 *         - host
 *         - port
 *       properties:
 *         id:
 *           type: string
 *           description: Instance identifier
 *           example: passenger-service-instance-1
 *         host:
 *           type: string
 *           description: Instance host address
 *           example: passenger-service
 *         port:
 *           type: integer
 *           description: Instance port number
 *           example: 3001
 *         weight:
 *           type: integer
 *           description: Load balancing weight
 *           example: 1
 *         region:
 *           type: string
 *           description: Instance region
 *           example: default
 *     ServiceResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             endPoint:
 *               type: string
 *             status:
 *               type: string
 *             instances:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   host:
 *                     type: string
 *                   port:
 *                     type: integer
 *                   status:
 *                     type: string
 *                   isHealthy:
 *                     type: boolean
 */

/**
 * @swagger
 * /v1/service:
 *   post:
 *     summary: Create a new service
 *     description: Register a new service in the API gateway
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceRequest'
 *     responses:
 *       200:
 *         description: Service created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - JWT token required
 *       409:
 *         description: Service already exists
 *   get:
 *     summary: Get all services
 *     description: Retrieve a list of all registered services
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of services retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ServiceResponse/properties/data'
 *       401:
 *         description: Unauthorized - JWT token required
 */

/**
 * @swagger
 * /v1/service/{name}:
 *   get:
 *     summary: Get service by name
 *     description: Retrieve a specific service by its name
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Service name
 *         example: passenger-service
 *     responses:
 *       200:
 *         description: Service retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceResponse'
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Service not found
 *   delete:
 *     summary: Delete a service
 *     description: Delete a service and all its instances
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Service name
 *         example: passenger-service
 *     responses:
 *       200:
 *         description: Service deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Service deleted successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /v1/service-instance:
 *   post:
 *     summary: Create a new service instance
 *     description: Register a new instance for an existing service
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServiceInstanceRequest'
 *     responses:
 *       200:
 *         description: Service instance created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     host:
 *                       type: string
 *                     port:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     isHealthy:
 *                       type: boolean
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Service not found
 */

/**
 * @swagger
 * /v1/service-instance/{id}:
 *   delete:
 *     summary: Delete a service instance
 *     description: Remove a service instance from the system
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Service instance ID
 *         example: passenger-service-instance-1
 *     responses:
 *       200:
 *         description: Service instance deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Instance deleted successfully
 *       401:
 *         description: Unauthorized - JWT token required
 *       404:
 *         description: Service instance not found
 */

router.post('/service', authenticate, serviceController.createService);
router.delete('/service/:name', authenticate, serviceController.deleteService);
router.get('/service', authenticate, serviceController.getAllService);
router.get('/service/:name', authenticate, serviceController.getServiceByName);

router.post('/service-instance', authenticate, serviceController.createNewInstance);
router.delete('/service-instance/:id', authenticate, serviceController.deleteInstance);

module.exports = router;