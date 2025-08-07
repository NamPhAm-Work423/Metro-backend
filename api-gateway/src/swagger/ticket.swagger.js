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
 *           nullable: true
 *         fareId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         promotionId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         originStationId:
 *           type: string
 *           nullable: true
 *         destinationStationId:
 *           type: string
 *           nullable: true
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
 *           enum: ['paypal', 'vnpay', 'credit_card', 'debit_card', 'cash', 'digital_wallet', 'bank_transfer']
 *         paymentId:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['pending_payment', 'active', 'used', 'expired', 'cancelled', 'refunded']
 *         ticketType:
 *           type: string
 *           enum: ['oneway', 'return', 'day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass']
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
 *         promotionCode:
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
 *     PassengerDiscount:
 *       type: object
 *       description: Discount rates for different passenger types
 *       properties:
 *         discountId:
 *           type: string
 *           format: uuid
 *         passengerType:
 *           type: string
 *           enum: [adult, child, senior, student, elder, teenager]
 *         discountType:
 *           type: string
 *           enum: [percentage, fixed_amount, free]
 *         discountValue:
 *           type: number
 *           format: decimal
 *         description:
 *           type: string
 *         isActive:
 *           type: boolean
 *         validFrom:
 *           type: string
 *           format: date-time
 *         validUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PriceCalculation:
 *       type: object
 *       description: Comprehensive price calculation result
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             totalPrice:
 *               type: number
 *             totalOriginalPrice:
 *               type: number
 *             totalDiscountAmount:
 *               type: number
 *             appliedPromotion:
 *               $ref: '#/components/schemas/Promotion'
 *             currency:
 *               type: string
 *             totalPassengers:
 *               type: integer
 *             journeyDetails:
 *               type: object
 *               properties:
 *                 isDirectJourney:
 *                   type: boolean
 *                 totalRoutes:
 *                   type: integer
 *                 totalStations:
 *                   type: integer
 *                 routeSegments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       routeId:
 *                         type: string
 *                       routeName:
 *                         type: string
 *                       originStationId:
 *                         type: string
 *                       destinationStationId:
 *                         type: string
 *                       stationCount:
 *                         type: integer
 *                 connectionPoints:
 *                   type: array
 *                   items:
 *                     type: string
 *             passengerBreakdown:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   count:
 *                     type: integer
 *                   pricePerPerson:
 *                     type: number
 *                   subtotal:
 *                     type: number
 *             fareAnalysis:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   segment:
 *                     type: integer
 *                   routeName:
 *                     type: string
 *                   originStationId:
 *                     type: string
 *                   destinationStationId:
 *                     type: string
 *                   stationCount:
 *                     type: integer
 *                   basePrice:
 *                     type: number
 *                   tripPrice:
 *                     type: number
 *                   breakdown:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         type:
 *                           type: string
 *                         count:
 *                           type: integer
 *                         pricePerPerson:
 *                           type: number
 *                         subtotal:
 *                           type: number
 *                   segmentTotalPrice:
 *                     type: number
 *             tripType:
 *               type: string
 *             entryStationId:
 *               type: string
 *             exitStationId:
 *               type: string
 *             calculationTimestamp:
 *               type: string
 *               format: date-time
 */

