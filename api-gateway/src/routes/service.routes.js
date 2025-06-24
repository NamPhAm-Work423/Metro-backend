const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique service identifier
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: Service name (must be unique)
 *           example: "passenger-service"
 *         endPoint:
 *           type: string
 *           description: Service endpoint path
 *           example: "passengers"
 *         description:
 *           type: string
 *           description: Service description
 *           example: "Passenger management service"
 *         version:
 *           type: string
 *           description: Service version
 *           example: "1.0.0"
 *         timeout:
 *           type: integer
 *           description: Request timeout in milliseconds
 *           example: 5000
 *         retries:
 *           type: integer
 *           description: Number of retry attempts
 *           example: 3
 *         status:
 *           type: string
 *           enum: [active, inactive, maintenance]
 *           description: Service status
 *           example: active
 *         authentication:
 *           type: object
 *           description: Authentication configuration
 *         circuitBreaker:
 *           type: object
 *           description: Circuit breaker configuration
 *         loadBalancer:
 *           type: object
 *           description: Load balancer configuration
 *         rateLimit:
 *           type: object
 *           description: Rate limiting configuration
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ServiceInstance:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique instance identifier
 *         serviceId:
 *           type: string
 *           format: uuid
 *           description: Parent service ID
 *         host:
 *           type: string
 *           description: Instance hostname/IP
 *           example: "localhost"
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
 *           description: Service region/zone
 *           example: "default"
 *         status:
 *           type: string
 *           enum: [active, inactive, unhealthy]
 *           description: Instance status
 *           example: active
 *         isHealthy:
 *           type: boolean
 *           description: Health check status
 *           example: true
 *         lastHealthCheck:
 *           type: string
 *           format: date-time
 *           description: Last health check timestamp
 *         metadata:
 *           type: object
 *           description: Additional instance metadata
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateServiceRequest:
 *       type: object
 *       required:
 *         - name
 *         - endPoint
 *       properties:
 *         name:
 *           type: string
 *           description: Unique service name
 *           example: "payment-service"
 *         endPoint:
 *           type: string
 *           description: Service endpoint path
 *           example: "payments"
 *         description:
 *           type: string
 *           description: Service description
 *           example: "Payment processing service"
 *         version:
 *           type: string
 *           description: Service version
 *           example: "1.0.0"
 *         timeout:
 *           type: integer
 *           description: Request timeout in milliseconds
 *           example: 5000
 *         retries:
 *           type: integer
 *           description: Number of retry attempts
 *           example: 3
 *     CreateInstanceRequest:
 *       type: object
 *       required:
 *         - host
 *         - port
 *       properties:
 *         host:
 *           type: string
 *           description: Instance hostname or IP
 *           example: "payment-service-1"
 *         port:
 *           type: integer
 *           description: Instance port number
 *           example: 3002
 *         weight:
 *           type: integer
 *           description: Load balancing weight with default value 1
 *           example: 1
 *         region:
 *           type: string
 *           description: Service region/zone with default value default
 *           example: "us-east-1"
 *         metadata:
 *           type: object
 *           description: Additional instance metadata
 *           example:
 *             environment: "production"
 *             datacenter: "aws-us-east-1a"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: 'JWT token from login. Format: Bearer <token>'
 * 
 * tags:
 *   - name: Service Management
 *     description: |
 *       ## 🔧 Service & Instance Management
 *       
 *       Manage microservices and their instances in the API gateway.
 *       
 *       ### 🔑 Authentication Required
 *       All service management endpoints require **JWT Bearer Token** authentication.
 *       
 *       ### 📝 How to Get JWT Token:
 *       1. **Login**: POST `/v1/auth/login` with email/password
 *       2. **Copy Token**: Save the `accessToken` from response
 *       3. **Use Token**: Add `Authorization: Bearer <token>` header
 *       
 *       ### 🎯 What You Can Do:
 *       - **View Services**: List all registered services and their instances
 *       - **Register Services**: Add new microservices to the gateway
 *       - **Manage Instances**: Add/remove service instances for load balancing
 *       - **Monitor Health**: Check service instance health status
 *       
 *       ### 📖 Example Flow:
 *       ```bash
 *       # 1. Get JWT token from login
 *       TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       
 *       # 2. List all services
 *       curl -H "Authorization: Bearer $TOKEN" \\
 *            http://localhost:3000/v1/service
 *       
 *       # 3. Create a new service
 *       curl -X POST \\
 *            -H "Authorization: Bearer $TOKEN" \\
 *            -H "Content-Type: application/json" \\
 *            -d '{"name":"payment-service","endPoint":"payments"}' \\
 *            http://localhost:3000/v1/service
 *       
 *       # 4. Add instance to service
 *       curl -X POST \\
 *            -H "Authorization: Bearer $TOKEN" \\
 *            -H "Content-Type: application/json" \\
 *            -d '{"host":"payment-api","port":3002}' \\
 *            http://localhost:3000/v1/service/SERVICE_ID/instances
 *       ```
 *       
 *       ### ⚠️ Important Notes:
 *       - Only authenticated users can manage services
 *       - Service names must be unique across the gateway
 *       - Instances are automatically health-checked
 *       - Changes take effect immediately for routing
 */

