# Public Service

A microservice that aggregates and caches data from transport and ticket services for public consumption. This service fetches data every 24 hours and stores it in Redis cache for fast access.

## Overview

The Public Service acts as a data aggregation and caching layer that:
- **Fetches Transport Data**: Routes, stations, route-station relationships from transport service
- **Fetches Ticket Data**: Fares and transit passes from ticket service  
- **Scheduled Caching**: Automatically updates cache every 24 hours
- **Redis Storage**: Stores all data in Redis for fast retrieval
- **Public API**: Provides REST endpoints for accessing cached data

### Key Features:
- ✅ **Automated Data Fetching**: Scheduled data synchronization every 24 hours
- ✅ **Redis Caching**: High-performance data storage and retrieval
- ✅ **RESTful API**: Clean endpoints for accessing cached data
- ✅ **Health Monitoring**: Built-in health checks and monitoring
- ✅ **Error Handling**: Robust error handling and retry mechanisms
- ✅ **Scalable Architecture**: Microservice design for easy scaling

## Architecture

```
public-service/
├── src/
│   ├── config/          # Configuration files (Redis, logger)
│   ├── services/        # Business logic services
│   │   ├── cache.service.js      # Redis cache operations
│   │   ├── transport.service.js  # Transport data fetching
│   │   ├── ticket.service.js     # Ticket data fetching
│   │   └── scheduler.service.js  # Scheduled data updates
│   ├── controllers/     # HTTP request handlers
│   ├── routes/          # Express routes
│   ├── middlewares/     # Express middlewares
│   ├── utils/           # Utility functions
│   ├── app.js          # Express application
│   └── index.js        # Entry point
├── package.json
├── Dockerfile
└── README.md
```

## Data Sources

### Transport Service Data
- **Routes**: Metro lines and route information
- **Stations**: Station details, locations, and facilities  
- **Route-Stations**: Station sequences for each route

### Ticket Service Data
- **Fares**: Pricing information for different routes and passenger types
- **Transit Passes**: Day, weekly, monthly, yearly, and lifetime passes

## API Endpoints

### Health & Status
- `GET /health` - Service health check
- `GET /v1/cache/status` - Cache status and statistics

### Transport Data
- `GET /v1/routes` - Get all cached routes
- `GET /v1/routes/:id` - Get specific route details
- `GET /v1/stations` - Get all cached stations
- `GET /v1/stations/:id` - Get specific station details
- `GET /v1/routes/:routeId/stations` - Get stations for a route

### Ticket Data  
- `GET /v1/fares` - Get all cached fares
- `GET /v1/fares/route/:routeId` - Get fares for specific route
- `GET /v1/transit-passes` - Get all cached transit passes
- `GET /v1/transit-passes/:type` - Get specific pass type

### Cache Management (Internal)
- `POST /v1/cache/refresh` - Manually trigger cache refresh
- `GET /v1/cache/stats` - Get cache statistics

## Environment Variables

Create a `.env` file in the public-service directory:

```env
# Application Configuration
NODE_ENV=production
PORT=3004
SERVICE_NAME=public-service

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redispass123
REDIS_KEY_PREFIX=public_service_

# Cache Configuration
CACHE_TTL_HOURS=24
FETCH_INTERVAL_HOURS=24

# Transport Service Configuration
TRANSPORT_SERVICE_URL=http://transport-service:3005
TRANSPORT_SERVICE_TIMEOUT=30000

# Ticket Service Configuration
TICKET_SERVICE_URL=http://ticket-service:3003
TICKET_SERVICE_TIMEOUT=30000

# Logging Configuration
LOG_LEVEL=info

# Scheduler Configuration
SCHEDULER_ENABLED=true
INITIAL_FETCH_DELAY=30000
```

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Start development server
npm run dev
```

### Docker
```bash
# Build Docker image
docker build -t public-service .

# Run container
docker run -p 3004:3004 --env-file .env public-service
```

### Docker Compose
```yaml
public-service:
  build: ./public-service
  container_name: public-service
  ports:
    - "3004:3004"
  environment:
    - NODE_ENV=production
    - REDIS_HOST=redis
    - TRANSPORT_SERVICE_URL=http://transport-service:3005
    - TICKET_SERVICE_URL=http://ticket-service:3003
  depends_on:
    - redis
    - transport-service
    - ticket-service
  networks:
    - backend-network
```

## Cache Strategy

### Data Refresh Schedule
- **Frequency**: Every 24 hours
- **Initial Load**: 30 seconds after service startup
- **Manual Refresh**: Available via API endpoint

### Cache Keys Structure
```
public_service:routes:all
public_service:routes:{routeId}
public_service:stations:all  
public_service:stations:{stationId}
public_service:route_stations:{routeId}
public_service:fares:all
public_service:fares:route:{routeId}
public_service:transit_passes:all
public_service:transit_passes:{type}
public_service:cache:metadata
```

### Cache TTL
- **Data TTL**: 24 hours (configurable)
- **Metadata TTL**: 1 hour
- **Health Check TTL**: 5 minutes

## Monitoring & Health Checks

### Health Endpoints
- **Application Health**: `GET /health`
- **Redis Health**: Included in main health check
- **Service Dependencies**: Transport and ticket service connectivity

### Metrics
- Cache hit/miss ratios
- Data freshness timestamps
- Service response times
- Error rates and counts

### Logging
- Structured logging with Winston
- Daily log rotation
- Configurable log levels
- Request/response logging

## Error Handling

### Retry Strategy
- **Network Errors**: Exponential backoff retry
- **Service Unavailable**: Circuit breaker pattern
- **Cache Errors**: Fallback to direct service calls

### Graceful Degradation
- Serve stale cache data if services are down
- Partial data updates if some services fail
- Health status reflects data freshness

## Performance Optimization

### Caching Strategy
- **Full Dataset Caching**: Complete snapshots for fast retrieval
- **Incremental Updates**: Smart diff-based updates when possible
- **Compression**: Data compression for large datasets

### Memory Management
- **Redis Memory Optimization**: Efficient data structures
- **Garbage Collection**: Optimized Node.js memory usage
- **Connection Pooling**: Efficient Redis connection management

## Security

### Data Protection
- **No Sensitive Data**: Only public transportation data cached
- **Access Control**: Internal endpoints protected
- **Rate Limiting**: Prevent abuse of public endpoints

### Network Security
- **Service-to-Service**: Secure internal communication
- **CORS Configuration**: Proper cross-origin settings
- **Input Validation**: All API inputs validated

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Follow semantic versioning

## License

This project is part of the Metro System backend infrastructure. 