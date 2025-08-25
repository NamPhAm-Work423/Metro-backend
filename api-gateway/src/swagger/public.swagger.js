/**
 * @swagger
 * tags:
 *   name: Public Transport
 *   description: Public transport routes and stations (guest access)
 */

/**
 * @swagger
 * tags:
 *   name: Public Ticket
 *   description: Public fares, transit passes and passenger discounts (guest access)
 */

/**
 * @swagger
 * /v1/guest/public/transport/routes:
 *   get:
 *     summary: Get all routes
 *     tags: [Public Transport]
 *     responses:
 *       200:
 *         description: List of routes
 */

/**
 * @swagger
 * /v1/guest/public/transport/routes/search:
 *   get:
 *     summary: Search routes
 *     tags: [Public Transport]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search results
 */

/**
 * @swagger
 * /v1/guest/public/transport/routes/{id}:
 *   get:
 *     summary: Get route by ID
 *     tags: [Public Transport]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Route detail
 *       404:
 *         description: Route not found
 */

/**
 * @swagger
 * /v1/guest/public/transport/routes/{routeId}/stations:
 *   get:
 *     summary: Get stations for a route
 *     tags: [Public Transport]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: List of stations on the route
 */

/**
 * @swagger
 * /v1/guest/public/transport/stations:
 *   get:
 *     summary: Get all stations
 *     tags: [Public Transport]
 *     responses:
 *       200:
 *         description: List of stations
 */

/**
 * @swagger
 * /v1/guest/public/transport/stations/{id}:
 *   get:
 *     summary: Get station by ID
 *     tags: [Public Transport]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Station ID
 *     responses:
 *       200:
 *         description: Station detail
 *       404:
 *         description: Station not found
 */

/**
 * @swagger
 * /v1/guest/public/ticket/fares:
 *   get:
 *     summary: Get all fares
 *     tags: [Public Ticket]
 *     responses:
 *       200:
 *         description: List of fares
 */

/**
 * @swagger
 * /v1/guest/public/ticket/fares/search:
 *   get:
 *     summary: Search fares
 *     tags: [Public Ticket]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: Search keyword
 *     responses:
 *       200:
 *         description: Search results
 */

/**
 * @swagger
 * /v1/guest/public/ticket/fares/route/{routeId}:
 *   get:
 *     summary: Get fares by route
 *     tags: [Public Ticket]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Fares for the route
 */

/**
 * @swagger
 * /v1/guest/public/ticket/fares/route/{routeId}/calculate:
 *   get:
 *     summary: Calculate example fare for a route
 *     tags: [Public Ticket]
 *     parameters:
 *       - in: path
 *         name: routeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Route ID
 *     responses:
 *       200:
 *         description: Fare calculation result
 */

/**
 * @swagger
 * /v1/guest/public/ticket/transit-passes:
 *   get:
 *     summary: Get all transit passes
 *     tags: [Public Ticket]
 *     responses:
 *       200:
 *         description: List of transit passes
 */

/**
 * @swagger
 * /v1/guest/public/ticket/transit-passes/{type}:
 *   get:
 *     summary: Get transit pass by type
 *     tags: [Public Ticket]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Transit pass type
 *     responses:
 *       200:
 *         description: Transit pass detail
 *       404:
 *         description: Transit pass not found
 */

/**
 * @swagger
 * /v1/guest/public/ticket/passenger-discounts:
 *   get:
 *     summary: Get all passenger discounts
 *     tags: [Public Ticket]
 *     responses:
 *       200:
 *         description: List of passenger discounts
 */

/**
 * @swagger
 * /v1/guest/public/ticket/passenger-discounts/{type}:
 *   get:
 *     summary: Get passenger discount by type
 *     tags: [Public Ticket]
 *     parameters:
 *       - in: path
 *         name: type
 *         schema:
 *           type: string
 *         required: true
 *         description: Discount type
 *     responses:
 *       200:
 *         description: Passenger discount detail
 *       404:
 *         description: Discount not found
 */ 