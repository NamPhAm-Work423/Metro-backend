const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const authMiddleware = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: accessToken
 *       description: 'JWT token stored in HTTP-only cookie (automatic)'
 * 
 * tags:
 *   - name: Routing
 *     description: |
 *       ## 🚀 Service Routing
 *       
 *       Access registered microservices through the API gateway.
 *       
 *       ### Authentication:
 *       - JWT automatically sent via HTTP-only cookie
 *       - API keys handled automatically by backend
 *       - Zero token management required
 *       
 *       ### Available Services:
 *       - **Passenger Service**: `/v1/route/passengers/*`
 *       
 *       ### Example Usage:
 *       ```bash
 *       # Get all passengers (cookies auto-sent)
 *       curl --cookie cookies.txt /v1/route/passengers
 *       
 *       # Get specific passenger (cookies auto-sent)
 *       curl --cookie cookies.txt /v1/route/passengers/123
 *       
 *       # Create passenger (cookies auto-sent)
 *       curl -X POST --cookie cookies.txt \\
 *         -H "Content-Type: application/json" \\
 *         -d '{"name":"John","email":"john@example.com"}' \\
 *         /v1/route/passengers
 *       ```
 *       
 *       ### Features:
 *       - Load balancing across service instances
 *       - Circuit breaker for fault tolerance
 *       - Rate limiting per user
 *       - Request/response forwarding
 */

/**
 * @swagger
 * /v1/route/{endPoint}:
 *   get:
 *     summary: GET - Route request to microservice
 *     description: |
 *       Forward GET requests to registered microservices.
 *       
 *       **Examples**:
 *       - `/v1/route/passengers` → Get all passengers
 *       - `/v1/route/passengers/123` → Get passenger with ID 123
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint
 *         example: passengers
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Request forwarded successfully
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: Service not found
 *       503:
 *         description: Service unavailable
 *   post:
 *     summary: POST - Create resource in microservice
 *     description: |
 *       Forward POST requests to create resources in microservices.
 *       
 *       **Example**: POST `/v1/route/passengers` with passenger data
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint
 *         example: passengers
 *     requestBody:
 *       description: Data to send to the microservice
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *           example:
 *             name: "John Doe"
 *             email: "john@example.com"
 *             phone: "+1234567890"
 *     responses:
 *       200:
 *         description: Resource created successfully
 *       201:
 *         description: Resource created successfully
 *       400:
 *         description: Bad request - Invalid data
 *       401:
 *         description: Unauthorized - Invalid or missing JWT token
 *       404:
 *         description: Service not found
 *       503:
 *         description: Service unavailable
 *   put:
 *     summary: ✏️ PUT - Update resource in microservice
 *     description: |
 *       Forward PUT requests to update resources in registered microservices.
 *       
 *       **Path Parameter**: `endPoint` - The service endpoint (e.g., "passengers")
 *       
 *       **Example**: PUT `/v1/route/passengers/123` to update passenger with ID 123
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *     requestBody:
 *       description: Updated data to send to the target service
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Updated resource data
 *           example:
 *             name: "John Smith"
 *             email: "johnsmith@example.com"
 *             phone: "+1234567891"
 *     responses:
 *       200:
 *         description: ✅ Resource updated successfully
 *       400:
 *         description: ❌ Bad request - Invalid data
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Resource or service not found
 *       503:
 *         description: ❌ Service unavailable
 *   patch:
 *     summary: 🔧 PATCH - Partially update resource in microservice
 *     description: |
 *       Forward PATCH requests to partially update resources in registered microservices.
 *       
 *       **Path Parameter**: `endPoint` - The service endpoint (e.g., "passengers")
 *       
 *       **Example**: PATCH `/v1/route/passengers/123` to update specific fields
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *     requestBody:
 *       description: Partial data to update in the target service
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial resource data
 *           example:
 *             email: "newemail@example.com"
 *     responses:
 *       200:
 *         description: ✅ Resource updated successfully
 *       400:
 *         description: ❌ Bad request - Invalid data
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Resource or service not found
 *       503:
 *         description: ❌ Service unavailable
 *   delete:
 *     summary: 🗑️ DELETE - Delete resource in microservice
 *     description: |
 *       Forward DELETE requests to remove resources in registered microservices.
 *       
 *       **Path Parameter**: `endPoint` - The service endpoint (e.g., "passengers")
 *       
 *       **Example**: DELETE `/v1/route/passengers/123` to delete passenger with ID 123
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *     responses:
 *       200:
 *         description: ✅ Resource deleted successfully
 *       204:
 *         description: ✅ Resource deleted successfully (no content)
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Resource or service not found
 *       503:
 *         description: ❌ Service unavailable
 */

/**
 * @swagger
 * /v1/route/{endPoint}/{path}:
 *   get:
 *     summary: 🔀 GET - Route with sub-path to microservice
 *     description: |
 *       Forward GET requests with sub-paths to registered microservices.
 *       
 *       **Path Parameters**: 
 *       - `endPoint` - The service endpoint (e.g., "passengers")
 *       - `path` - Additional path segments (e.g., "123/profile")
 *       
 *       **Examples**:
 *       - `/v1/route/passengers/123` → Get passenger with ID 123
 *       - `/v1/route/passengers/123/bookings` → Get bookings for passenger 123
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Additional path segments for the service
 *         example: "123/bookings"
 *     responses:
 *       200:
 *         description: ✅ Request successfully forwarded
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service or resource not found
 *       503:
 *         description: ❌ Service unavailable
 *   post:
 *     summary: 📝 POST - Create with sub-path in microservice
 *     description: |
 *       Forward POST requests with sub-paths to registered microservices.
 *       
 *       **Example**: POST `/v1/route/passengers/123/bookings` to create booking for passenger 123
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Additional path segments for the service
 *         example: "123/bookings"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: ✅ Resource created successfully
 *       201:
 *         description: ✅ Resource created successfully
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service not found
 *       503:
 *         description: ❌ Service unavailable
 *   put:
 *     summary: ✏️ PUT - Update with sub-path in microservice
 *     description: Forward PUT requests with sub-paths to registered microservices.
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Additional path segments for the service
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: ✅ Resource updated successfully
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service or resource not found
 *       503:
 *         description: ❌ Service unavailable
 *   patch:
 *     summary: 🔧 PATCH - Partially update with sub-path in microservice
 *     description: Forward PATCH requests with sub-paths to registered microservices.
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Additional path segments for the service
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: ✅ Resource updated successfully
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service or resource not found
 *       503:
 *         description: ❌ Service unavailable
 *   delete:
 *     summary: 🗑️ DELETE - Delete with sub-path in microservice
 *     description: Forward DELETE requests with sub-paths to registered microservices.
 *     tags: [Routing]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *       - in: path
 *         name: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Additional path segments for the service
 *     responses:
 *       200:
 *         description: ✅ Resource deleted successfully
 *       204:
 *         description: ✅ Resource deleted successfully (no content)
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service or resource not found
 *       503:
 *         description: ❌ Service unavailable
 */

// Dynamic routing - all HTTP methods supported
// More specific routes first - catches paths with additional segments
router.all('/:endPoint/*', authMiddleware.autoInjectAPIKeyMiddleware, routingController.useService);
// Less specific routes last - catches exact endpoint matches
router.all('/:endPoint', authMiddleware.autoInjectAPIKeyMiddleware, routingController.useService);

module.exports = router;
