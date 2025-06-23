# Metro Backend Setup Guide

## 🏗️ Kiến trúc hệ thống

Hệ thống Metro Backend sử dụng kiến trúc microservices với:

- **API Gateway** (Port 3000): Xử lý authentication, authorization và routing
- **Passenger Service** (Port 3001): Quản lý thông tin hành khách

## 📋 Yêu cầu hệ thống

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL 15+
- Redis 7+

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
# Cài đặt tất cả dependencies
npm run install:all
```

### 2. Cấu hình environment variables

#### API Gateway (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metro_db
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redispass123

# Server
PORT=3000
NODE_ENV=development
```

#### Passenger Service (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=metro_db
DB_USER=postgres
DB_PASSWORD=postgres

# Server
PORT=3001
NODE_ENV=development
```

### 3. Khởi động với Docker (Khuyến nghị)

```bash
# Khởi động PostgreSQL và Redis
npm run docker:up

# Chờ một chút để database khởi động hoàn tất
# Sau đó khởi động services
npm start
```

### 4. Khởi động thủ công

```bash
# Terminal 1: API Gateway
cd api-gateway
npm run dev

# Terminal 2: Passenger Service
cd passenger-service
npm run dev
```

## 🧪 Chạy tests

```bash
# Chạy tất cả tests
npm test

# Chạy test riêng từng service
npm run test:api-gateway
npm run test:passenger-service
```

## 📚 API Endpoints

### Authentication (API Gateway)

#### Đăng ký user
```bash
POST http://localhost:3000/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

#### Đăng nhập
```bash
POST http://localhost:3000/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "username": "johndoe",
      "roles": ["user"]
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": "1h"
    }
  }
}
```

### Passenger Management (thông qua API Gateway)

#### Tạo passenger profile
```bash
POST http://localhost:3000/api/v1/passengers
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "1234567890",
  "dateOfBirth": "1990-01-01",
  "gender": "male",
  "address": "123 Test Street",
  "emergencyContact": "0987654321"
}
```

#### Lấy thông tin passenger
```bash
GET http://localhost:3000/api/v1/passengers/me
Authorization: Bearer <access-token>
```

#### Cập nhật thông tin passenger
```bash
PUT http://localhost:3000/api/v1/passengers/me
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "phoneNumber": "1234567891"
}
```

#### Xóa passenger profile
```bash
DELETE http://localhost:3000/api/v1/passengers/me
Authorization: Bearer <access-token>
```

## 🔧 Cách thức hoạt động

### Authentication Flow

1. **User Registration/Login**: Được xử lý tại API Gateway
2. **JWT Token**: Được tạo và verify tại API Gateway
3. **User Context**: API Gateway thêm user information vào headers khi proxy requests:
   - `x-user-id`: User ID
   - `x-user-email`: User email
   - `x-user-roles`: User roles (JSON array)

### Service Communication

```
Client Request
      ↓
API Gateway (JWT Authentication)
      ↓
Add User Headers
      ↓
Proxy to Passenger Service
      ↓
Passenger Service (Extract User from Headers)
      ↓
Response
```

### Database Models

#### User (API Gateway)
```javascript
{
  id: UUID (Primary Key),
  email: String (Unique),
  username: String (Unique),
  password: String (Hashed),
  firstName: String,
  lastName: String,
  roles: Array<String>,
  isVerified: Boolean,
  lastLoginAt: Date
}
```

#### Passenger (Passenger Service)
```javascript
{
  passengerId: UUID (Primary Key),
  userId: UUID (Foreign Key to User),
  firstName: String,
  lastName: String,
  phoneNumber: String,
  dateOfBirth: Date,
  gender: Enum ['male', 'female', 'other'],
  address: Text,
  emergencyContact: String,
  isActive: Boolean
}
```

## 🛠️ Development

### Thêm service mới

1. Tạo folder service mới
2. Thêm cấu hình vào `api-gateway/src/config.json`
3. Cập nhật `start-services.js`

### Environment Variables

- API Gateway xử lý JWT authentication
- Passenger Service nhận user context qua headers
- Cả hai services kết nối cùng database PostgreSQL

## 📊 Monitoring

- Health check endpoints: `/health`
- API Documentation: `http://localhost:3000/api-docs`
- Redis Commander: `http://localhost:8081`
- pgAdmin: `http://localhost:5050`

## 🚨 Troubleshooting

### Database connection issues
```bash
# Kiểm tra PostgreSQL
docker-compose logs postgres

# Restart database
npm run docker:down
npm run docker:up
```

### JWT token issues
- Kiểm tra JWT_ACCESS_SECRET trong .env
- Đảm bảo token được gửi trong Authorization header
- Format: `Bearer <token>`

### Service communication issues
- Kiểm tra service đang chạy trên đúng port
- Xem logs của API Gateway để debug proxy requests
- Đảm bảo passenger service nhận được user headers từ API Gateway

## 📝 Testing

### Unit Tests
```bash
# API Gateway
cd api-gateway && npm test

# Passenger Service  
cd passenger-service && npm test
```

### Integration Tests
```bash
# Chạy tất cả services và test integration
npm start
```

### Manual Testing với curl

```bash
# 1. Register
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","username":"testuser","password":"password123"}'

# 2. Login
TOKEN=$(curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.tokens.accessToken')

# 3. Create passenger
curl -X POST http://localhost:3000/api/v1/passengers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Passenger","phoneNumber":"1234567890"}'

# 4. Get passenger profile
curl -X GET http://localhost:3000/api/v1/passengers/me \
  -H "Authorization: Bearer $TOKEN"
``` 