/**
 * @swagger
 * /v1/service:
 *   get:
 *     summary: 📋 List all registered services
 *     description: |
 *       Retrieve a list of all services registered in the API gateway.
 *       
 *       **Returns**: Array of services with their instances and configurations.
 *       
 *       **Use this to**: Check what services are available for routing.
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ✅ Services retrieved successfully
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
 *                   example: "Services retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *             example:
 *               success: true
 *               message: "Services retrieved successfully"
 *               data:
 *                 - id: "123e4567-e89b-12d3-a456-426614174000"
 *                   name: "passenger-service"
 *                   endPoint: "passengers"
 *                   description: "Passenger management service"
 *                   version: "1.0.0"
 *                   status: "active"
 *                   timeout: 5000
 *                   retries: 3
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access token is required"
 *   post:
 *     summary: ➕ Register a new service
 *     description: |
 *       Register a new microservice in the API gateway.
 *       
 *       **After registration**: The service will be available for routing at `/v1/route/{endPoint}`
 *       
 *       **Next step**: Add service instances using `/v1/service/{serviceId}/instances`
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequest'
 *           examples:
 *             payment-service:
 *               summary: Payment Service
 *               value:
 *                 name: "payment-service"
 *                 endPoint: "payments"
 *                 description: "Payment processing service"
 *                 version: "1.0.0"
 *                 timeout: 5000
 *                 retries: 3
 *             notification-service:
 *               summary: Notification Service
 *               value:
 *                 name: "notification-service"
 *                 endPoint: "notifications"
 *                 description: "Email and SMS notification service"
 *                 version: "2.1.0"
 *     responses:
 *       201:
 *         description: ✅ Service registered successfully
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
 *                   example: "Service created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *       400:
 *         description: ❌ Bad request - Validation errors
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       409:
 *         description: ❌ Conflict - Service name already exists
 */
router.get('/', authMiddleware.authenticate, serviceController.getAllService);
router.post('/', authMiddleware.authenticate, serviceController.createService);

/**
 * @swagger
 * /v1/service/{serviceId}:
 *   get:
 *     summary: 🔍 Get service details by ID
 *     description: |
 *       Retrieve detailed information about a specific service including all its instances.
 *       
 *       **Returns**: Complete service configuration and instance list.
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique service identifier
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: ✅ Service details retrieved successfully
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
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service not found
 *   put:
 *     summary: ✏️ Update service configuration
 *     description: |
 *       Update service configuration settings.
 *       
 *       **Note**: Changes take effect immediately for new requests.
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique service identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateServiceRequest'
 *     responses:
 *       200:
 *         description: ✅ Service updated successfully
 *       400:
 *         description: ❌ Bad request - Validation errors
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service not found
 *   delete:
 *     summary: 🗑️ Delete service
 *     description: |
 *       Delete a service and all its instances from the gateway.
 *       
 *       **Warning**: This will immediately stop routing to this service!
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique service identifier
 *     responses:
 *       200:
 *         description: ✅ Service deleted successfully
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service not found
 */
