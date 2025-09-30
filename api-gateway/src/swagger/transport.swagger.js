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
 * /v1/transport/route/getStationsByRoute/{routeId}:
 *   get:
 *     summary: Get stations for a route
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Stations on the route
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
 * /v1/transport/route/getRoutePathWithDetails/{routeId}:
 *   get:
 *     summary: Get route path with details
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Route path
 */

/**
 * @swagger
 * /v1/transport/route/validateRouteSequence/{routeId}:
 *   get:
 *     summary: Validate route sequence
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Validation result
 */

/**
 * @swagger
 * /v1/transport/route/reorderRouteStations/{routeId}:
 *   put:
 *     summary: Reorder route stations (Admin only)
 *     tags: [Routes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
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
 *               stations:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Reordered
 */

/**
 * @swagger
 * /v1/transport/trip/getTripsByRoute/{routeId}:
 *   get:
 *     summary: Get trips by route
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trips for route
 */

/**
 * @swagger
 * /v1/transport/trip/getTripsByTrain/{trainId}:
 *   get:
 *     summary: Get trips by train
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trips for train
 */

/**
 * @swagger
 * /v1/transport/trip/getTripsByDayOfWeek/{dayOfWeek}:
 *   get:
 *     summary: Get trips by day of week
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayOfWeek
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *     responses:
 *       200:
 *         description: Trips for day
 */

/**
 * @swagger
 * /v1/transport/trip/getTripScheduleWithStops/{tripId}:
 *   get:
 *     summary: Get trip schedule with stops
 *     tags: [Trips]
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
 *         description: Trip schedule
 */

/**
 * @swagger
 * /v1/transport/trip/validateStopSequence/{tripId}:
 *   post:
 *     summary: Validate stop sequence
 *     tags: [Trips]
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
 *         description: Validation result
 */

/**
 * @swagger
 * /v1/transport/route/getRouteDistance/{id}:
 *   get:
 *     summary: Calculate route distance
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
 *         description: Distance
 */

/**
 * @swagger
 * /v1/transport/train/getTrainUtilization/{id}:
 *   get:
 *     summary: Get train utilization
 *     tags: [Trains]
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
 *         description: Utilization metrics
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
 * /v1/transport/station/getAllStations:
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
 * /v1/transport/station/getActiveStations:
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
 * /v1/transport/station/getStationsByOperatingHours:
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
 * /v1/transport/station/getStationById/{id}:
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
 *         description: Unique identifier of the station to delete
 *     responses:
 *       200:
 *         description: Station deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Station deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Station not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/transport/station/updateStationFacilities/{id}:
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
 * /v1/transport/station/getNextStopsAtStation/{stationId}:
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
 * /v1/transport/station/getRoutesByStation/{stationId}:
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
 * /v1/transport/route/getRoutes:
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
 */

/**
 * @swagger
 * /v1/transport/route/createRoute:
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
 * /v1/transport/route/getActiveRoutes:
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
 * /v1/transport/route/findRoutesBetweenStations:
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
 * /v1/transport/route/getRouteById/{id}:
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
 */

/**
 * @swagger
 * /v1/transport/route/updateRoute/{id}:
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
 */

/**
 * @swagger
 * /v1/transport/route/deleteRoute/{id}:
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
 *         description: Unique identifier of the route to delete
 *     responses:
 *       200:
 *         description: Route deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Route deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Route not found
 *       500:
 *         description: Internal server error
 */

// TRAIN ENDPOINTS
/**
 * @swagger
 * /v1/transport/train/getAllTrains:
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
 * /v1/transport/train/getActiveTrains:
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
 * /v1/transport/train/getTrainsByType/{type}:
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

/**
 * @swagger
 * /v1/transport/train/getTrainsByStatus/{status}:
 *   get:
 *     summary: Get trains by status (Staff/Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [active, maintenance, out-of-service]
 *     responses:
 *       200:
 *         description: List of trains by status
 */

/**
 * @swagger
 * /v1/transport/train/getTrainsNeedingMaintenance:
 *   get:
 *     summary: Get trains needing maintenance (Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trains needing maintenance
 */

/**
 * @swagger
 * /v1/transport/train/getTrainById/{id}:
 *   get:
 *     summary: Get train by ID (Staff/Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the train
 *     responses:
 *       200:
 *         description: Train details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Train'
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Train not found
 * 
 *   put:
 *     summary: Update train (Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the train to update
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
 *               type:
 *                 type: string
 *                 enum: [standard, express, freight]
 *               capacity:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, out-of-service]
 *               lastMaintenance:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Train updated successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Train not found
 * 
 *   delete:
 *     summary: Delete train (Admin only)
 *     tags: [Trains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the train to delete
 *     responses:
 *       200:
 *         description: Train deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Train deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Train not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/transport/train/updateTrainStatus/{id}:
 *   put:
 *     summary: Update train status (Staff/Admin only)
 *     tags: [Trains]
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
 *               status:
 *                 type: string
 *                 enum: [active, maintenance, out-of-service]
 *     responses:
 *       200:
 *         description: Train status updated
 */

