/**
 * @swagger
 * components:
 *   schemas:
 *     Station:
 *       type: object
 *       required:
 *         - name
 *         - location
 *         - latitude
 *         - longitude
 *         - openTime
 *         - closeTime
 *       properties:
 *         stationId:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the station
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: Name of the station
 *         location:
 *           type: string
 *           maxLength: 100
 *           description: Physical location of the station
 *         latitude:
 *           type: number
 *           format: float
 *           description: Latitude coordinate
 *         longitude:
 *           type: number
 *           format: float
 *           description: Longitude coordinate
 *         openTime:
 *           type: string
 *           format: time
 *           description: Station opening time
 *         closeTime:
 *           type: string
 *           format: time
 *           description: Station closing time
 *         facilities:
 *           type: object
 *           description: Available facilities at the station
 *         connections:
 *           type: object
 *           description: Connection information
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the station is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Route:
 *       type: object
 *       required:
 *         - name
 *         - originId
 *         - destinationId
 *         - distance
 *         - duration
 *       properties:
 *         routeId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           maxLength: 100
 *         originId:
 *           type: string
 *           format: uuid
 *           description: Origin station ID
 *         destinationId:
 *           type: string
 *           format: uuid
 *           description: Destination station ID
 *         distance:
 *           type: number
 *           format: float
 *           description: Route distance in kilometers
 *         duration:
 *           type: number
 *           format: float
 *           description: Route duration in minutes
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Train:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - capacity
 *       properties:
 *         trainId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           maxLength: 100
 *         type:
 *           type: string
 *           enum: [standard, express, freight]
 *           default: standard
 *         capacity:
 *           type: integer
 *           description: Maximum passenger capacity
 *         status:
 *           type: string
 *           enum: [active, maintenance, out-of-service]
 *           default: active
 *         lastMaintenance:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Trip:
 *       type: object
 *       required:
 *         - routeId
 *         - trainId
 *         - departureTime
 *         - arrivalTime
 *         - dayOfWeek
 *       properties:
 *         tripId:
 *           type: string
 *           format: uuid
 *         routeId:
 *           type: string
 *           format: uuid
 *         trainId:
 *           type: string
 *           format: uuid
 *         departureTime:
 *           type: string
 *           format: time
 *         arrivalTime:
 *           type: string
 *           format: time
 *         dayOfWeek:
 *           type: string
 *           enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *         isActive:
 *           type: boolean
 *           default: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     Stop:
 *       type: object
 *       required:
 *         - tripId
 *         - stationId
 *         - sequence
 *       properties:
 *         stopId:
 *           type: string
 *           format: uuid
 *         tripId:
 *           type: string
 *           format: uuid
 *         stationId:
 *           type: string
 *           format: uuid
 *         arrivalTime:
 *           type: string
 *           format: time
 *           description: Null for first station
 *         departureTime:
 *           type: string
 *           format: time
 *           description: Null for last station
 *         sequence:
 *           type: integer
 *           description: Order of stop in the trip
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     RouteStation:
 *       type: object
 *       required:
 *         - routeId
 *         - stationId
 *         - sequence
 *       properties:
 *         routeStationId:
 *           type: string
 *           format: uuid
 *         routeId:
 *           type: string
 *           format: uuid
 *         stationId:
 *           type: string
 *           format: uuid
 *         sequence:
 *           type: integer
 *           description: Order of station in the route
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 * 
 * security:
 *   - bearerAuth: []
 */

/**
 * @swagger
 * tags:
 *   - name: Stations
 *     description: Station management endpoints
 *   - name: Routes
 *     description: Route management endpoints
 *   - name: Trains
 *     description: Train management endpoints
 *   - name: Trips
 *     description: Trip management endpoints
 *   - name: Stops
 *     description: Stop management endpoints
 *   - name: Route Stations
 *     description: Route-Station relationship management
 */

// STATION ENDPOINTS
/**
 * @swagger
 * /v1/route/transport/station:
 *   get:
 *     summary: Get all stations
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * 
 *   post:
 *     summary: Create a new station (Admin only)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - location
 *               - latitude
 *               - longitude
 *               - openTime
 *               - closeTime
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               openTime:
 *                 type: string
 *                 format: time
 *               closeTime:
 *                 type: string
 *                 format: time
 *               facilities:
 *                 type: object
 *               connections:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Station created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Station'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin only)
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/route/transport/station/active:
 *   get:
 *     summary: Get all active stations
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 */

/**
 * @swagger
 * /v1/route/transport/station/operating/current:
 *   get:
 *     summary: Get stations currently operating (within operating hours)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of currently operating stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Station'
 */

/**
 * @swagger
 * /v1/route/transport/station/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Station details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Station'
 *       404:
 *         description: Station not found
 * 
 *   put:
 *     summary: Update station (Admin only)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
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
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               latitude:
 *                 type: number
 *                 format: float
 *               longitude:
 *                 type: number
 *                 format: float
 *               openTime:
 *                 type: string
 *                 format: time
 *               closeTime:
 *                 type: string
 *                 format: time
 *               facilities:
 *                 type: object
 *               connections:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Station updated successfully
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Station not found
 * 
 *   delete:
 *     summary: Delete station (Admin only)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Station deleted successfully
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Station not found
 */

