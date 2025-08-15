# Session Management System

## Overview

Hệ thống Metro đã được tích hợp session management hoàn chỉnh với Redis store để quản lý user sessions một cách an toàn và hiệu quả.

## Architecture

### Components

1. **API Gateway Session Management**
   - Session validation và forwarding
   - User context propagation to microservices
   - Session activity tracking

2. **Auth Service Session Management**
   - Session creation/destruction
   - User authentication integration
   - Session status monitoring

3. **Redis Session Store**
   - Distributed session storage
   - Automatic session expiry
   - High availability

## Configuration

### Environment Variables

```bash
# Session Management
SESSION_SECRET=CHANGE_ME_SESSION_SECRET
SESSION_NAME=metro_session
SESSION_MAX_AGE=86400000
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=strict
```

### Session Configuration

- **Session Secret**: Bí mật để mã hóa session data
- **Session Name**: Tên cookie session (default: `metro_session`)
- **Max Age**: Thời gian sống của session (24 hours)
- **Cookie Security**: 
  - `secure`: Chỉ gửi qua HTTPS
  - `httpOnly`: Không cho phép JavaScript access
  - `sameSite`: Bảo vệ chống CSRF

## API Endpoints

### Auth Service Session Routes

#### POST `/v1/session/login`
Tạo session cho user sau khi authenticate thành công.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "user",
    "name": "Test User"
  }
}
```

#### POST `/v1/session/logout`
Hủy session hiện tại.

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET `/v1/session/status`
Kiểm tra trạng thái session hiện tại.

**Response:**
```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": "user-123",
    "email": "user@example.com",
    "role": "user"
  },
  "session": {
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastActivity": "2024-01-01T12:00:00.000Z"
  }
}
```

#### POST `/v1/session/refresh`
Refresh session để extend thời gian sống.

**Response:**
```json
{
  "success": true,
  "message": "Session refreshed successfully"
}
```

## Session Data Structure

### Session Object
```javascript
{
  userId: "user-123",
  userRole: "user",
  userEmail: "user@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
  lastActivity: "2024-01-01T12:00:00.000Z"
}
```

### Redis Storage
- **Key Pattern**: `{service-prefix}session:{sessionId}`
- **TTL**: 24 hours (configurable)
- **Data**: JSON serialized session object

## Security Features

### 1. Session Security
- **HttpOnly Cookies**: Ngăn XSS attacks
- **Secure Cookies**: Chỉ HTTPS
- **SameSite**: Chống CSRF
- **Session Secret**: Mã hóa session data

### 2. Session Validation
- **Automatic Expiry**: Session tự động expire
- **Activity Tracking**: Log user activity
- **Rolling Sessions**: Extend session on activity

### 3. User Context Propagation
API Gateway tự động forward user context đến microservices:

```javascript
// Headers added to requests
req.headers['x-user-id'] = req.session.userId;
req.headers['x-user-role'] = req.session.userRole;
req.headers['x-user-email'] = req.session.userEmail;
req.headers['x-session-id'] = req.sessionID;
```

## Middleware Usage

### API Gateway Middleware

```javascript
const { validateAndForwardSession, requireValidSession } = require('./middlewares/session.middleware');

// Validate and forward session data
router.use('/v1/protected', validateAndForwardSession, requireValidSession);

// Optional session (public routes)
router.use('/v1/public', validateAndForwardSession);
```

### Auth Service Middleware

```javascript
const { requireSession, createUserSession, destroyUserSession } = require('./config/session');

// Require session for protected routes
router.post('/logout', requireSession, (req, res) => {
  destroyUserSession(req);
  res.json({ success: true });
});

// Create session on login
router.post('/login', (req, res) => {
  createUserSession(req, user);
  res.json({ success: true });
});
```

## Monitoring & Logging

### Session Activity Logs
```javascript
logger.info('User session created', {
  userId: user.id,
  userRole: user.role,
  sessionId: req.sessionID
});
```

### Session Expiry Warnings
```javascript
logger.warn('Session approaching expiry', {
  userId: req.session.userId,
  sessionId: req.sessionID,
  remainingTime: maxAge - timeDiff
});
```

## Best Practices

### 1. Session Management
- Luôn validate session trước khi access protected resources
- Implement proper logout để destroy session
- Monitor session activity và expiry

### 2. Security
- Sử dụng strong session secrets
- Enable secure cookies trong production
- Implement session timeout
- Log suspicious session activity

### 3. Performance
- Redis session store cho distributed systems
- Session data tối thiểu để giảm memory usage
- Implement session cleanup

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check Redis connection
   - Verify cookie settings
   - Check CORS configuration

2. **Session Expiry Issues**
   - Verify SESSION_MAX_AGE setting
   - Check Redis TTL configuration
   - Monitor session activity logs

3. **CORS Issues**
   - Ensure credentials: true in CORS config
   - Check allowed origins
   - Verify cookie domain settings

### Debug Commands

```bash
# Check Redis session data
redis-cli keys "*session*"

# Monitor session creation
redis-cli monitor | grep session

# Check session expiry
redis-cli ttl "session:key"
```

## Integration with Frontend

### Login Flow
```javascript
// Frontend login request
const response = await fetch('/v1/session/login', {
  method: 'POST',
  credentials: 'include', // Important for cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
```

### Session Validation
```javascript
// Check session status
const status = await fetch('/v1/session/status', {
  credentials: 'include'
});

const { authenticated, user } = await status.json();
```

### Logout Flow
```javascript
// Logout request
await fetch('/v1/session/logout', {
  method: 'POST',
  credentials: 'include'
});
```

## Future Enhancements

1. **Session Analytics**
   - User activity tracking
   - Session duration analytics
   - Concurrent session limits

2. **Advanced Security**
   - Device fingerprinting
   - Geographic session validation
   - Anomaly detection

3. **Performance Optimization**
   - Session caching layers
   - Distributed session management
   - Session compression
