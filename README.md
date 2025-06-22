# Microservices System with API Gateway

Hệ thống microservices với API Gateway đóng vai trò chính trong authentication và authorization, sử dụng Express.js, PostgreSQL, Redis và Docker.

## 🏗️ Kiến trúc

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   API Gateway    │───▶│  Auth Service   │
│                 │    │   (Port 8080)    │    │  (Port 3000)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ├─────────────────────┐
                              ▼                     ▼
                       ┌─────────────────┐  ┌─────────────────┐
                       │  User Service   │  │ Product Service │
                       │  (Port 3002)    │  │  (Port 3003)    │
                       └─────────────────┘  └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   + Redis       │
                       └─────────────────┘
```

## 🚀 Tính năng chính

### API Gateway
- **Authentication & Authorization**: Xử lý JWT tokens, rate limiting, CORS
- **Proxy Routing**: Định tuyến request đến các microservices dựa trên path
- **Security**: Helmet, rate limiting (100 req/15min), request tracing
- **Documentation**: Swagger UI tại `http://localhost:8080/api-docs`
- **Health Checks**: Monitoring tất cả services

### Auth Service
- **User Management**: Register, login, logout, email verification
- **Token Management**: JWT access tokens (15min) + refresh tokens (7 days)
- **Database**: PostgreSQL với Sequelize ORM
- **Caching**: Redis cho refresh tokens
- **Email**: Nodemailer + MailHog cho testing

## 🛠️ Setup và chạy local

### 1. Prerequisites
```bash
- Docker & Docker Compose
- Node.js 18+ (cho development)
- Git
```

### 2. Clone và setup
```bash
git clone <repository-url>
cd backend

# Copy environment files
cp api-gateway/env.example api-gateway/.env
cp auth-service/env.example auth-service/.env
```

### 3. Chạy với Docker Compose
```bash
# Build và start tất cả services
docker-compose up --build

# Chạy trong background
docker-compose up -d

# Xem logs
docker-compose logs -f api-gateway
docker-compose logs -f auth-service

# Stop services
docker-compose down
```

### 4. Kiểm tra services
- **API Gateway**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/api-docs
- **Auth Service**: http://localhost:3000
- **User Service**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **MailHog UI**: http://localhost:8025
- **Redis Commander**: http://localhost:8081
- **pgAdmin**: http://localhost:8082

## 📚 API Documentation

### Authentication Endpoints

#### 1. Register User
```http
POST /v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### 2. Login
```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 3. Logout
```http
POST /v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

#### 4. Refresh Token
```http
POST /v1/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

#### 5. Get Current User
```http
GET /v1/auth/me
Authorization: Bearer <access_token>
```

#### 6. Verify Email
```http
GET /v1/auth/verify-email/<email_token>
```

### User Service Endpoints (Example)

#### Get User Profile
```http
GET /v1/users/profile
Authorization: Bearer <access_token>
```

#### Update User Profile
```http
PUT /v1/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### Health Check Endpoints

#### API Gateway Health
```http
GET /health
```

#### All Services Health
```http
GET /v1/services/health
```

## 🔧 Configuration

### Environment Variables

#### API Gateway (.env)
```env
NODE_ENV=development
PORT=8080
JWT_ACCESS_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
REDIS_HOST=redis
AUTH_SERVICE_URL=http://auth-service:3000
```

#### Auth Service (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_HOST=postgres
DATABASE_NAME=auth_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres123
REDIS_HOST=redis
```

## 🏭 Production Deployment

### 1. Build Production Images
```bash
# API Gateway
docker build -t api-gateway:prod --target production ./api-gateway

# Auth Service  
docker build -t auth-service:prod --target production ./auth-service
```

### 2. Environment Setup
```bash
# Set production environment variables
export NODE_ENV=production
export JWT_ACCESS_SECRET=<strong-secret>
export JWT_REFRESH_SECRET=<strong-secret>
export DATABASE_PASSWORD=<strong-password>
```

