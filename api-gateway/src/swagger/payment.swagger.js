/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment operations
 */

/**
 * @swagger
 * tags:
 *   name: Payment - VNPay
 *   description: VNPay payment operations
 */

/**
 * @swagger
 * /v1/route/payment/vnpay:
 *   post:
 *     summary: Initiate VNPay payment
 *     tags: [Payment - VNPay]
 *     responses:
 *       200:
 *         description: VNPay payment initiated
 */

/**
 * @swagger
 * /v1/route/payment/vnpay/return:
 *   get:
 *     summary: VNPay return URL handler
 *     tags: [Payment - VNPay]
 *     responses:
 *       200:
 *         description: VNPay return processed
 */

/**
 * @swagger
 * /v1/route/payment/vnpay/ipn:
 *   post:
 *     summary: VNPay IPN webhook
 *     tags: [Payment - VNPay]
 *     responses:
 *       200:
 *         description: IPN processed
 */

/**
 * @swagger
 * tags:
 *   name: Payment - Sepay
 *   description: Sepay payment operations
 */

/**
 * @swagger
 * /v1/route/payment/sepay/create-order:
 *   post:
 *     summary: Create a Sepay order
 *     tags: [Payment - Sepay]
 *     responses:
 *       200:
 *         description: Sepay order created
 */

/**
 * @swagger
 * /v1/route/payment/sepay/capture/{orderId}:
 *   post:
 *     summary: Capture a Sepay payment
 *     tags: [Payment - Sepay]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment captured
 */

/**
 * @swagger
 * /v1/route/payment/sepay/order/{orderId}:
 *   get:
 *     summary: Get Sepay order details
 *     tags: [Payment - Sepay]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */

/**
 * @swagger
 * /v1/route/payment/sepay/check-status/{orderId}:
 *   get:
 *     summary: Check Sepay order status
 *     tags: [Payment - Sepay]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status details
 */

/**
 * @swagger
 * /v1/route/payment/sepay/webhook:
 *   post:
 *     summary: Handle Sepay webhook events
 *     tags: [Payment - Sepay]
 *     responses:
 *       200:
 *         description: Webhook processed
 */

/**
 * @swagger
 * tags:
 *   name: Payment - PayPal
 *   description: PayPal payment operations
 */

/**
 * @swagger
 * /v1/route/payment/ticket/{ticketId}:
 *   get:
 *     summary: Get payment URL for a ticket
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Payment information with URL if available
 *       404:
 *         description: Payment not found for this ticket or URL unavailable
 */

/**
 * @swagger
 * /v1/route/payment/status/{ticketId}:
 *   get:
 *     summary: Get payment status for a ticket
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Payment status details
 *       404:
 *         description: Payment not found for this ticket
 */

/**
 * @swagger
 * /v1/route/payment/paypal/create-order:
 *   post:
 *     summary: Create a PayPal order
 *     tags: [Payment - PayPal]
 *     responses:
 *       200:
 *         description: PayPal order created
 */

/**
 * @swagger
 * /v1/route/payment/paypal/capture/{orderId}:
 *   post:
 *     summary: Capture a PayPal payment
 *     tags: [Payment - PayPal]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment captured
 */

/**
 * @swagger
 * /v1/route/payment/paypal/order/{orderId}:
 *   get:
 *     summary: Get PayPal order details
 *     tags: [Payment - PayPal]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /v1/route/payment/paypal/check-status/{orderId}:
 *   get:
 *     summary: Check if PayPal order is ready for capture
 *     tags: [Payment - PayPal]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order status
 */

/**
 * @swagger
 * /v1/route/payment/paypal/webhook:
 *   post:
 *     summary: Handle PayPal webhook events
 *     tags: [Payment - PayPal]
 *     responses:
 *       200:
 *         description: Webhook processed
 */