/**
 * @swagger
 * /v1/route/ticket/tickets/calculate-price:
 *   post:
 *     summary: Calculate ticket price with comprehensive breakdown
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
 *               - fromStation
 *               - toStation
 *             properties:
 *               fromStation:
 *                 type: string
 *                 description: Origin station ID
 *               toStation:
 *                 type: string
 *                 description: Destination station ID
 *               tripType:
 *                 type: string
 *                 enum: [Oneway, Return]
 *                 default: Oneway
 *               numAdults:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numElder:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numTeenager:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numChild:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numSenior:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numStudent:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               promotionCode:
 *                 type: string
 *                 description: Optional promotion code
 *           example:
 *             fromStation: "an-dong"
 *             toStation: "ba-son"
 *             tripType: "Return"
 *             numAdults: 2
 *             numElder: 1
 *             numTeenager: 5
 *             numChild: 1
 *             numSenior: 0
 *             numStudent: 3
 *             promotionCode: "JV4SX91R1E8XLD7"
 *     responses:
 *       200:
 *         description: Price calculation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PriceCalculation'
 *
 * /v1/route/ticket/tickets/create-short-term:
 *   post:
 *     summary: Create a short-term ticket (oneway or return)
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
 *               - fromStation
 *               - toStation
 *               - tripType
 *               - paymentMethod
 *             properties:
 *               fromStation:
 *                 type: string
 *                 description: Origin station ID
 *               toStation:
 *                 type: string
 *                 description: Destination station ID
 *               tripType:
 *                 type: string
 *                 enum: [Oneway, Return]
 *               numAdults:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numElder:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numTeenager:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numChild:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numSenior:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               numStudent:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               promotionCode:
 *                 type: string
 *                 description: Optional promotion code
 *               paymentMethod:
 *                 type: string
 *                 enum: [paypal, vnpay, credit_card, debit_card, cash, digital_wallet, bank_transfer]
 *               paymentSuccessUrl:
 *                 type: string
 *                 format: uri
 *               paymentFailUrl:
 *                 type: string
 *                 format: uri
 *               currency:
 *                 type: string
 *                 enum: [VND, USD, CNY]
 *                 default: VND
 *               waitForPayment:
 *                 type: boolean
 *                 default: true
 *           example:
 *             fromStation: "an-dong"
 *             toStation: "ba-son"
 *             tripType: "Return"
 *             numAdults: 2
 *             numElder: 1
 *             numTeenager: 5
 *             numChild: 1
 *             numSenior: 0
 *             numStudent: 3
 *             promotionCode: "JV4SX91R1E8XLD7"
 *             paymentMethod: "paypal"
 *             paymentSuccessUrl: "http://localhost:5173/payment/success"
 *             paymentFailUrl: "http://localhost:5173/payment/fail"
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticket:
 *                       $ref: '#/components/schemas/Ticket'
 *                     paymentId:
 *                       type: string
 *                     paymentResponse:
 *                       type: object
 *                       nullable: true
 *
 * /v1/route/ticket/tickets/create-long-term:
 *   post:
 *     summary: Create a long-term ticket (pass-based)
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
 *               passType:
 *                 type: string
 *                 enum: [day_pass, weekly_pass, monthly_pass, yearly_pass, lifetime_pass]
 *               promotionCode:
 *                 type: string
 *                 description: Optional promotion code
 *               paymentMethod:
 *                 type: string
 *                 enum: [paypal, vnpay, credit_card, debit_card, cash, digital_wallet, bank_transfer]
 *               paymentSuccessUrl:
 *                 type: string
 *                 format: uri
 *               paymentFailUrl:
 *                 type: string
 *                 format: uri
 *               currency:
 *                 type: string
 *                 enum: [VND, USD, CNY]
 *                 default: VND
 *               waitForPayment:
 *                 type: boolean
 *                 default: true
 *           example:
 *             passType: "monthly_pass"
 *             promotionCode: "SUMMER2024"
 *             paymentMethod: "vnpay"
 *             paymentSuccessUrl: "http://localhost:5173/payment/success"
 *             paymentFailUrl: "http://localhost:5173/payment/fail"
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticket:
 *                       $ref: '#/components/schemas/Ticket'
 *                     paymentId:
 *                       type: string
 *                     paymentResponse:
 *                       type: object
 *                       nullable: true
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 *                 format: email
 *           example:
 *             email: "user@example.com"
 *     responses:
 *       200:
 *         description: Ticket sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                       nullable: true
 *
 * /v1/route/ticket/tickets/{id}/payment:
 *   get:
 *     summary: Get ticket payment information
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
 *         description: Payment information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                     paymentUrl:
 *                       type: string
 *                       nullable: true
 *                     paymentMethod:
 *                       type: string
 *                     status:
 *                       type: string
 *
 * /v1/route/ticket/tickets/payment-status/{paymentId}:
 *   get:
 *     summary: Get payment status by payment ID
 *     tags: [Tickets]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     paymentId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTickets:
 *                       type: integer
 *                     activeTickets:
 *                       type: integer
 *                     usedTickets:
 *                       type: integer
 *                     cancelledTickets:
 *                       type: integer
 *                     expiredTickets:
 *                       type: integer
 *                     totalRevenue:
 *                       type: number
 *                     averageTicketPrice:
 *                       type: number
 *
 * /v1/route/ticket/fares/getAllActiveFares:
 *   get:
 *     summary: Get all active fares
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of active fares
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/searchFares:
 *   get:
 *     summary: Search fares
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: routeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/getFaresByRoute/{routeId}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/getFaresBetweenStations/{originId}/{destinationId}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/getFaresByZone/{zones}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/calculateFarePrice/{id}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     fareId:
 *                       type: string
 *                     basePrice:
 *                       type: number
 *                     calculatedPrice:
 *                       type: number
 *                     currency:
 *                       type: string
 *
 * /v1/route/ticket/fares/fareStatistics:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalFares:
 *                       type: integer
 *                     activeFares:
 *                       type: integer
 *                     averagePrice:
 *                       type: number
 *                     totalRevenue:
 *                       type: number
 *
 * /v1/route/ticket/fares/bulkUpdateFares:
 *   put:
 *     summary: Bulk update fares (admin)
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
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fareId:
 *                       type: string
 *                     basePrice:
 *                       type: number
 *                     isActive:
 *                       type: boolean
 *           example:
 *             updates:
 *               - fareId: "fare_123"
 *                 basePrice: 15000
 *                 isActive: true
 *               - fareId: "fare_456"
 *                 basePrice: 18000
 *                 isActive: false
 *     responses:
 *       200:
 *         description: Fares updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     updatedCount:
 *                       type: integer
 *
 * /v1/route/ticket/fares/getAllFares:
 *   get:
 *     summary: Get all fares (staff, admin)
 *     tags: [Fares]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of all fares
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/createFare:
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
 *                 default: true
 *           example:
 *             routeId: "route_abc123"
 *             basePrice: 15000
 *             currency: "VND"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Fare created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/getFareById/{id}:
 *   get:
 *     summary: Get fare by ID
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
 *         description: Fare details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/updateFare/{id}:
 *   put:
 *     summary: Update fare (admin)
 *     tags: [Fares]
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
 *     responses:
 *       200:
 *         description: Fare updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Fare'
 *
 * /v1/route/ticket/fares/deleteFare/{id}:
 *   delete:
 *     summary: Delete fare (admin)
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
 *         description: Fare deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 * /v1/route/ticket/promotion/activePromotions:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/searchPromotions:
 *   get:
 *     summary: Search promotions
 *     tags: [Promotions]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Search result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/validatePromotion/{code}:
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
 *             ticketType: "oneway"
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     promotion:
 *                       $ref: '#/components/schemas/Promotion'
 *                     discountAmount:
 *                       type: number
 *                     reason:
 *                       type: string
 *                       nullable: true
 *
 * /v1/route/ticket/promotion/applyPromotion/{code}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     appliedPromotion:
 *                       $ref: '#/components/schemas/Promotion'
 *                     discountAmount:
 *                       type: number
 *
 * /v1/route/ticket/promotion/validatePromotionsBulk:
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
 *                 properties:
 *                   ticketType:
 *                     type: string
 *                   passengerType:
 *                     type: string
 *                   purchaseAmount:
 *                     type: number
 *           example:
 *             codes: ["SUMMER2025", "WELCOME10"]
 *             validationData:
 *               ticketType: "oneway"
 *               passengerType: "adult"
 *               purchaseAmount: 60000
 *     responses:
 *       200:
 *         description: Bulk validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       isValid:
 *                         type: boolean
 *                       reason:
 *                         type: string
 *                       promotion:
 *                         $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/getPromotionByCode/{code}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/promotionStatistics:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalPromotions:
 *                       type: integer
 *                     activePromotions:
 *                       type: integer
 *                     totalUsage:
 *                       type: integer
 *                     totalDiscount:
 *                       type: number
 *
 * /v1/route/ticket/promotion/promotionUsageReport/{id}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     promotion:
 *                       $ref: '#/components/schemas/Promotion'
 *                     usageCount:
 *                       type: integer
 *                     totalDiscount:
 *                       type: number
 *                     usageHistory:
 *                       type: array
 *                       items:
 *                         type: object
 *
 * /v1/route/ticket/promotion/expirePromotions:
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
 *               promotionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *           example:
 *             promotionIds: ["promo_123", "promo_456"]
 *     responses:
 *       200:
 *         description: Promotions expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiredCount:
 *                       type: integer
 *
 * /v1/route/ticket/promotion/allPromotions:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/createPromotion:
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
 *               - promotionCode
 *               - name
 *               - type
 *               - value
 *               - validFrom
 *               - validUntil
 *             properties:
 *               promotionCode:
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
 *                 default: true
 *           example:
 *             promotionCode: "SUMMER2025"
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/getPromotionById/{id}:
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/updatePromotion/{id}:
 *   put:
 *     summary: Update promotion (admin)
 *     tags: [Promotions]
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
 *     responses:
 *       200:
 *         description: Promotion updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Promotion'
 *
 * /v1/route/ticket/promotion/deletePromotion/{id}:
 *   delete:
 *     summary: Delete promotion (admin)
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
 *         description: Promotion deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 * /v1/route/ticket/passengerDiscounts/getAllPassengerDiscounts:
 *   get:
 *     summary: Get all passenger discounts
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of passenger discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PassengerDiscount'
 *
 * /v1/route/ticket/passengerDiscounts/getPassengerDiscountByType/{passengerType}:
 *   get:
 *     summary: Get passenger discount by type
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: passengerType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [adult, child, senior, student, elder, teenager]
 *     responses:
 *       200:
 *         description: Passenger discount details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PassengerDiscount'
 *
 * /v1/route/ticket/passengerDiscounts/createPassengerDiscount:
 *   post:
 *     summary: Create a new passenger discount (admin)
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - passengerType
 *               - discountType
 *               - discountValue
 *             properties:
 *               passengerType:
 *                 type: string
 *                 enum: [adult, child, senior, student, elder, teenager]
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed_amount, free]
 *               discountValue:
 *                 type: number
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *           example:
 *             passengerType: "elder"
 *             discountType: "percentage"
 *             discountValue: 20
 *             description: "20% discount for elderly passengers"
 *             isActive: true
 *             validFrom: "2025-01-01T00:00:00Z"
 *             validUntil: null
 *     responses:
 *       201:
 *         description: Passenger discount created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PassengerDiscount'
 *
 * /v1/route/ticket/passengerDiscounts/updatePassengerDiscount/{discountId}:
 *   put:
 *     summary: Update passenger discount (admin)
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discountId
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
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed_amount, free]
 *               discountValue:
 *                 type: number
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               validFrom:
 *                 type: string
 *                 format: date-time
 *               validUntil:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *           example:
 *             discountType: "percentage"
 *             discountValue: 25
 *             description: "25% discount for elderly passengers"
 *             isActive: true
 *             validFrom: "2025-01-01T00:00:00Z"
 *             validUntil: null
 *     responses:
 *       200:
 *         description: Passenger discount updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/PassengerDiscount'
 *
 * /v1/route/ticket/passengerDiscounts/deletePassengerDiscount/{discountId}:
 *   delete:
 *     summary: Delete passenger discount (admin)
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: discountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Passenger discount deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *
 * /v1/route/ticket/passengerDiscounts/calculateDiscount/{passengerType}:
 *   get:
 *     summary: Calculate discount for passenger type
 *     tags: [PassengerDiscounts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: passengerType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [adult, child, senior, student, elder, teenager]
 *       - in: query
 *         name: originalPrice
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Discount calculation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     passengerType:
 *                       type: string
 *                     originalPrice:
 *                       type: number
 *                     discountAmount:
 *                       type: number
 *                     finalPrice:
 *                       type: number
 *                     discount:
 *                       $ref: '#/components/schemas/PassengerDiscount'
 */

