Tổng quan

- **Service**: API Gateway (`api-gateway`)
- **Vai trò**: Điểm vào duy nhất của Metro Backend. Thực hiện routing động tới các microservice, xác thực JWT/API Key, rate limiting, session (Redis), circuit breaker, và metrics.
- **Giao tiếp**:
  - **REST**: Express 4.x
  - **Kafka**: KafkaJS (producer/consumer wrapper) – dùng được, chưa thấy flow cụ thể trong code business
  - **Webhook/gRPC**: (chưa có trong repo)
- **Cổng mặc định**: 8000 (theo `src/config.json` và `Dockerfile`)
- **Đường dẫn serve chính**:
  - Swagger UI: `/api-docs`
  - Metrics Prometheus: `/metrics`
  - Health: `/health`
  - Dynamic routing: `/v1/route/:endPoint[/*]`, `/v1/auth/:endPoint[/*]`, `/v1/guest/:endPoint[/*]`

API & Hợp đồng

- Tất cả path gốc được mount trong `src/routes/index.js` và các route con trong `src/routes/*.route.js`.

REST: Endpoints chính

| Method | Path | Mô tả | Auth | Request (tóm tắt) | Response (tóm tắt) | Status |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | Health check Gateway | Không | - | `{success, message, timestamp, uptime, services[]}` | 200 |
| GET | `/v1/discovery` | Liệt kê services active từ `config.json` | Không | - | `{success, data:{gateway, services[], guestServices[]}}` | 200 |
| GET | `/metrics` | Prometheus metrics | Không | - | text/plain Prometheus | 200 |
| GET | `/api-docs` | Swagger UI | Không | - | HTML | 200 |
| ALL | `/v1/auth/:endPoint[/*]` | Chỉ forward tới `auth` service | API Key (nếu `NEED_API_KEY=true`) | Service-specific | Service-specific | 2xx/4xx/5xx |
| ALL | `/v1/route/:endPoint[/*]` | Dynamic routing tới các service khác | JWT + API Key (nếu bật) | Service-specific | Service-specific | 2xx/4xx/5xx |
| ALL | `/v1/guest/:endPoint[/*]` | Guest routing, chỉ tới `public` | API Key (nếu bật) | Service-specific | Service-specific | 2xx/4xx/5xx |
| GET | `/v1/service` | Danh sách services (quản trị) | JWT (+ API Key nếu bật) | - | `{success, data:[...]}` | 200 |
| POST | `/v1/service` | Tạo service | JWT (+ API Key nếu bật) | `{name,endPoint}` | `{success,data}` | 200 |
| GET | `/v1/service/:serviceId` | Lấy service theo ID | JWT (+ API Key nếu bật) | - | `{success,data}` hoặc 404 | 200/404 |
| PUT | `/v1/service/:serviceId` | Cập nhật service | JWT (+ API Key nếu bật) | `updateData` | `{success,message}` | 200 |
| DELETE | `/v1/service/:serviceId` | Xoá service | JWT (+ API Key nếu bật) | - | `{success,data}` | 200 |
| GET | `/v1/service/:serviceId/instances` | Lấy danh sách instance | JWT (+ API Key nếu bật) | - | `{success,data:[...]}` | 200 |
| POST | `/v1/service/:serviceId/instances` | Thêm instance | JWT (+ API Key nếu bật) | `{host,port,...}` | `{success,data}` | 200 |
| GET | `/v1/service/:serviceId/instances/:instanceId` | Lấy 1 instance | JWT (+ API Key nếu bật) | - | `{success,message}` | 200 |
| PUT | `/v1/service/:serviceId/instances/:instanceId` | Cập nhật instance | JWT (+ API Key nếu bật) | `updateData` | `{success,message}` | 200 |
| DELETE | `/v1/service/:serviceId/instances/:instanceId` | Xoá instance | JWT (+ API Key nếu bật) | - | `{success,data}` | 200 |

Ghi chú:
- Auth: JWT kiểm tra trong `Authorization: Bearer` hoặc cookie `accessToken` (`src/middlewares/auth.middleware.js`). API Key header `x-api-key` nếu `NEED_API_KEY=true`.
- Forwarding path: Gateway thêm prefix `/v1/:endPoint[/...]` khi proxy (trừ guest route; xem `routing.service.js`).

OpenAPI/Swagger

- File cấu hình: `src/swagger/swagger.js`
- Nguồn sinh: JSDoc từ `src/routes/**/*.js` và `src/swagger/**/*.js`
- UI: `/api-docs`
- Cách generate: runtime bằng `swagger-jsdoc`; không có build artifact tĩnh

Versioning

- Prefix REST `/v1` được dùng cho routing downstream. Policy tương thích lùi: (không xác định từ code).

Data Model & Migrations

- CSDL: PostgreSQL (Sequelize)
- Kết nối: `src/config/database.js` (retry, pool)
- Đồng bộ: `sequelize.sync({ force: false })` trong `src/index.js` (không thấy migration files)
- Bảng/Model chính (rút từ `src/models/*.model.js`):
  - `Service` (`Services`)
    - Cột: `id (UUID, PK)`, `name (unique)`, `endPoint`, `description`, `version`, `timeout (default 30000)`, `retries (default 3)`, `circuitBreaker JSONB`, `loadBalancer JSONB`, `authentication JSONB`, `rateLimit JSONB`, `status ENUM('active','inactive','maintenance')`, `createdAt`, `updatedAt`
    - Index: `name (unique)`, `endPoint`
  - `ServiceInstance` (`ServiceInstances`)
    - Cột: `id (UUID, PK)`, `serviceId (FK Services.id)`, `host`, `port`, `weight (1..10)`, `region`, `status ENUM('active','inactive','unhealthy')`, `isHealthy`, `lastHealthCheck`, `metadata JSONB`, `createdAt`, `updatedAt`
    - Index: `serviceId`, `status`, `isHealthy`, unique (`serviceId`,`host`,`port`)
  - `Key` (`Keys`)
    - Cột: `id (UUID, PK)`, `value (hashed)`, `status ENUM('activated','expired')`, `title (nullable)`
- Seeds: `src/seed/seedAPIKey.js` (tạo API key mặc định) – chi tiết: (không xác định từ code)
- Công cụ migration: Sequelize Sync (chưa có migration scripts riêng)

Cấu hình & Secrets

- ENV bắt buộc/trọng yếu (từ `env.example`, code):

| ENV | Bắt buộc | Ví dụ | Mô tả |
| --- | --- | --- | --- |
| `NODE_ENV` | Có | `production` | Môi trường chạy |
| `PORT` | Có | `8000` | Cổng Gateway |
| `DB_HOST` | Có | `postgres` | Host PostgreSQL |
| `DB_PORT` | Có | `5432` | Cổng PostgreSQL |
| `DB_NAME` | Có | `gateway_db` | Tên CSDL |
| `DB_USER` | Có | `gateway_service` | User CSDL |
| `DB_PASSWORD` | Có | `${GATEWAY_DB_PASSWORD}` | Mật khẩu CSDL |
| `JWT_ACCESS_SECRET` | Có | `CHANGE_ME` | Secret JWT user (HS256) |
| `JWT_REFRESH_SECRET` | Có | `CHANGE_ME` | Secret refresh JWT |
| `JWT_ACCESS_EXPIRY` | Không | `15m` | TTL access token |
| `JWT_REFRESH_EXPIRY` | Không | `7d` | TTL refresh token |
| `SERVICE_JWT_SECRET` | Có | `CHANGE_ME` | JWT service-to-service (HS256) |
| `SESSION_SECRET` | Có | `CHANGE_ME_SESSION_SECRET` | Secret session |
| `SESSION_NAME` | Không | `metro_session` | Tên cookie session |
| `SESSION_MAX_AGE` | Không | `86400000` | Max-Age cookie (ms) |
| `SESSION_COOKIE_SECURE` | Không | `true` | Cookie Secure |
| `SESSION_COOKIE_HTTPONLY` | Không | `true` | HttpOnly |
| `SESSION_COOKIE_SAMESITE` | Không | `strict` | SameSite |
| `API_KEY_HASH_SECRET` | Có | `CHANGE_ME` | Secret hash API key |
| `NEED_API_KEY` | Có | `true` | Bật kiểm tra `x-api-key` |
| `REDIS_HOST` | Có | `redis` | Host Redis |
| `REDIS_PORT` | Có | `6379` | Cổng Redis |
| `REDIS_PASSWORD` | Không | `` | Password Redis |
| `REDIS_KEY_PREFIX` | Không | `api-gateway:` | Prefix key Redis |
| `UI_CLIENT` | Không | `https://app.example.com` | Origin CORS dev |
| `UV_VERCEL_CLIENT` | Không | `https://metro-system.vercel.app` | Origin CORS dev |
| `API_GATEWAY_ORIGIN` | Không | `https://api.example.com` | Origin override khi proxy |
| `KAFKA_BROKERS` | Có | `kafka-1:19092,...` | Danh sách broker |
| `KAFKA_CLIENT_ID` | Có | `api-gateway` | Kafka clientId |
| `KAFKA_GROUP_ID` | Có | `api-gateway-group` | Kafka groupId |
| `KAFKA_BROKERS_INTERNAL` | Không | `kafka-1:19092,...` | Nội bộ |
| `EMAIL_*` | Không | - | SMTP (chưa thấy sử dụng trong flow chính) |

- Profiles:
  - Dev: bật CORS trong app (prod bỏ qua, dựa Nginx); log chi tiết
  - Staging/Prod: CORS bởi Nginx; secrets từ env/secret manager (theo comment `.env.example`), cookie `secure`
- Nguồn secrets: `.env`, Docker/K8s env. Helm/Secrets: (không xác định từ code service)

Security

- AuthN: JWT HS256 (`JWT_ACCESS_SECRET`), lấy từ cookie `accessToken` hoặc header; service-to-service JWT HS256 (`SERVICE_JWT_SECRET`) chèn vào header `x-service-auth` khi proxy.
- AuthZ: kiểm tra roles trong JWT được forward; chi tiết RBAC downstream – (không xác định từ code)
- API Key: Header `x-api-key`, kiểm tra qua Redis cache + DB `Key` (`key.service.js`). Bật/tắt bởi `NEED_API_KEY`.
- CORS: Dev chỉ định `origin` từ env; Prod bỏ qua trong Express (do Nginx).
- Security headers: `helmet()` bật mặc định.
- Rate limit: Redis-backed limiter
  - Auth: 10 req/15m (`authRateLimiter`)
  - Default: 100 req/15m (`defaultRateLimiter`)
  - API: 1000 req/h (`apiRateLimiter`)
  - Sensitive: 5 req/h (`sensitiveRateLimiter`)
- Rủi ro/khuyến nghị:
  - Secrets trong `.env.example` là placeholder – cần secret manager ở prod.
  - Chưa có request signing giữa services (hiện dùng JWT nội bộ) – cân nhắc HMAC.
  - Tracing phân tán chưa có.

Reliability & Runtime Policies

- Circuit Breaker: `opossum` trong `routing.service.js`
  - timeout 30s, errorThreshold 50%, resetTimeout 30s; có fallback 503
- Retries DB: Sequelize retry `max:5`, exponential backoff tự code (kết nối)
- Redis: reconnect strategy exponential, SIGINT/SIGTERM close
- Health: `/health`; readiness/liveness riêng không thấy – (chưa có trong repo)
- Graceful shutdown HTTP: (không xác định từ code)
- Idempotency theo operation: không thấy cơ chế idempotent request/outbox – (chưa có trong repo)

Observability

- Logging: `winston` + daily rotate file `./src/logs/application-%DATE%.log` (level theo `NODE_ENV`), có `requestLogger` (tắt mặc định).
- Metrics: `prom-client`
  - Endpoint: `/metrics`
  - Metric: `http_request_duration_seconds`, `app_errors_total`, default metrics
- Tracing: header correlation riêng không thấy; W3C/OTEL: (chưa có trong repo)

Build, Run, Test

- Local:
  - Cài đặt: `npm install`
  - Chạy dev: `npm run dev` (Node trực tiếp `src/index.js`)
  - Build: `npm run build` (Babel -> `dist`)
  - Start prod: `npm start` (chạy `dist/index.js`) hoặc Docker chạy `pm2 src/index.js`
- Docker:
  - Image: build từ `Dockerfile` (Node 18-alpine), `EXPOSE 8000`, `CMD pm2-runtime ... src/index.js`
  - Compose: có `docker-compose.yml` ở root (service name xem file gốc) – chi tiết compose tại root, không trong thư mục này
- Helm/K8s: chart chung ở `deploy/helm` (repo root) – thông số cụ thể cho gateway: (không xác định từ code service)
- Test:
  - Jest: `npm test`, unit `npm run test:unit`, integration `npm run test:integration`, coverage `npm run test:coverage`
  - Config: `jest.config.js` (bỏ qua bootstrap/infrastructure khỏi coverage)

Hiệu năng & Quy mô (ngắn)

- Sequelize pool: `max:1000`, `acquire:30000`, `idle:10000`
- Circuit breaker/proxy timeout: 10s proxy, 30s breaker – cân nhắc giảm cho downstream yếu
- Cache route/instance: sử dụng Redis trong `routeCache.service.js` (file tồn tại; chi tiết nội dung không trích ở đây)
- RPS/latency mục tiêu: (chưa khai báo)

Rủi ro & Nợ kỹ thuật

- Chưa có distributed tracing/trace IDs chuẩn
- Chưa có request signing giữa services (dựa vào JWT nội bộ)
- Graceful shutdown HTTP chưa rõ
- Kafka consumer chưa được khởi động trong bootstrap (không thấy `start()` được gọi)
- Dùng Sequelize sync (thiếu migration versioning)

Phụ lục

- ERD rút gọn (từ models):
  - `Services (id, name[UQ], endPoint, version, timeout, retries, circuitBreaker, loadBalancer, authentication, rateLimit, status, createdAt, updatedAt)`
  - `ServiceInstances (id, serviceId[FK], host, port, weight, region, status, isHealthy, lastHealthCheck, metadata, createdAt, updatedAt)`
  - `Keys (id, value, status, title)`
- Link nội bộ:
  - Cấu hình: `./src/config.json`, `./src/config.js`
  - Routes: `./src/routes/index.js`, `./src/routes/routing.route.js`, `./src/routes/auth.route.js`, `./src/routes/guest.route.js`, `./src/routes/service.route.js`
  - Controllers: `./src/controllers/*.js`
  - Swagger: `./src/swagger/swagger.js`
  - Kafka: `./src/kafka/kafkaProducer.js`, `./src/kafka/kafkaConsumer.js`
  - DB: `./src/config/database.js`, `./src/models/*.model.js`
  - Security middlewares: `./src/middlewares/auth.middleware.js`, `./src/middlewares/rateLimiter.js`, `./src/config/session.js`

