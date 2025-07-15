# Guest Routes Documentation

## Overview

The API Gateway now supports **Guest Routes** (`/v1/guest`) that allow unauthenticated access to specific public services. This feature enables users to access the public service without requiring authentication, while maintaining strict security controls.

## Features

- **No Authentication Required**: Access public services without login or API keys
- **Restricted Access**: Only allows access to the `public` service endpoint
- **Enhanced Security**: Multiple security layers including rate limiting and access validation
- **Comprehensive Logging**: All guest access attempts are logged for monitoring
- **Rate Limiting**: More restrictive rate limits compared to authenticated routes

## Usage

### Basic Access

```http
GET /v1/guest/public
```

### Access with Sub-paths

```http
GET /v1/guest/public/health
GET /v1/guest/public/cache/status
POST /v1/guest/public/cache/refresh
```

### Available Public Service Endpoints

The guest routes proxy to the public service (port 3007) which provides:

- `GET /health` - Health check
- `GET /health/detailed` - Detailed health information
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /cache/status` - Cache status
- `GET /cache/stats` - Cache statistics
- `POST /cache/refresh` - Manual cache refresh
- `DELETE /cache/clear` - Clear cache
- `GET /cache/health` - Cache health check

## Security Measures

### 1. Service Restriction
- **Only** allows access to the `public` service endpoint
- Any attempt to access other services (user, ticket, transport, etc.) returns `403 Forbidden`

### 2. Rate Limiting
- **Window**: 15 minutes
- **Max Requests**: 100 per IP address
- **Burst Protection**: Prevents rapid-fire requests
- **Headers**: Includes rate limit information in response headers

### 3. Access Logging
- All guest access attempts are logged with:
  - IP address
  - User agent
  - Endpoint accessed
  - Timestamp
  - Request method and path

### 4. Input Validation
- URL decoding and validation
- Path traversal protection
- Endpoint validation middleware

## Example Responses

### Successful Access
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "public-service",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Access Denied
```json
{
  "success": false,
  "message": "Access denied. Guest access is only available for public service endpoints.",
  "allowedEndpoints": ["public"]
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Service Discovery

The guest routes are included in the service discovery endpoint:

```http
GET /v1/discovery
```

Response includes:
```json
{
  "success": true,
  "data": {
    "guestServices": [
      {
        "name": "public-service",
        "endpoint": "/v1/guest/public",
        "description": "Public service accessible without authentication",
        "version": "1.0.0",
        "authentication": { "required": false },
        "access": "guest",
        "rateLimits": {
          "window": "15 minutes",
          "maxRequests": 100,
          "burstProtection": true
        }
      }
    ],
    "guestServicesCount": 1
  }
}
```

## Comparison with Authenticated Routes

| Feature | Authenticated Routes (`/v1/route`) | Guest Routes (`/v1/guest`) |
|---------|-----------------------------------|---------------------------|
| Authentication | Required (JWT token) | Not required |
| Service Access | All services | Public service only |
| Rate Limits | Standard limits | More restrictive |
| Logging | Standard logging | Enhanced logging |
| API Key | May be required | Not required |

## Monitoring and Security

### What to Monitor
- Guest access patterns and volumes
- Failed access attempts to restricted services
- Rate limit violations
- Unusual traffic patterns

### Security Considerations
- The public service should not expose sensitive operations
- Rate limits prevent abuse and DoS attacks
- Logging enables security monitoring and incident response
- Service restriction prevents unauthorized access to internal services

## Implementation Details

### Middleware Stack
1. **Guest Rate Limiter**: 100 requests per 15 minutes
2. **Burst Protection**: Prevents rapid-fire requests
3. **Access Logging**: Logs all access attempts
4. **Service Validation**: Ensures only public service access
5. **Routing Controller**: Proxies to the public service

### Configuration
The guest routes are automatically enabled and configured to work with the public service as defined in `config.json`:

```json
{
  "name": "public-service",
  "endPoint": "public",
  "instances": [
    {
      "host": "public-service",
      "port": 3007
    }
  ]
}
```

## Testing

Run the guest route tests:
```bash
npm test -- --testPathPattern="guest.route.test.js"
```

The test suite covers:
- Public service access
- Security restrictions
- Rate limiting
- Logging functionality 