# Public Service

A high-performance caching service that periodically fetches data from both Transport Service and Ticket Service via gRPC and serves it through REST APIs.

## Overview

The Public Service acts as a data aggregation and caching layer that:

- **Fetches data hourly** from Transport Service and Ticket Service using gRPC
- **Caches data** in Redis for fast retrieval
- **Provides REST APIs** for public access to cached transport and ticket information
- **Monitors system health** and provides comprehensive health checks

## Key Features

### 🔄 Automated Data Synchronization
- **Hourly Updates**: Automatically fetches fresh data from backend services every hour
- **gRPC Communication**: Uses efficient gRPC protocol for inter-service communication
- **Fault Tolerance**: Implements retry mechanisms and graceful error handling
- **Parallel Processing**: Fetches data from multiple services simultaneously for efficiency

### 📊 Data Types Cached
- **Transport Data**: Routes, stations, route-station mappings, trips
- **Ticket Data**: Fares, transit passes, pricing information
- **Metadata**: Last update timestamps, data counts, health metrics

### 🚀 Performance Optimized
- **Redis Caching**: Sub-millisecond data retrieval
- **Configurable TTL**: 24-hour default cache expiration
- **Compression**: HTTP response compression enabled
- **Rate Limiting**: Built-in request rate limiting

## Architecture

```
┌─────────────────┐    gRPC     ┌──────────────────┐
│   Transport     │◄────────────┤   Public Service │
│   Service       │             │                  │
└─────────────────┘             │   ┌──────────┐   │
                                │   │  Redis   │   │
┌─────────────────┐    gRPC     │   │  Cache   │   │
│   Ticket        │◄────────────┤   └──────────┘   │
│   Service       │             │                  │
└─────────────────┘             │   ┌──────────┐   │
                                │   │   REST   │   │
┌─────────────────┐    HTTP     │   │   API    │   │
│   Public        │◄────────────┤   └──────────┘   │
│   Clients       │             └──────────────────┘
└─────────────────┘
```

## Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Set up environment**:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start the service**:
```bash
# Development
npm run dev

# Production
npm start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3007` | HTTP server port |
| `NODE_ENV` | `development` | Environment mode |
| `REDIS_HOST` | `redis` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `REDIS_PASSWORD` | - | Redis authentication password |
| `TRANSPORT_GRPC_HOST` | `transport-service` | Transport service gRPC host |
| `TRANSPORT_GRPC_PORT` | `50051` | Transport service gRPC port |
| `FARE_GRPC_HOST` | `ticket-service` | Ticket service gRPC host |
| `FARE_GRPC_PORT` | `50052` | Ticket service gRPC port |
| `SCHEDULER_ENABLED` | `true` | Enable/disable hourly data fetching |
| `SCHEDULER_CRON` | `"0 * * * *"` | Cron schedule (hourly by default) |
| `SCHEDULER_INITIAL_DELAY_MS` | `30000` | Initial delay before first fetch |

## API Endpoints

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Basic health check |
| `GET` | `/health/detailed` | Detailed health with dependencies |
| `GET` | `/health/ready` | Readiness probe |
| `GET` | `/health/live` | Liveness probe |

### Cache Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/cache/stats` | Cache statistics and metadata |
| `POST` | `/v1/cache/refresh` | Manually trigger data refresh |
| `DELETE` | `/v1/cache/clear` | Clear all cached data |
| `GET` | `/v1/cache/health` | Cache system health |

### Transport Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/transport/routes` | All routes |
| `GET` | `/v1/transport/routes/:id` | Specific route |
| `GET` | `/v1/transport/routes/:id/stations` | Stations for route |
| `GET` | `/v1/transport/stations` | All stations |

### Ticket Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/tickets/fares` | All fares |
| `GET` | `/v1/tickets/fares/route/:routeId` | Fares for route |
| `GET` | `/v1/tickets/transit-passes` | All transit passes |

## Data Fetching Process

### Hourly Schedule
The service runs on a **cron schedule `"0 * * * *"`** which triggers data fetching:
- **Every hour at minute 0** (e.g., 1:00, 2:00, 3:00, etc.)
- **Initial fetch** occurs 30 seconds after service startup
- **Parallel processing** of transport and ticket data

### gRPC Operations
The service performs these gRPC calls each hour:

#### Transport Service
- `ListRoutes()` - Fetch all active routes
- `GetRouteStations(routeId)` - Get stations for each route

#### Ticket Service  
- `ListFares()` - Fetch all fare information
- `ListTransitPasses()` - Fetch all transit pass types

### Error Handling
- **Retry Logic**: Up to 3 retries with exponential backoff
- **Partial Success**: Service continues if one source fails
- **Health Monitoring**: Failed fetches are logged and tracked
- **Circuit Breaker**: Automatic service degradation on repeated failures

## Manual Operations

### Trigger Immediate Refresh
```bash
curl -X POST http://localhost:3007/v1/cache/refresh
```

### Check Cache Statistics
```bash
curl http://localhost:3007/v1/cache/stats
```

### Monitor Health
```bash
curl http://localhost:3007/health/detailed
```

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # HTTP request handlers
├── routes/          # API route definitions
├── services/        # Business logic and gRPC clients
├── middlewares/     # Express middlewares
└── proto/           # gRPC protocol buffer definitions
```

### Adding New Data Sources

1. **Create gRPC client** in `src/services/`
2. **Add proto file** to `src/proto/`
3. **Update cache service** to include new data
4. **Add API endpoints** in controllers and routes

### Testing

```bash
# Run tests
npm test

# Check gRPC connectivity
curl http://localhost:3007/health/detailed

# Manual data refresh
curl -X POST http://localhost:3007/v1/cache/refresh
```

## Monitoring & Logging

- **Winston Logging**: Structured logs with different levels
- **Request Logging**: All HTTP requests logged with timing
- **gRPC Metrics**: Connection status and call latency
- **Cache Metrics**: Hit rates, TTL status, memory usage
- **Scheduler Metrics**: Success/failure rates, execution time

## Security

- **Helmet**: Security headers enabled
- **CORS**: Cross-origin resource sharing configured
- **Rate Limiting**: Per-IP request limits
- **Input Validation**: Request parameter validation
- **Environment Secrets**: Sensitive data in environment variables

## Performance

- **Redis Caching**: ~1ms response times for cached data
- **Compression**: Gzip compression for HTTP responses
- **Connection Pooling**: Efficient gRPC connection management
- **Parallel Processing**: Concurrent data fetching from multiple services

## Troubleshooting

### Common Issues

1. **gRPC Connection Failed**
   - Check service availability: `curl http://transport-service:3005/health`
   - Verify network connectivity and ports
   - Check environment variables for correct service URLs

2. **Redis Connection Failed**
   - Verify Redis is running: `redis-cli ping`
   - Check Redis configuration and credentials
   - Ensure network connectivity to Redis host

3. **Data Not Updating**
   - Check scheduler status: `curl http://localhost:3007/v1/cache/stats`
   - Verify cron schedule configuration
   - Check logs for error messages

4. **High Memory Usage**
   - Monitor cache size: `curl http://localhost:3007/v1/cache/stats`
   - Adjust TTL settings if needed
   - Consider Redis memory optimization

### Logs Analysis
```bash
# Check recent logs
docker logs public-service-container -f

# Filter gRPC errors
docker logs public-service-container 2>&1 | grep "gRPC"

# Monitor cache operations
docker logs public-service-container 2>&1 | grep "cache"
```

## License

This project is licensed under the MIT License. 