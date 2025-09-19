# 🧪 Testing Distributed Tracing Implementation

## ✅ What We've Implemented

### 🚀 Complete Tracing Infrastructure:
- **Jaeger**: Distributed tracing backend with UI at http://localhost:16686
- **OpenTelemetry**: Instrumentation for all Node.js and Python services
- **Enhanced Logging**: Trace-aware logging with correlation IDs
- **Service Integration**: Auto-instrumentation for HTTP, DB, Redis, Kafka

### 📊 Services with Tracing:
1. **API Gateway**: Request routing with complete trace context
2. **User Service**: Passenger operations with database and cache tracing
3. **Ticket Service**: Ticket creation, retrieval with payment integration
4. **All Services**: Entry point tracing initialization

### 🔧 Enhanced Components:
- **Loggers**: Trace ID correlation in all log entries
- **Controllers**: Rich span attributes and error handling
- **Database Calls**: Automatic PostgreSQL query tracing
- **Cache Operations**: Redis operation tracing
- **External APIs**: HTTP client tracing

## 🏃‍♂️ Running the System with Tracing

### 1. Start the Infrastructure
```bash
# Start all services including Jaeger
docker-compose up -d

# Check Jaeger is running
docker-compose ps jaeger

# Verify Jaeger UI is accessible
curl http://localhost:16686
```

### 2. Install Dependencies (if not done)
```bash
# For each Node.js service, run:
cd api-gateway && npm install
cd ../auth-service && npm install
cd ../user-service && npm install
cd ../ticket-service && npm install
cd ../payment-service && npm install
cd ../notification-service && npm install
cd ../transport-service && npm install
cd ../public-service && npm install
cd ../scheduler-service && npm install
cd ../webhook && npm install

# For Python services, run:
cd ../report-service && pip install -r requirements.txt
cd ../control-service && pip install -r requirements.txt
cd ../management-service && pip install -r requirements.txt
```

### 3. Set Environment Variables
Copy the tracing environment variables to your `.env` files from the `env.example` files:
```bash
# For Node.js services
cp api-gateway/env.example api-gateway/.env
cp auth-service/env.example auth-service/.env
cp user-service/env.example user-service/.env
cp ticket-service/env.example ticket-service/.env
# ... for all services

# Edit each .env file and ensure tracing variables are set:
SERVICE_NAME=service-name
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

### 4. Restart Services to Pick Up Tracing
```bash
# Restart all services to initialize tracing
docker-compose restart api-gateway auth-service user-service ticket-service transport-service payment-service notification-service public-service scheduler-service webhook

# For Python services
docker-compose restart report-service control-service management-service
```

## 🧪 Testing Tracing

### 1. Access Jaeger UI
1. Open browser to: http://localhost:16686
2. You should see the Jaeger UI
3. Services should appear in the dropdown after generating traces

### 2. Generate Test Traces

#### Test 1: Simple API Call
```bash
# Test API Gateway routing
curl -X GET "http://localhost:3000/api/v1/auth/health" \
  -H "Content-Type: application/json"

# Check Jaeger UI - you should see:
# - api-gateway.route-request span
# - api-gateway.proxy-to-service span
# - Trace linking API Gateway → Auth Service
```

#### Test 2: User Operations
```bash
# Login to get token (replace with actual user)
curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password", "userType": "passenger"}'

# Use the JWT token from response
TOKEN="your-jwt-token-here"

# Get user profile (will trigger passenger controller)
curl -X GET "http://localhost:3000/api/v1/passengers/me" \
  -H "Authorization: Bearer $TOKEN"

# Check Jaeger UI for:
# - passenger.get-me span
# - passenger.db.find-by-user-id span
# - Redis cache operations
```

#### Test 3: Ticket Creation (Full E2E Trace)
```bash
# Create a ticket (will trace through multiple services)
curl -X POST "http://localhost:3000/api/v1/tickets/create-short-term" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startStationId": "1",
    "endStationId": "5",
    "quantity": 1,
    "paymentMethod": "paypal"
  }'

# This should create a comprehensive trace showing:
# - API Gateway routing
# - Ticket Service operations
# - Passenger cache lookup
# - Database operations
# - Payment service integration
# - Kafka message publishing
```

#### Test 4: Error Traces
```bash
# Test error handling with invalid request
curl -X GET "http://localhost:3000/api/v1/tickets/invalid-endpoint" \
  -H "Authorization: Bearer $TOKEN"

# Check Jaeger for error spans with:
# - Exception details
# - Error attributes
# - Stack trace information
```

### 3. Analyzing Traces in Jaeger

#### What to Look For:
1. **Service Map**: Click "System Architecture" to see service dependencies
2. **Trace Timeline**: Individual requests showing:
   - Total request duration
   - Service-to-service calls
   - Database query times
   - Cache hit/miss patterns
   - Error locations

3. **Span Details**: Click on individual spans to see:
   - Operation names (e.g., `passenger.get-all`, `fare.create`)
   - Span attributes (user ID, entity IDs, operation types)
   - Logs and exception details
   - Process information

4. **Search Capabilities**:
   - Filter by service name
   - Filter by operation name
   - Filter by duration
   - Filter by tags (e.g., `user.id=123`)

## 📊 Expected Trace Patterns

### Successful User Ticket Purchase:
```
api-gateway.route-request (200ms)
  ├── api-gateway.proxy-to-service (180ms)
      └── ticket.create-short-term (170ms)
          ├── ticket.get-passenger-cache (10ms)
          │   └── cache.get (5ms)
          ├── ticket.service.create-short-term (120ms)
          │   ├── db.insert (30ms)
          │   ├── fare.calculate (20ms)
          │   └── payment.create (60ms)
          │       └── external.payment-gateway (50ms)
          └── kafka.publish (10ms)
```

### User Profile Lookup:
```
api-gateway.route-request (50ms)
  ├── api-gateway.proxy-to-service (45ms)
      └── passenger.get-me (40ms)
          └── passenger.db.find-by-user-id (35ms)
              └── db.select (30ms)
```

## 🐛 Troubleshooting

### Tracing Not Working:
1. **Check Service Startup Logs**:
   ```bash
   docker-compose logs api-gateway | grep -i "tracing\|opentelemetry\|jaeger"
   ```

2. **Verify Environment Variables**:
   ```bash
   docker-compose exec api-gateway env | grep -E "(JAEGER|OTEL|SERVICE_)"
   ```

3. **Check Jaeger Connection**:
   ```bash
   # Test if services can reach Jaeger
   docker-compose exec api-gateway curl http://jaeger:14268/api/traces
   ```

### No Traces Appearing:
1. **Sampling Rate**: Ensure `OTEL_TRACES_SAMPLER_ARG=1.0` (100% sampling)
2. **Service Restart**: Restart services after env changes
3. **Jaeger Health**: Check Jaeger container logs

### Missing Spans:
1. **Manual Instrumentation**: Ensure controllers have `addCustomSpan` wrappers
2. **Auto-instrumentation**: Check if libraries are auto-instrumented
3. **Async Operations**: Ensure trace context is properly propagated

## 📈 Performance Impact

### Expected Overhead:
- **Memory**: ~10-50MB per service
- **CPU**: ~2-5% additional usage
- **Latency**: ~1-5ms per request
- **Network**: Minimal (batched exports)

### Production Recommendations:
- Set sampling rate to 0.1 (10%) for high-traffic systems
- Use probabilistic sampling
- Monitor Jaeger storage requirements
- Set up Jaeger production deployment

## 🎯 Next Steps

1. **Expand Coverage**: Apply tracing template to remaining controllers
2. **Custom Metrics**: Add business-specific metrics
3. **Alerting**: Set up trace-based alerts for errors/latency
4. **Documentation**: Create runbooks for trace analysis
5. **Performance**: Optimize high-frequency spans

Your distributed tracing setup is now ready for comprehensive observability! 🎉