### 3. Deploy với Docker Swarm
```bash
docker stack deploy -c docker-compose.prod.yml microservices
```

### 4. Deploy với Kubernetes
```bash
kubectl apply -f k8s/
```

## 🔒 Security Features

- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **Rate Limiting**: 100 requests/15min per IP, stricter limits for auth endpoints
- **CORS**: Configurable allowed origins
- **Helmet**: Security headers (CSP, XSS protection, etc.)
- **Request Tracing**: X-Request-ID headers for monitoring
- **Input Validation**: express-validator cho tất cả inputs
- **Password Hashing**: bcrypt với salt rounds
- **SQL Injection Protection**: Sequelize ORM

## 📊 Monitoring & Logging

### Logs
- **Winston Logger**: Structured logging với timestamps
- **Request/Response Logging**: Tất cả API calls được log
- **Error Tracking**: Chi tiết error logs với stack traces
- **Performance Metrics**: Response times, request counts

### Health Checks
- **API Gateway**: `/health`, `/ready`, `/live`
- **Services Health**: `/v1/services/health`
- **Docker Health Checks**: Automatic container health monitoring

## 🧪 Testing

### Unit Tests
```bash
cd api-gateway
npm test

cd auth-service  
npm test
```

### Integration Tests
```bash
# Test với Docker Compose
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### API Testing với Postman
1. Import collection: `postman/microservices-api.json`
2. Set environment variables
3. Run test sequences

## 🔄 Adding New Microservices

### 1. Tạo service mới
```bash
mkdir new-service
cd new-service
npm init -y
# Setup Express app...
```

### 2. Thêm proxy route trong API Gateway
```javascript
// api-gateway/src/routes/proxy.js
router.use('/v1/new-service', 
  generalRateLimiter,
  authenticateToken, // nếu cần auth
  createServiceProxy(serviceConfig.newService, {
    '^/v1/new-service': '/v1/new-service'
  })
);
```

### 3. Cập nhật docker-compose.yml
```yaml
new-service:
  build:
    context: ./new-service
    target: development
  ports:
    - "3004:3004"
  environment:
    - NODE_ENV=development
    - PORT=3004
  networks:
    - microservice-network
```

### 4. Cập nhật API Gateway config
```json
// api-gateway/src/environments/config.default.json
{
  "services": {
    "newService": "http://new-service:3004"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Redis Connection Failed  
```bash
# Check Redis logs
docker-compose logs redis

# Flush Redis data
docker-compose exec redis redis-cli FLUSHALL
```

#### Service Not Starting
```bash
# Check service logs
docker-compose logs <service-name>

# Rebuild service
docker-compose build <service-name>
docker-compose up <service-name>
```

#### Port Already in Use
```bash
# Check ports
lsof -i :8080
lsof -i :3000

# Kill processes
kill -9 <PID>
```

## 📝 Development

### Code Structure
```
backend/
├── api-gateway/          # Main API Gateway
│   ├── src/
│   │   ├── config/       # Winston, Redis, Swagger
│   │   ├── middleware/   # Auth, Rate limit, CORS
│   │   ├── routes/       # Auth, Proxy, Health
│   │   └── environments/ # Config management
│   └── Dockerfile
├── auth-service/         # Authentication service
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Database models
│   │   └── routes/       # Route definitions
│   └── Dockerfile
├── user-service/         # Example microservice
├── docker-compose.yml    # Development setup
└── README.md
```

### Development Workflow
1. Make changes trong service folders
2. Services sẽ auto-reload với nodemon
3. Test endpoints qua Swagger UI
4. Check logs: `docker-compose logs -f <service>`
5. Debug với breakpoints trong IDE

## 📖 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [Redis Documentation](https://redis.io/docs/)
- [Docker Compose](https://docs.docker.com/compose/)
- [JWT.io](https://jwt.io/)
- [Swagger Documentation](https://swagger.io/docs/)

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`
5. Submit Pull Request

## 📄 License

MIT License - see LICENSE file for details. 