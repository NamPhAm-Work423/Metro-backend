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
 *           format: uuid
 *         originStationId:
 *           type: string
 *           format: uuid
 *         destinationStationId:
 *           type: string
 *           format: uuid
 *         ticketType:
 *           type: string
 *           enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         passengerType:
 *           type: string
 *           enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *         basePrice:
 *           type: number
 *           format: decimal
 *         peakHourMultiplier:
 *           type: number
 *           format: decimal
 *         distance:
 *           type: number
 *           format: float
 *         zones:
 *           type: integer
 *         effectiveFrom:
 *           type: string
 *           format: date-time
 *         effectiveUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         currency:
 *           type: string
 *           default: 'USD'
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
 *           enum: ['percentage', 'fixed_amount', 'buy_one_get_one']
 *         value:
 *           type: number
 *           format: decimal
 *         maxDiscountAmount:
 *           type: number
 *           format: decimal
 *           nullable: true
 *         minPurchaseAmount:
 *           type: number
 *           format: decimal
 *           nullable: true
 *         applicableTicketTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         applicablePassengerTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: ['adult', 'child', 'senior', 'student', 'disabled']
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
 *         daysOfWeek:
 *           type: array
 *           items:
 *             type: string
 *             enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
 *         timeSlots:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               start:
 *                 type: string
 *                 format: time
 *               end:
 *                 type: string
 *                 format: time
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
 * /v1/route/ticket/health:
 *   get:
 *     summary: Ticket service health check
 *     tags: [Tickets]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 service:
 *                   type: string
 *                   example: "ticket-service"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /v1/route/ticket/tickets:
 *   get:
 *     summary: Get all tickets (Admin only)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['active', 'used', 'expired', 'cancelled', 'refunded']
 *         description: Filter by ticket status
 *       - in: query
 *         name: ticketType
 *         schema:
 *           type: string
 *           enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         description: Filter by ticket type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of tickets
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
 *                         tickets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Ticket'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             page:
 *                               type: integer
 *                             limit:
 *                               type: integer
 *                             pages:
 *                               type: integer
 *   post:
 *     summary: Create a new ticket
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
 *               - tripId
 *               - originStationId
 *               - destinationStationId
 *               - ticketType
 *               - paymentMethod
 *               - paymentId
 *             properties:
 *               tripId:
 *                 type: string
 *                 format: uuid
 *               originStationId:
 *                 type: string
 *                 format: uuid
 *               destinationStationId:
 *                 type: string
 *                 format: uuid
 *               ticketType:
 *                 type: string
 *                 enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *               paymentMethod:
 *                 type: string
 *                 enum: ['credit_card', 'debit_card', 'cash', 'digital_wallet', 'bank_transfer']
 *               paymentId:
 *                 type: string
 *               promotionCode:
 *                 type: string
 *                 description: Optional promotion code for discount
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/me:
 *   get:
 *     summary: Get current user's tickets
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ['active', 'used', 'expired', 'cancelled', 'refunded']
 *         description: Filter by ticket status
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
 *         description: User's tickets
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
 *                         tickets:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Ticket'
 *                         pagination:
 *                           type: object
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/{id}:
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
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 *       404:
 *         description: Ticket not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/{id}/use:
 *   patch:
 *     summary: Use a ticket (Staff only)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket used successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Ticket cannot be used (expired, already used, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/{id}/cancel:
 *   patch:
 *     summary: Cancel a ticket
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/{id}/refund:
 *   patch:
 *     summary: Refund a ticket (Staff only)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for refund
 *               refundAmount:
 *                 type: number
 *                 format: decimal
 *                 description: Amount to refund (optional, defaults to full amount)
 *     responses:
 *       200:
 *         description: Ticket refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Ticket'
 */

/**
 * @swagger
 * /v1/route/ticket/fares:
 *   get:
 *     summary: Get all fares
 *     tags: [Fares]
 *     parameters:
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by route ID
 *       - in: query
 *         name: ticketType
 *         schema:
 *           type: string
 *           enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         description: Filter by ticket type
 *       - in: query
 *         name: passengerType
 *         schema:
 *           type: string
 *           enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *         description: Filter by passenger type
 *     responses:
 *       200:
 *         description: List of fares
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
 *                         $ref: '#/components/schemas/Fare'
 *   post:
 *     summary: Create a new fare (Admin only)
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
 *               - originStationId
 *               - destinationStationId
 *               - ticketType
 *               - passengerType
 *               - basePrice
 *               - effectiveFrom
 *             properties:
 *               routeId:
 *                 type: string
 *                 format: uuid
 *               originStationId:
 *                 type: string
 *                 format: uuid
 *               destinationStationId:
 *                 type: string
 *                 format: uuid
 *               ticketType:
 *                 type: string
 *                 enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *               passengerType:
 *                 type: string
 *                 enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *               basePrice:
 *                 type: number
 *                 format: decimal
 *               peakHourMultiplier:
 *                 type: number
 *                 format: decimal
 *                 default: 1.0
 *               distance:
 *                 type: number
 *                 format: float
 *               zones:
 *                 type: integer
 *               effectiveFrom:
 *                 type: string
 *                 format: date-time
 *               effectiveUntil:
 *                 type: string
 *                 format: date-time
 *               currency:
 *                 type: string
 *                 default: 'USD'
 *     responses:
 *       201:
 *         description: Fare created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Fare'
 */

/**
 * @swagger
 * /v1/route/ticket/fares/calculate:
 *   post:
 *     summary: Calculate fare for a journey
 *     tags: [Fares]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originStationId
 *               - destinationStationId
 *               - ticketType
 *               - passengerType
 *             properties:
 *               originStationId:
 *                 type: string
 *                 format: uuid
 *               destinationStationId:
 *                 type: string
 *                 format: uuid
 *               ticketType:
 *                 type: string
 *                 enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *               passengerType:
 *                 type: string
 *                 enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *               isPeakHour:
 *                 type: boolean
 *                 default: false
 *               promotionCode:
 *                 type: string
 *                 description: Optional promotion code for discount calculation
 *     responses:
 *       200:
 *         description: Calculated fare
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
 *                         basePrice:
 *                           type: number
 *                           format: decimal
 *                         peakHourMultiplier:
 *                           type: number
 *                           format: decimal
 *                         peakHourPrice:
 *                           type: number
 *                           format: decimal
 *                         promotionDiscount:
 *                           type: number
 *                           format: decimal
 *                         finalPrice:
 *                           type: number
 *                           format: decimal
 *                         currency:
 *                           type: string
 */

/**
 * @swagger
 * /v1/route/ticket/promotions:
 *   get:
 *     summary: Get all active promotions
 *     tags: [Promotions]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ['percentage', 'fixed_amount', 'buy_one_get_one']
 *         description: Filter by promotion type
 *       - in: query
 *         name: ticketType
 *         schema:
 *           type: string
 *           enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *         description: Filter by applicable ticket type
 *     responses:
 *       200:
 *         description: List of promotions
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
 *                         $ref: '#/components/schemas/Promotion'
 *   post:
 *     summary: Create a new promotion (Admin only)
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
 *                 enum: ['percentage', 'fixed_amount', 'buy_one_get_one']
 *               value:
 *                 type: number
 *                 format: decimal
 *               maxDiscountAmount:
 *                 type: number
 *                 format: decimal
 *               minPurchaseAmount:
 *                 type: number
 *                 format: decimal
 *               applicableTicketTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *               applicablePassengerTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *               applicableRoutes:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
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
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
 *               timeSlots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: time
 *                     end:
 *                       type: string
 *                       format: time
 *     responses:
 *       201:
 *         description: Promotion created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Success'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Promotion'
 */

/**
 * @swagger
 * /v1/route/ticket/promotions/{code}/validate:
 *   post:
 *     summary: Validate a promotion code
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Promotion code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketType
 *               - passengerType
 *               - purchaseAmount
 *             properties:
 *               ticketType:
 *                 type: string
 *                 enum: ['single', 'return', 'day_pass', 'weekly', 'monthly']
 *               passengerType:
 *                 type: string
 *                 enum: ['adult', 'child', 'senior', 'student', 'disabled']
 *               routeId:
 *                 type: string
 *                 format: uuid
 *               purchaseAmount:
 *                 type: number
 *                 format: decimal
 *               passengerId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional for user-specific validation
 *     responses:
 *       200:
 *         description: Promotion validation result
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
 *                         valid:
 *                           type: boolean
 *                         promotion:
 *                           $ref: '#/components/schemas/Promotion'
 *                         discountAmount:
 *                           type: number
 *                           format: decimal
 *                         finalAmount:
 *                           type: number
 *                           format: decimal
 *                         reason:
 *                           type: string
 *                           description: Reason if invalid
 *       404:
 *         description: Promotion code not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/statistics:
 *   get:
 *     summary: Get ticket statistics (Admin only)
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: ['day', 'week', 'month', 'status', 'ticketType']
 *         description: Group statistics by
 *     responses:
 *       200:
 *         description: Ticket statistics
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
 *                         totalTickets:
 *                           type: integer
 *                         totalRevenue:
 *                           type: number
 *                           format: decimal
 *                         ticketsByStatus:
 *                           type: object
 *                         ticketsByType:
 *                           type: object
 *                         statistics:
 *                           type: array
 *                           items:
 *                             type: object
 */

