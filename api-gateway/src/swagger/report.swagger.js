/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Reporting service endpoints (admin only)
 */

/**
 * @swagger
 * /v1/route/report/reports/create-report:
 *   post:
 *     summary: Create a report
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Report created and generation scheduled
 */

/**
 * @swagger
 * /v1/route/report/reports/get-reports:
 *   get:
 *     summary: List reports
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: skip
 *         schema: { type: integer, minimum: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: report_type
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated reports
 */

/**
 * @swagger
 * /v1/route/report/reports/get-report/{report_id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report details
 *       404:
 *         description: Report not found
 */

/**
 * @swagger
 * /v1/route/report/reports/delete-report/{report_id}:
 *   delete:
 *     summary: Delete report by ID
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: report_id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Report deleted
 *       404:
 *         description: Report not found
 */

/**
 * @swagger
 * /v1/route/report/reports/create-template:
 *   post:
 *     summary: Create a report template
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Template created
 */

/**
 * @swagger
 * /v1/route/report/reports/get-templates:
 *   get:
 *     summary: Get all report templates
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: List of templates
 */

/**
 * @swagger
 * /v1/route/report/reports/create-schedule:
 *   post:
 *     summary: Create a report schedule
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Schedule created
 */

/**
 * @swagger
 * /v1/route/report/reports/get-daily-analytics:
 *   get:
 *     summary: Get daily analytics
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Daily analytics data
 */

/**
 * @swagger
 * /v1/route/report/reports/get-weekly-analytics:
 *   get:
 *     summary: Get weekly analytics
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Weekly analytics data
 */

/**
 * @swagger
 * /v1/route/report/reports/get-monthly-analytics:
 *   get:
 *     summary: Get monthly analytics
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Monthly analytics data
 */
