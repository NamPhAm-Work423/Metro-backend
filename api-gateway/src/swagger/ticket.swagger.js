/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       description: A ticket purchase for metro travel
 *       properties:
 *         ticketId:
 *           type: string
 *           format: uuid
 *         passengerId:
 *           type: string
 *           format: uuid
 *         tripId:
 *           type: string
 *           format: uuid
 *         fareId:
 *           type: string
 *           format: uuid
 *         promotionId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         originStationId:
 *           type: string
 *           format: uuid
 *         destinationStationId:
 *           type: string
 *           format: uuid
 *         purchaseDate:
 *           type: string
 *           format: date-time
 *         validFrom:
 *           type: string
 *           format: date-time
 *         validUntil:
 *           type: string
 *           format: date-time
 *         usedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         originalPrice:
 *           type: number
 *           format: decimal
 *         discountAmount:
 *           type: number
 *           format: decimal
 *         finalPrice:
 *           type: number
 *           format: decimal
 *         paymentMethod:
 *           type: string
 *           enum: ['credit_card', 'debit_card', 'cash', 'digital_wallet', 'bank_transfer']
 *         paymentId:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['active', 'used', 'expired', 'cancelled', 'refunded']
 *         ticketType:
 *           type: string
 *           enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         qrCode:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Fare:
 *       type: object
 *       description: Pricing information for metro routes
 *       properties:
 *         fareId:
 *           type: string
 *           format: uuid
 *         routeId:
 *           type: string
 *           description: Route identifier from transport service
 *         basePrice:
 *           type: number
 *           format: decimal
 *         currency:
 *           type: string
 *           enum: [VND, USD, CNY]
 *           default: 'VND'
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Promotion:
 *       type: object
 *       description: Discount promotions for tickets
 *       properties:
 *         promotionId:
 *           type: string
 *           format: uuid
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [percentage, fixed_amount, buy_one_get_one, free_upgrade]
 *         value:
 *           type: number
 *           format: decimal
 *         applicableTicketTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [oneway, return, day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass]
 *         applicablePassengerTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [adult, child, student, senior, disabled]
 *         applicableRoutes:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *         usageLimit:
 *           type: integer
 *           nullable: true
 *         usageCount:
 *           type: integer
 *           default: 0
 *         userUsageLimit:
 *           type: integer
 *           nullable: true
 *         validFrom:
 *           type: string
 *           format: date-time
 *         validUntil:
 *           type: string
 *           format: date-time
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/create-short-term:
 *   post:
 *     summary: Create a short-term ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - fromStation
 *               - toStation
 *               - tripType
 *               - paymentMethod
 *             properties:
 *               routeId:
 *                 type: string
 *               fromStation:
 *                 type: string
 *               toStation:
 *                 type: string
 *               tripType:
 *                 type: string
 *                 enum: [Oneway, Return]
 *               numAdults:
 *                 type: number
 *               numElder:
 *                 type: number
 *               numTeenager:
 *                 type: number
 *               numChild:
 *                 type: number
 *               promotionId:
 *                 type: string
 *                 nullable: true
 *               tripId:
 *                 type: string
 *                 nullable: true
 *               paymentMethod:
 *                 type: string
 *               paymentId:
 *                 type: string
 *                 nullable: true
 *           example:
 *             fromStation: an-dong
 *             toStation: ba-son
 *             tripType: Oneway
 *             numAdults: 2
 *             numElder: 1
 *             numTeenager: 0
 *             numChild: 1
 *             promotionId: null
 *             paymentMethod: card
 *             paymentId: payment_abc123
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/create-long-term:
 *   post:
 *     summary: Create a long-term ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passType
 *               - paymentMethod
 *             properties:
 *               routeId:
 *                 type: string
 *                 nullable: true
 *               passType:
 *                 type: string
 *                 enum: [day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass]
 *               promotionId:
 *                 type: string
 *                 nullable: true
 *               paymentMethod:
 *                 type: string
 *               paymentId:
 *                 type: string
 *                 nullable: true
 *           example:
 *             passType: monthly_pass
 *             paymentMethod: card
 *             promotionId: null
 *             paymentId: payment_xyz456
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/me:
 *   get:
 *     summary: Get all tickets of current user
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/me/unused:
 *   get:
 *     summary: Get unused tickets of current user
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of unused tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/me/used:
 *   get:
 *     summary: Get used tickets of current user
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of used tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/me/cancelled:
 *   get:
 *     summary: Get cancelled tickets of current user
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of cancelled tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/me/expired:
 *   get:
 *     summary: Get expired tickets of current user
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of expired tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/getTicket:
 *   get:
 *     summary: Get ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/cancel:
 *   post:
 *     summary: Cancel ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *           example:
 *             reason: "Change of plans"
 *     responses:
 *       200:
 *         description: Ticket cancelled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/phoneTicket:
 *   post:
 *     summary: Send ticket to phone
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *           example:
 *             phoneNumber: "+84987654321"
 *     responses:
 *       200:
 *         description: Ticket sent to phone
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/mailTicket:
 *   post:
 *     summary: Send ticket to email
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Ticket sent to email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/validate:
 *   get:
 *     summary: Validate ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/detail:
 *   get:
 *     summary: Get ticket detail (staff, admin)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/update:
 *   put:
 *     summary: Update ticket (staff, admin)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *               specialRequests:
 *                 type: string
 *           example:
 *             notes: "Please seat near window"
 *             specialRequests: "Wheelchair access"
 *     responses:
 *       200:
 *         description: Ticket updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/{id}/delete:
 *   delete:
 *     summary: Delete ticket (staff, admin)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Ticket deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/getAllTickets:
 *   get:
 *     summary: Get all tickets (admin)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all tickets
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/tickets/getTicketStatistics:
 *   get:
 *     summary: Get ticket statistics (admin)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Ticket statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/get-all:
 *   get:
 *     summary: Get all fares
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of fares
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/search:
 *   get:
 *     summary: Search fares
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/route/{routeId}:
 *   get:
 *     summary: Get fares by route
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: routeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fares for route
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/stations/{originId}/{destinationId}:
 *   get:
 *     summary: Get fares between stations
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: originId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: destinationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fares between stations
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/zones/{zones}:
 *   get:
 *     summary: Get fares by zone
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: zones
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fares for zone
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/{id}/calculate:
 *   get:
 *     summary: Calculate fare price
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fare calculation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/statistics:
 *   get:
 *     summary: Get fare statistics (staff, admin)
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Fare statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/fares/:
 *   get:
 *     summary: Get all fares (staff, admin)
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of fares
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *   post:
 *     summary: Create a new fare (admin)
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - routeId
 *               - basePrice
 *               - currency
 *             properties:
 *               routeId:
 *                 type: string
 *               basePrice:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [VND, USD, CNY]
 *               isActive:
 *                 type: boolean
 *           example:
 *             routeId: "route_abc123"
 *             basePrice: 15000
 *             currency: "VND"
 *             isActive: true
 *   put:
 *     summary: Update fare (admin)
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePrice:
 *                 type: number
 *               currency:
 *                 type: string
 *                 enum: [VND, USD, CNY]
 *               isActive:
 *                 type: boolean
 *           example:
 *             basePrice: 18000
 *             currency: "VND"
 *             isActive: false
 *
 * /v1/route/ticket/promotion/active:
 *   get:
 *     summary: Get active promotions
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of active promotions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/search:
 *   get:
 *     summary: Search promotions
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/{code}/validate:
 *   post:
 *     summary: Validate promotion code
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketType:
 *                 type: string
 *               passengerType:
 *                 type: string
 *               routeId:
 *                 type: string
 *               purchaseAmount:
 *                 type: number
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *           example:
 *             ticketType: "single"
 *             passengerType: "adult"
 *             routeId: "route_abc123"
 *             purchaseAmount: 60000
 *             dateTime: "2025-07-23T09:00:00Z"
 *     responses:
 *       200:
 *         description: Promotion validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/{code}/apply:
 *   post:
 *     summary: Apply promotion code
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion applied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/validate-bulk:
 *   post:
 *     summary: Bulk validate promotions (staff, admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codes
 *               - validationData
 *             properties:
 *               codes:
 *                 type: array
 *                 items:
 *                   type: string
 *               validationData:
 *                 type: object
 *           example:
 *             codes: ["SUMMER2025", "WELCOME10"]
 *             validationData:
 *               ticketType: "single"
 *               passengerType: "adult"
 *               purchaseAmount: 60000
 *     responses:
 *       200:
 *         description: Bulk validation result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/code/{code}:
 *   get:
 *     summary: Get promotion by code
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/statistics:
 *   get:
 *     summary: Get promotion statistics (staff, admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Promotion statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/{id}/usage-report:
 *   get:
 *     summary: Get promotion usage report (staff, admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usage report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/expire:
 *   post:
 *     summary: Expire promotions (admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ...
 *     responses:
 *       200:
 *         description: Promotions expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/:
 *   get:
 *     summary: Get all promotions (staff, admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of promotions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *   post:
 *     summary: Create a new promotion (admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - type
 *               - value
 *               - validFrom
 *               - validUntil
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, buy_one_get_one, free_upgrade]
 *               value:
 *                 type: number
 *               applicableTicketTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [oneway, return, day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass]
 *               applicablePassengerTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [adult, child, student, senior, disabled]
 *               applicableRoutes:
 *                 type: array
 *                 items:
 *                   type: string
 *               usageLimit:
 *                 type: integer
 *               userUsageLimit:
 *                 type: integer
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *           example:
 *             code: "SUMMER2025"
 *             name: "Summer Sale"
 *             description: "20% off for all tickets in summer."
 *             type: "percentage"
 *             value: 20
 *             applicableTicketTypes: ["oneway", "return"]
 *             applicablePassengerTypes: ["adult", "child"]
 *             applicableRoutes: ["route_abc123"]
 *             usageLimit: 1000
 *             userUsageLimit: 2
 *             validFrom: "2025-07-01T00:00:00Z"
 *             validUntil: "2025-08-31T23:59:59Z"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Promotion created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *
 * /v1/route/ticket/promotion/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *   put:
 *     summary: Update promotion (admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [percentage, fixed_amount, buy_one_get_one, free_upgrade]
 *               value:
 *                 type: number
 *               applicableTicketTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [oneway, return, day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass]
 *               applicablePassengerTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [adult, child, student, senior, disabled]
 *               applicableRoutes:
 *                 type: array
 *                 items:
 *                   type: string
 *               usageLimit:
 *                 type: integer
 *               userUsageLimit:
 *                 type: integer
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *               isActive:
 *                 type: boolean
 *           example:
 *             name: "Summer Sale Updated"
 *             description: "25% off for all tickets in summer."
 *             type: "percentage"
 *             value: 25
 *             applicableTicketTypes: ["oneway", "return"]
 *             applicablePassengerTypes: ["adult", "child"]
 *             applicableRoutes: ["route_abc123"]
 *             usageLimit: 2000
 *             userUsageLimit: 3
 *             validFrom: "2025-07-01T00:00:00Z"
 *             validUntil: "2025-08-31T23:59:59Z"
 *             isActive: true
 *   delete:
 *     summary: Delete promotion (admin)
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Promotion deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */

