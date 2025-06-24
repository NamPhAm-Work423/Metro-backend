const express = require('express');
const router = express.Router();
const routingController = require('../controllers/routing.controller');
const { validateAPIKeyMiddleware } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: x-api-key
 *       description: 'API key required for routing endpoints. Get from /v1/auth/key/{userId}'
 * 
 * tags:
 *   - name: Routing
 *     description: |
 *       ## 🚀 Dynamic Routing to Microservices
 *       
 *       These endpoints provide access to registered microservices through the API gateway.
 *       
 *       ### 🔑 Authentication Required
 *       All routing endpoints require an **API Key** in the `x-api-key` header.
 *       
 *       ### 📝 How to Get API Key:
 *       1. **Register**: POST `/v1/auth/register`
 *       2. **Login**: POST `/v1/auth/login` (save accessToken)
 *       3. **Generate API Key**: GET `/v1/auth/key/{userId}` with JWT token
 *       4. **Use API Key**: Add `x-api-key: YOUR_API_KEY` header
 *       
 *       ### 🎯 Available Services:
 *       - **Passenger Service**: `/v1/route/passengers/*` - Passenger management
 *       
 *       ### 📖 Example Usage:
 *       ```bash
 *       # List all passengers
 *       curl -H "x-api-key: YOUR_API_KEY" \\
 *            http://localhost:3000/v1/route/passengers
 *       
 *       # Get specific passenger
 *       curl -H "x-api-key: YOUR_API_KEY" \\
 *            http://localhost:3000/v1/route/passengers/123
 *       
 *       # Create new passenger
 *       curl -X POST \\
 *            -H "x-api-key: YOUR_API_KEY" \\
 *            -H "Content-Type: application/json" \\
 *            -d '{"name":"John","email":"john@example.com"}' \\
 *            http://localhost:3000/v1/route/passengers
 *       ```
 *       
 *       ### 🔄 Load Balancing
 *       The gateway automatically load balances requests across available service instances.
 *       
 *       ### ⚡ Features:
 *       - **Circuit Breaker**: Automatic failover if service is down
 *       - **Rate Limiting**: Request throttling per API key
 *       - **Request Forwarding**: Headers and body passed through to services
 *       - **Response Proxying**: Service responses returned as-is
 */

/**
 * @swagger
 * /v1/route/{endPoint}:
 *   get:
 *     summary: 🔀 GET - Route request to microservice
 *     description: |
 *       Forward GET requests to registered microservices.
 *       
 *       **Path Parameter**: `endPoint` - The service endpoint (e.g., "passengers")
 *       
 *       **Examples**:
 *       - `/v1/route/passengers` → Routes to passenger service
 *       - `/v1/route/passengers/123` → Routes to passenger service with ID 123
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *       - in: query
 *         name: "*"
 *         required: false
 *         schema:
 *           type: string
 *         description: Any query parameters will be forwarded to the target service
 *         example: "?page=1&limit=10"
 *     responses:
 *       200:
 *         description: ✅ Request successfully forwarded to service
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               description: Response from the target microservice
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
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
 *                   example: "API key is required"
 *       404:
 *         description: ❌ Service not found or no healthy instances
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
 *                   example: "Service not found"
 *       503:
 *         description: ❌ Service unavailable
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
 *                   example: "Service temporarily unavailable"
 *   post:
 *     summary: 📝 POST - Create resource in microservice
 *     description: |
 *       Forward POST requests to create resources in registered microservices.
 *       
 *       **Path Parameter**: `endPoint` - The service endpoint (e.g., "passengers")
 *       
 *       **Example**: POST `/v1/route/passengers` with passenger data
 *       
 *       **Authentication**: API Key required in `x-api-key` header
 *     tags: [Routing]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: endPoint
 *         required: true
 *         schema:
 *           type: string
 *         description: Target service endpoint name
 *         example: passengers
 *     requestBody:
 *       description: Request body will be forwarded to the target service
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Data to send to the microservice
 *           example:
 *             name: "John Doe"
 *             email: "john@example.com"
 *             phone: "+1234567890"
 *     responses:
 *       200:
 *         description: ✅ Resource created successfully
 *       201:
 *         description: ✅ Resource created successfully
 *       400:
 *         description: ❌ Bad request - Invalid data
 *       401:
 *         description: ❌ Unauthorized - Invalid or missing API key
 *       404:
 *         description: ❌ Service not found
 *       503:
 *         description: ❌ Service unavailable
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
 *       - ApiKeyAuth: []
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
router.all('/:endPoint', authMiddleware.validateAPIKeyMiddleware, routingController.routeToService);
router.all('/:endPoint/*', authMiddleware.validateAPIKeyMiddleware, routingController.routeToService);

module.exports = router;