/**
 * @swagger
 * /v1/transport/train/scheduleTrainMaintenance/{id}:
 *   post:
 *     summary: Schedule maintenance (Admin only)
 *     tags: [Trains]
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
 *         description: Maintenance scheduled
 */

// TRIP ENDPOINTS  
/**
 * @swagger
 * /v1/transport/trip/getTripsWithFilters:
 *   get:
 *     summary: Get trips with filters (Staff/Admin only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of trips
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
 *     responses:
 *       201:
 *         description: Trip created successfully
 */

/**
 * @swagger
 * /v1/transport/trip/getActiveTrips:
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
 * /v1/transport/trip/getUpcomingTrips:
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
 * /v1/transport/trip/findTripsBetweenStations:
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

/**
 * @swagger
 * /v1/transport/trip/getTripsByRoute/{routeId}:
 *   get:
 *     summary: Get trips by route
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trips for route
 */

/**
 * @swagger
 * /v1/transport/trip/getTripsByTrain/{trainId}:
 *   get:
 *     summary: Get trips by train
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: trainId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Trips for train
 */

/**
 * @swagger
 * /v1/transport/trip/getTripsByDayOfWeek/{dayOfWeek}:
 *   get:
 *     summary: Get trips by day of week
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dayOfWeek
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *     responses:
 *       200:
 *         description: Trips for day
 */

/**
 * @swagger
 * /v1/transport/trip/getTripById/{id}:
 *   get:
 *     summary: Get trip by ID (All roles)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the trip
 *     responses:
 *       200:
 *         description: Trip details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Trip'
 *       404:
 *         description: Trip not found
 * 
 *   put:
 *     summary: Update trip (Admin only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the trip to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *     responses:
 *       200:
 *         description: Trip updated successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Trip not found
 * 
 *   delete:
 *     summary: Delete trip (Admin only)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the trip to delete
 *     responses:
 *       200:
 *         description: Trip deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Trip deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Trip not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/transport/trip/getTripStatistics/{id}:
 *   get:
 *     summary: Get trip statistics (Staff/Admin only)
 *     tags: [Trips]
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
 *         description: Trip statistics
 */

/**
 * @swagger
 * /v1/transport/trip/getTripScheduleWithStops/{tripId}:
 *   get:
 *     summary: Get trip schedule with stops
 *     tags: [Trips]
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
 *         description: Trip schedule
 */

/**
 * @swagger
 * /v1/transport/trip/validateStopSequence/{tripId}:
 *   post:
 *     summary: Validate stop sequence
 *     tags: [Trips]
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
 *         description: Validation result
 */

// STOP ENDPOINTS
/**
 * @swagger
 * /v1/transport/stop/getAllStops:
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
 */

/**
 * @swagger
 * /v1/transport/stop/createStop:
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
 */

/**
 * @swagger
 * /v1/transport/stop/createMultipleStops:
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
 */

/**
 * @swagger
 * /v1/transport/stop/getStopsByTrip/{tripId}:
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
 * /v1/transport/stop/getStopsByStation/{stationId}:
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

/**
 * @swagger
 * /v1/transport/stop/getStopById/{id}:
 *   get:
 *     summary: Get stop by ID (Staff/Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the stop
 *     responses:
 *       200:
 *         description: Stop details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Stop'
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Stop not found
 * 
 *   put:
 *     summary: Update stop (Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the stop to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *       200:
 *         description: Stop updated successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Stop not found
 * 
 *   delete:
 *     summary: Delete stop (Admin only)
 *     tags: [Stops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the stop to delete
 *     responses:
 *       200:
 *         description: Stop deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Stop deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Stop not found
 *       500:
 *         description: Internal server error
 */

// ROUTE STATION ENDPOINTS
/**
 * @swagger
 * /v1/transport/route-station/getAllRouteStations:
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
 */

/**
 * @swagger
 * /v1/transport/route-station/createRouteStation:
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
 */

/**
 * @swagger
 * /v1/transport/route-station/getRouteStationById/{id}:
 *   get:
 *     summary: Get route-station by ID (Staff/Admin only)
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the route-station
 *     responses:
 *       200:
 *         description: Route-station details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RouteStation'
 *       403:
 *         description: Forbidden - Staff/Admin access required
 *       404:
 *         description: Route-station not found
 * 
 *   put:
 *     summary: Update route-station (Admin only)
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the route-station to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               routeId:
 *                 type: string
 *               stationId:
 *                 type: string
 *               sequence:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Route-station updated successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Route-station not found
 * 
 *   delete:
 *     summary: Delete route-station (Admin only)
 *     tags: [Route Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the route-station to delete
 *     responses:
 *       200:
 *         description: Route-station deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: "Route-station deleted successfully"
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Route-station not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /v1/transport/route-station/findRoutesBetweenTwoStations:
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

/**
 * @swagger
 * /v1/transport/route-station/findShortestPath:
 *   get:
 *     summary: Find shortest path between two stations (with transfers)
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
 *         description: Shortest path
 */

module.exports = {};
