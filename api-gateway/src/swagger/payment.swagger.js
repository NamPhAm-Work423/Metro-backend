/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment operations
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
