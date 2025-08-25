/**
 * @swagger
 * tags:
 *   - name: Gateway
 *     description: |
 *       Summary of all routes in the Metro Backend system:
 *       
 *       - /v1/auth/auth/: Authentication routes (login, register, ...)
 *       - /v1/guest/public: Public routes, no authentication required
 *       - /v1/route/user/admin/: Admin user management
 *       - /v1/route/user/passenger/: Passenger user management
 *       - /v1/route/user/staff/: Staff user management
 *       - /v1/route/ticket/tickets/: Ticket management
 *       - /v1/route/ticket/fares/: Fare management
 *       - /v1/route/ticket/promotions/: Promotion management
 *       - /v1/route/payment/: Payment service (general & PayPal)
 *       - /v1/route/notification/: Notification service (emails, sms)
 *       - /v1/route/webhook/: Webhook service (generic & PayPal)
 *       - /v1/route/report/: Reporting service (reports, templates, schedules)
 *       - /v1/route/transport/station/: Station management
 *       - /v1/route/transport/route/: Route management
 *       - /v1/route/transport/train/: Train management
 *       - /v1/route/transport/trip/: Trip management
 *       - /v1/route/transport/stop/: Stop management
 *       - /v1/route/transport/route-station/: Route-station mapping
 *       - /health: Health check for gateway
 *       - /webhook: Webhook for webhook management
 *       When accessing through API Gateway, use the format `/v1/route/{service}/{entity}/...`
 *
 *       See detailed information about each route in the corresponding swagger files.
 */
module.exports = {};
