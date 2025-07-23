/**
 * @swagger
 * tags:
 *   - name: Gateway
 *     description: |
 *       Tổng hợp các nhóm route chính của toàn bộ hệ thống Metro Backend:
 *       
 *       - /v1/auth/auth/: Các route xác thực (login, register, ...)
 *       - /v1/guest/public: Các route public, không cần xác thực
 *       - /v1/route/user/admin/: Quản lý admin user
 *       - /v1/route/user/passenger/: Quản lý passenger user
 *       - /v1/route/user/staff/: Quản lý staff user
 *       - /v1/route/ticket/tickets/: Quản lý vé
 *       - /v1/route/ticket/fares/: Quản lý giá vé
 *       - /v1/route/ticket/promotions/: Quản lý khuyến mãi
 *       - /v1/route/transport/station/: Quản lý station
 *       - /v1/route/transport/route/: Quản lý route
 *       - /v1/route/transport/train/: Quản lý train
 *       - /v1/route/transport/trip/: Quản lý trip
 *       - /v1/route/transport/stop/: Quản lý stop
 *       - /v1/route/transport/route-station/: Quản lý mapping giữa route và station
 *       - /v1/discovery: Danh sách các service đang hoạt động
 *       - /health: Health check cho gateway
 *
 *       Khi truy cập qua API Gateway, bạn sẽ dùng dạng `/v1/route/{service}/{entity}/...`
 *
 *       Xem chi tiết từng nhóm route ở các file swagger tương ứng.
 */
module.exports = {};
