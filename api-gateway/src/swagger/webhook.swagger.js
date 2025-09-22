/**
 * @swagger
 * tags:
 *   name: Webhook Service
 *   description: Generic webhook service utilities
 */

/**
 * @swagger
 * /v1/route/webhook/webhook/paypal/retry:
 *   post:
 *     summary: Retry failed PayPal webhooks (alias)
 *     tags: [Webhook - PayPal]
 *     responses:
 *       200:
 *         description: Retry scheduled
 */

/**
 * @swagger
 * tags:
 *   name: Webhook - PayPal
 *   description: PayPal webhook endpoints
 */

/**
 * @swagger
 * /v1/route/webhook/health:
 *   get:
 *     summary: Webhook service health
 *     tags: [Webhook Service]
 *     responses:
 *       200:
 *         description: Service is healthy
 */

/**
 * @swagger
 * /v1/route/webhook/statistics:
 *   get:
 *     summary: Get generic webhook statistics
 *     tags: [Webhook Service]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         required: false
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         required: false
 *     responses:
 *       200:
 *         description: Statistics payload
 */

/**
 * @swagger
 * /v1/route/webhook/webhook/paypal:
 *   post:
 *     summary: Receive PayPal webhook events
 *     tags: [Webhook - PayPal]
 *     responses:
 *       200:
 *         description: Webhook received
 */

/**
 * @swagger
 * /v1/route/webhook/webhook/health:
 *   get:
 *     summary: PayPal webhook route health
 *     tags: [Webhook - PayPal]
 *     responses:
 *       200:
 *         description: OK
 */

/**
 * @swagger
 * /v1/route/webhook/webhook/statistics:
 *   get:
 *     summary: Get PayPal webhook statistics
 *     tags: [Webhook - PayPal]
 *     responses:
 *       200:
 *         description: Statistics data
 */

/**
 * @swagger
 * /v1/route/webhook/webhook/retry:
 *   post:
 *     summary: Retry failed PayPal webhooks
 *     tags: [Webhook - PayPal]
 *     responses:
 *       200:
 *         description: Retry scheduled
 */
