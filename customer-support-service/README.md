# Customer Support Service

A Go-based microservice for customer support functionality with Redis caching capabilities.

## Features

- Redis connection management with automatic reconnection
- Structured logging with Zap
- Graceful shutdown handling
- Environment-based configuration

## Configuration

The service uses environment variables for configuration:

### Redis Configuration
- `REDIS_HOST` - Redis host (default: 127.0.0.1)
- `REDIS_PORT` - Redis port (default: 6379)
- `REDIS_USER` - Redis username (optional)
- `REDIS_PASSWORD` - Redis password (optional)
- `REDIS_DB` - Redis database number (default: 0)

### Logging Configuration
- `LOG_LEVEL` - Log level (debug/info, default: info)

## Setup

### Local Development

1. Install dependencies:
```bash
go mod tidy
```

2. Create `.env` file from example:
```bash
cp env.example .env
```

3. Set environment variables in `.env`:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
LOG_LEVEL=debug
SERVICE_PORT=3004
```

4. Run the service:
```bash
go run cmd/main.go
```

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up customer-support-service
```

2. Or build the image separately:
```bash
docker build -t customer-support-service .
docker run -p 3004:3004 customer-support-service
```

## Redis Usage Examples

### Basic Operations

```go
import "customer-support-service/config"

// Initialize Redis
err := config.InitRedis()
if err != nil {
    log.Fatal(err)
}

// Set a key with expiry (3600 seconds)
err = config.SetWithExpiry("user:123", "user_data", 3600)

// Get a value
value, err := config.Get("user:123")

// Check if key exists
exists, err := config.Exists("user:123")

// Delete a key
err = config.Delete("user:123")
```

### Advanced Operations

```go
// Get Redis client for advanced operations
client := config.GetRedisClient()
if client != nil {
    // Use client directly for complex operations
    result := client.HGetAll(ctx, "hash_key")
}

// Check Redis availability
if config.IsRedisAvailable() {
    // Redis is available
}
```

## Error Handling

The Redis configuration includes comprehensive error handling:

- Automatic reconnection on connection loss
- Timeout handling for operations
- Graceful degradation when Redis is unavailable
- Detailed logging for debugging

## Graceful Shutdown

The service handles graceful shutdown by:

- Closing Redis connections properly
- Logging shutdown events
- Responding to SIGINT and SIGTERM signals

## Project Structure

```
customer-support-service/
├── cmd/
│   └── main.go              # Application entry point
├── config/
│   ├── config.go            # Main configuration
│   ├── logger.go            # Logging configuration
│   └── redis.go             # Redis configuration
├── internal/                # Internal application logic
├── router/                  # HTTP routing
├── go.mod                   # Go module dependencies
└── README.md               # This file
```

## Dependencies

- `github.com/go-redis/redis/v8` - Redis client
- `go.uber.org/zap` - Structured logging
- `gopkg.in/natefinch/lumberjack.v2` - Log rotation