router.get('/:serviceId', authMiddleware.authenticate, serviceController.getServiceById);
router.put('/:serviceId', authMiddleware.authenticate, serviceController.updateService);
router.delete('/:serviceId', authMiddleware.authenticate, serviceController.deleteService);

/**
 * @swagger
 * /v1/service/{serviceId}/instances:
 *   get:
 *     summary: 📋 List service instances
 *     description: |
 *       Get all instances for a specific service.
 *       
 *       **Returns**: List of instances with health status and configuration.
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID to get instances for
 *     responses:
 *       200:
 *         description: ✅ Service instances retrieved successfully
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
 *                     $ref: '#/components/schemas/ServiceInstance'
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service not found
 *   post:
 *     summary: ➕ Add service instance
 *     description: |
 *       Add a new instance to an existing service for load balancing.
 *       
 *       **Use case**: Scale your service by adding more instances.
 *       
 *       **Load balancing**: Requests will be automatically distributed across all healthy instances.
 *     tags: [Service Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Service ID to add instance to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInstanceRequest'
 *           examples:
 *             local-instance:
 *               summary: Local Development Instance
 *               value:
 *                 host: "localhost"
 *                 port: 3002
 *                 weight: 1
 *                 region: "local"
 *             production-instance:
 *               summary: Production Instance
 *               value:
 *                 host: "payment-service-prod"
 *                 port: 80
 *                 weight: 2
 *                 region: "us-east-1"
 *                 metadata:
 *                   environment: "production"
 *                   datacenter: "aws-us-east-1a"
 *     responses:
 *       201:
 *         description: ✅ Service instance added successfully
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
 *                   example: "Service instance created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ServiceInstance'
 *       400:
 *         description: ❌ Bad request - Validation errors
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service not found
 *       409:
 *         description: ❌ Conflict - Instance with same host:port already exists
 */
router.get('/:serviceId/instances', authMiddleware.authenticate, serviceController.getServiceInstances);
router.post('/:serviceId/instances', authMiddleware.authenticate, serviceController.createNewInstance);

/**
 * @swagger
 * /v1/service/{serviceId}/instances/{instanceId}:
 *   get:
 *     summary: 🔍 Get instance details
 *     description: |
 *       Get detailed information about a specific service instance.
 *       
 *       **Returns**: Instance configuration, health status, and metadata.
 *     tags: [Service Management]
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
 *         description: ✅ Instance details retrieved successfully
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
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service or instance not found
 *   put:
 *     summary: ✏️ Update instance configuration
 *     description: |
 *       Update service instance configuration.
 *       
 *       **Common use cases**:
 *       - Change load balancing weight
 *       - Update region/metadata
 *       - Modify health check settings
 *     tags: [Service Management]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInstanceRequest'
 *     responses:
 *       200:
 *         description: ✅ Instance updated successfully
 *       400:
 *         description: ❌ Bad request - Validation errors
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service or instance not found
 *   delete:
 *     summary: 🗑️ Remove service instance
 *     description: |
 *       Remove a service instance from the load balancer.
 *       
 *       **Warning**: Traffic will no longer be routed to this instance!
 *       
 *       **Use case**: Scale down or remove unhealthy instances.
 *     tags: [Service Management]
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
 *         description: Instance ID to remove
 *     responses:
 *       200:
 *         description: ✅ Instance removed successfully
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: ❌ Service or instance not found
 */
router.get('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.getInstanceById);
router.put('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.updateInstance);
router.delete('/:serviceId/instances/:instanceId', authMiddleware.authenticate, serviceController.deleteInstance);

module.exports = router;