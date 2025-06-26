/**
 * @swagger
 * /:
 *   get:
 *     summary: API Gateway health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API Gateway is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "API Gateway is running!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */

/**
 * @swagger
 * /v1/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                     redis:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                     kafka:
 *                       type: string
 *                       enum: [connected, disconnected]
 */

/**
 * @swagger
 * /v1/services:
 *   get:
 *     summary: Get all registered services
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of registered services
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           serviceId:
 *                             type: string
 *                             format: uuid
 *                           serviceName:
 *                             type: string
 *                           version:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [active, inactive]
 *                           registeredAt:
 *                             type: string
 *                             format: date-time
 *                           instances:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 instanceId:
 *                                   type: string
 *                                 host:
 *                                   type: string
 *                                 port:
 *                                   type: integer
 *                                 health:
 *                                   type: string
 *                                   enum: [healthy, unhealthy]
 *                                 lastHeartbeat:
 *                                   type: string
 *                                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/services/{serviceName}:
 *   get:
 *     summary: Get service details by name
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Service name
 *         example: user-service
 *     responses:
 *       200:
 *         description: Service details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceId:
 *                           type: string
 *                           format: uuid
 *                         serviceName:
 *                           type: string
 *                         version:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [active, inactive]
 *                         endpoints:
 *                           type: array
 *                           items:
 *                             type: string
 *                         instances:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               instanceId:
 *                                 type: string
 *                               host:
 *                                 type: string
 *                               port:
 *                                 type: integer
 *                               health:
 *                                 type: string
 *                                 enum: [healthy, unhealthy]
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/services/register:
 *   post:
 *     summary: Register a new service
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceName
 *               - version
 *               - host
 *               - port
 *             properties:
 *               serviceName:
 *                 type: string
 *                 example: user-service
 *               version:
 *                 type: string
 *                 example: "1.0.0"
 *               host:
 *                 type: string
 *                 example: localhost
 *               port:
 *                 type: integer
 *                 example: 3001
 *               endpoints:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["/v1/users", "/v1/health"]
 *               healthCheckPath:
 *                 type: string
 *                 example: "/health"
 *     responses:
 *       201:
 *         description: Service registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         serviceId:
 *                           type: string
 *                           format: uuid
 *                         instanceId:
 *                           type: string
 *                           format: uuid
 *       400:
 *         description: Invalid service data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/services/deregister/{serviceId}:
 *   delete:
 *     summary: Deregister a service
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
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
 *         description: Service deregistered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/services/heartbeat/{instanceId}:
 *   post:
 *     summary: Send heartbeat for service instance
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: instanceId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Instance ID
 *     responses:
 *       200:
 *         description: Heartbeat received
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       404:
 *         description: Instance not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/{serviceName}/{path}:
 *   all:
 *     summary: Route request to service
 *     tags: [System]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service name
 *         example: user
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Service endpoint path
 *         example: passengers/getAllPassengers
 *     responses:
 *       200:
 *         description: Request routed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Response from target service
 *       404:
 *         description: Service or endpoint not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */ 