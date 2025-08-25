/**
 * @swagger
 * tags:
 *   name: Notification Emails
 *   description: Email notifications management (admin only)
 */

/**
 * @swagger
 * tags:
 *   name: Notification SMS
 *   description: SMS notifications management (admin only)
 */

/**
 * @swagger
 * tags:
 *   name: Notification Service
 *   description: Notification service utilities and health
 */

/**
 * @swagger
 * /v1/route/notification/health:
 *   get:
 *     summary: Notification Service health
 *     tags: [Notification Service]
 *     responses:
 *       200:
 *         description: Service is healthy
 */

/**
 * @swagger
 * /v1/route/notification/emails/getAllEmails:
 *   get:
 *     summary: Get all emails
 *     description: Returns paginated list of emails with optional filters
 *     tags: [Notification Emails]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         required: false
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *         required: false
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         required: false
 *     responses:
 *       200:
 *         description: List of emails
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */

/**
 * @swagger
 * /v1/route/notification/emails/getEmailStats:
 *   get:
 *     summary: Get email statistics
 *     tags: [Notification Emails]
 *     responses:
 *       200:
 *         description: Email stats
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin only)
 */

/**
 * @swagger
 * /v1/route/notification/emails/getEmailById/{id}:
 *   get:
 *     summary: Get email by ID
 *     tags: [Notification Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Email details
 *       404:
 *         description: Email not found
 */

/**
 * @swagger
 * /v1/route/notification/emails/getEmailTimeline/{id}:
 *   get:
 *     summary: Get email timeline
 *     tags: [Notification Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timeline entries
 *       404:
 *         description: Email not found
 */

/**
 * @swagger
 * /v1/route/notification/emails/getEmailByRecipient/{recipient}:
 *   get:
 *     summary: Get emails by recipient
 *     tags: [Notification Emails]
 *     parameters:
 *       - in: path
 *         name: recipient
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Emails for recipient
 */

/**
 * @swagger
 * /v1/route/notification/emails/retryEmail/{id}:
 *   post:
 *     summary: Retry sending a failed email
 *     tags: [Notification Emails]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Retry scheduled
 *       409:
 *         description: Email not in retryable state
 */

/**
 * @swagger
 * /v1/route/notification/sms/getAllSMS:
 *   get:
 *     summary: Get all SMS
 *     description: Returns paginated list of SMS with optional filters
 *     tags: [Notification SMS]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         required: false
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *         required: false
 *       - in: query
 *         name: sort
 *         schema: { type: string }
 *         required: false
 *     responses:
 *       200:
 *         description: List of SMS
 */

/**
 * @swagger
 * /v1/route/notification/sms/getSMSStats:
 *   get:
 *     summary: Get SMS statistics
 *     tags: [Notification SMS]
 *     responses:
 *       200:
 *         description: SMS stats
 */

/**
 * @swagger
 * /v1/route/notification/sms/getSMSCosts:
 *   get:
 *     summary: Get SMS cost analysis
 *     tags: [Notification SMS]
 *     responses:
 *       200:
 *         description: SMS cost breakdown
 */

/**
 * @swagger
 * /v1/route/notification/sms/getSMSById/{id}:
 *   get:
 *     summary: Get SMS by ID
 *     tags: [Notification SMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: SMS details
 *       404:
 *         description: SMS not found
 */

/**
 * @swagger
 * /v1/route/notification/sms/getSMSTimeline/{id}:
 *   get:
 *     summary: Get SMS timeline
 *     tags: [Notification SMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Timeline entries
 *       404:
 *         description: SMS not found
 */

/**
 * @swagger
 * /v1/route/notification/sms/getSMSByRecipient/{recipient}:
 *   get:
 *     summary: Get SMS by recipient
 *     tags: [Notification SMS]
 *     parameters:
 *       - in: path
 *         name: recipient
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: SMS for recipient
 */

/**
 * @swagger
 * /v1/route/notification/sms/retrySMS/{id}:
 *   post:
 *     summary: Retry sending a failed SMS
 *     tags: [Notification SMS]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Retry scheduled
 *       409:
 *         description: SMS not in retryable state
 */