/**
 * @swagger
 * /v1/route/transport/station/{id}/facilities:
 *   put:
 *     summary: Update station facilities (Admin only)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
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
 *               facilities:
 *                 type: object
 *                 description: Updated facilities information
 *     responses:
 *       200:
 *         description: Station facilities updated successfully
 *       403:
 *         description: Forbidden (Admin only)
 *       404:
 *         description: Station not found
 */

/**
 * @swagger
 * /v1/route/transport/station/{stationId}/next-stops:
 *   get:
 *     summary: Get next stops at a station
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of next stops at the station
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stop'
 */

/**
 * @swagger
 * /v1/route/transport/station/{stationId}/routes:
 *   get:
 *     summary: Get routes by station
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of routes serving the station
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 */

// ROUTE ENDPOINTS
/**
 * @swagger
 * /v1/route/transport/route:
 *   get:
 *     summary: Get all routes
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 * 
 *   post:
 *     summary: Create a new route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - originId
 *               - destinationId
 *               - distance
 *               - duration
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               originId:
 *                 type: string
 *                 format: uuid
 *               destinationId:
 *                 type: string
 *                 format: uuid
 *               distance:
 *                 type: number
 *                 format: float
 *               duration:
 *                 type: number
 *                 format: float
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Route created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/route/active:
 *   get:
 *     summary: Get all active routes
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active routes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 */

/**
 * @swagger
 * /v1/route/transport/route/search/between-stations:
 *   get:
 *     summary: Search routes between two stations
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: originId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: destinationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Routes between the specified stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Route'
 */

/**
 * @swagger
 * /v1/route/transport/route/{id}:
 *   get:
 *     summary: Get route by ID
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Route details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Route'
 * 
 *   put:
 *     summary: Update route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/Route'
 *     responses:
 *       200:
 *         description: Route updated successfully
 *       403:
 *         description: Forbidden (Admin only)
 * 
 *   delete:
 *     summary: Delete route (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

// TRAIN ENDPOINTS
/**
 * @swagger
 * /v1/route/transport/train:
 *   get:
 *     summary: Get all trains (Staff/Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Train'
 *       403:
 *         description: Forbidden (Staff/Admin only)
 * 
 *   post:
 *     summary: Create a new train (Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - capacity
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [standard, express, freight]
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, out-of-service]
 *                 default: active
 *               lastMaintenance:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Train created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/train/active:
 *   get:
 *     summary: Get all active trains
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active trains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Train'
 */

/**
 * @swagger
 * /v1/route/transport/train/type/{type}:
 *   get:
 *     summary: Get trains by type
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [standard, express, freight]
 *     responses:
 *       200:
 *         description: List of trains of specified type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Train'
 */

// TRIP ENDPOINTS  
/**
 * @swagger
 * /v1/route/transport/trip:
 *   get:
 *     summary: Get all trips (Staff/Admin only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 * 
 *   post:
 *     summary: Create a new trip (Admin only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - trainId
 *               - departureTime
 *               - arrivalTime
 *               - dayOfWeek
 *             properties:
 *               routeId:
 *                 type: string
 *                 format: uuid
 *               trainId:
 *                 type: string
 *                 format: uuid
 *               departureTime:
 *                 type: string
 *                 format: time
 *               arrivalTime:
 *                 type: string
 *                 format: time
 *               dayOfWeek:
 *                 type: string
 *                 enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Trip created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/trip/active:
 *   get:
 *     summary: Get all active trips
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active trips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 */

/**
 * @swagger
 * /v1/route/transport/trip/upcoming:
 *   get:
 *     summary: Get upcoming trips
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming trips
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 */

/**
 * @swagger
 * /v1/route/transport/trip/search/between-stations:
 *   get:
 *     summary: Search trips between stations
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: originId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: destinationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departureDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Trips between specified stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Trip'
 */

// STOP ENDPOINTS
/**
 * @swagger
 * /v1/route/transport/stop:
 *   get:
 *     summary: Get all stops (Staff/Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of stops
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stop'
 * 
 *   post:
 *     summary: Create a new stop (Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tripId
 *               - stationId
 *               - sequence
 *             properties:
 *               tripId:
 *                 type: string
 *                 format: uuid
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               arrivalTime:
 *                 type: string
 *                 format: time
 *               departureTime:
 *                 type: string
 *                 format: time
 *               sequence:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Stop created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/stop/multiple:
 *   post:
 *     summary: Create multiple stops (Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stops:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Stop'
 *     responses:
 *       201:
 *         description: Multiple stops created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/stop/trip/{tripId}:
 *   get:
 *     summary: Get stops by trip
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tripId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of stops for the trip
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stop'
 */

/**
 * @swagger
 * /v1/route/transport/stop/station/{stationId}:
 *   get:
 *     summary: Get stops by station
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of stops at the station
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Stop'
 */

// ROUTE STATION ENDPOINTS
/**
 * @swagger
 * /v1/route/transport/route-station:
 *   get:
 *     summary: Get all route-stations (Staff/Admin only)
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of route-stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RouteStation'
 * 
 *   post:
 *     summary: Create a new route-station (Admin only)
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - stationId
 *               - sequence
 *             properties:
 *               routeId:
 *                 type: string
 *                 format: uuid
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               sequence:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Route-station created successfully
 *       403:
 *         description: Forbidden (Admin only)
 */

/**
 * @swagger
 * /v1/route/transport/route-station/search/between-stations:
 *   get:
 *     summary: Find routes between two stations
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: originId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: destinationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Routes connecting the two stations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RouteStation'
 */

module.exports = {};
