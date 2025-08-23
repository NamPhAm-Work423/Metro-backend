# Webhook Service - Metro Backend

Microservice chuyên xử lý webhook events từ các payment providers với kiến trúc SOLID và modular design.

## 🏗️ Kiến trúc

### Clean Architecture + SOLID Principles

```
webhook/
├── src/
│   ├── app.js                   # Express configuration
│   ├── index.js                 # Entry point
│   │
│   ├── config/                  # Cấu hình hệ thống
│   │   ├── database.js          # MongoDB connection
│   │   ├── logger.js            # Winston logging
│   │   ├── redis.js             # Redis client
│   │   └── metrics.js           # Prometheus metrics
│   │
│   ├── models/                  # Database models
│   │   ├── index.model.js       # Generic webhook model
│   │   └── paypal.hook.model.js # PayPal specific model
│   │
│   ├── paypal/                  # PayPal provider module
│   │   ├── interfaces/
│   │   │   └── IPayPalWebhookHandler.js
│   │   ├── validators/
│   │   │   ├── paypalSignatureValidator.js
│   │   │   └── paypalEventValidator.js
│   │   └── services/
│   │       └── paypalWebhookService.js
│   │
│   ├── controllers/             # HTTP controllers
│   │   └── paypal.controller.js # PayPal endpoints
│   │
│   ├── routes/                  # Express routes
│   │   ├── index.js             # Main router
│   │   └── paypal.routes.js     # PayPal routes
│   │
│   ├── repositories/            # Data access layer
│   │   ├── interfaces/
│   │   │   └── IWebhookRepository.js
│   │   └── webhookLog.repository.js
│   │
│   ├── infrastructure/          # External services
│   │   ├── paypalClient.js      # PayPal SDK client
│   │   └── redisClient.js       # Redis idempotency manager
│   │
│   ├── kafka/                   # Kafka integration
│   │   ├── kafkaProducer.js     # Message publisher
│   │   └── kafkaConsumer.js     # Message consumer
│   │
│   ├── middlewares/             # Express middlewares
│   │   ├── rateLimiter.js       # Rate limiting
│   │   └── metrics.middleware.js
│   │
│   └── utils/                   # Utilities
│       └── errorHandler.js
│
├── Dockerfile
├── package.json
└── env.example
```

## 🚀 Features

### Core Capabilities
- ✅ **MongoDB Audit Logging** - Lưu raw webhook data cho audit và replay
- ✅ **Redis Idempotency** - Chống duplicate processing
- ✅ **Kafka Event Publishing** - Publish events tới các services khác
- ✅ **Signature Verification** - Verify PayPal webhook signatures
- ✅ **Rate Limiting** - Bảo vệ chống spam
- ✅ **Error Handling & Retry** - Robust error handling với retry logic

### PayPal Integration
- **Supported Events:**
  - `PAYMENT.CAPTURE.COMPLETED`
  - `PAYMENT.CAPTURE.DENIED`
  - `CHECKOUT.ORDER.APPROVED`
  - `PAYMENT.CAPTURE.PENDING`
  - `CHECKOUT.ORDER.COMPLETED`
  - `PAYMENT.CAPTURE.REFUNDED`

- **Target Services:**
  - `payment-service` - Payment state updates
  - `ticket-service` - Ticket activation/deactivation
  - `notification-service` - User notifications

## 🛠️ Setup & Configuration

### Environment Variables

```bash
# Server
PORT=3003
NODE_ENV=development

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id
PAYPAL_MODE=sandbox

# MongoDB
MONGODB_URI=mongodb://localhost:27017/metro_webhook
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DB_NAME=metro_webhook

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=webhook-service
KAFKA_GROUP_ID=webhook-service-group
```

### Installation

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Start production
npm start
```

## 📡 API Endpoints

### PayPal Webhooks

```bash
# Webhook endpoint (PayPal calls this)
POST /v1/paypal/webhooks

# Get statistics
GET /v1/paypal/statistics?startDate=2024-01-01&endDate=2024-01-31

# Retry failed webhooks
POST /v1/paypal/retry?limit=10

# Health check
GET /v1/paypal/health

# Test endpoint (dev only)
GET /v1/paypal/test
```

### General Endpoints

```bash
# Service health
GET /v1/health

# Combined statistics
GET /v1/statistics

# API documentation
GET /v1/docs
```

## 🎯 Event Flow

### PayPal Webhook Processing

1. **Receive Webhook** → PayPal gửi event đến `/v1/paypal/webhooks`
2. **Signature Verification** → Verify PayPal signature
3. **Idempotency Check** → Check Redis để tránh duplicate
4. **Save to MongoDB** → Lưu raw data cho audit
5. **Extract Business Data** → Parse PayPal data
6. **Publish to Kafka** → Send events đến target services
7. **Update Status** → Mark as processed

### Kafka Events Published

```javascript
// Payment completed
{
  topic: 'payment.completed',
  service: 'payment-service',
  eventData: {
    type: 'PAYMENT_COMPLETED',
    paymentId: 'capture_id',
    orderId: 'order_id',
    amount: { value: '100.00', currency: 'USD' },
    provider: 'paypal'
  }
}

// Ticket activation
{
  topic: 'ticket.payment.completed',
  service: 'ticket-service',
  eventData: {
    type: 'TICKET_PAYMENT_COMPLETED',
    paymentId: 'capture_id',
    orderId: 'order_id',
    customId: 'ticket_id'
  }
}
```

## 🔧 Extensibility

### Adding New Payment Providers

1. **Create Provider Module:**
   ```
   src/stripe/                  # New provider
   ├── interfaces/
   ├── validators/
   ├── services/
   └── models/
   ```

2. **Implement Interfaces:**
   - Extend `IWebhookRepository`
   - Create provider-specific models
   - Implement signature validation

3. **Add Routes:**
   - Create `stripe.routes.js`
   - Add to main router

4. **Update Models:**
   - Add provider to `WebhookLog` enum
   - Create specialized model như `StripeHook`

## 🔍 Monitoring & Debugging

### Logs
- **Winston logging** với structured format
- **Daily log rotation**
- **Different log levels** (error, warn, info, debug)

### Metrics
- **Prometheus metrics** available tại `/metrics`
- **Processing statistics** via API
- **Health checks** cho all components

### Database Queries
```javascript
// Find by PayPal order
const hooks = await PayPalHook.findByOrderId('order_id');

// Get statistics
const stats = await PayPalHook.getPayPalStatistics(startDate, endDate);

// Find failed webhooks
const failed = await PayPalHook.getFailedWebhooks(50);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Test webhook endpoint
curl -X POST http://localhost:3003/v1/paypal/test
```

## 🚀 Production Deployment

### Docker
```dockerfile
# Build
docker build -t metro/webhook-service .

# Run
docker run -p 3003:3003 metro/webhook-service
```

### Environment Checklist
- [ ] MongoDB connection string
- [ ] Redis connection
- [ ] Kafka brokers
- [ ] PayPal credentials
- [ ] Log level set to 'info' or 'warn'
- [ ] Rate limiting configured
- [ ] Health checks enabled

---

## 🎉 Summary

Webhook service đã được thiết kế với:

- **✅ Clean Architecture** - Tách biệt rõ ràng các layers
- **✅ SOLID Principles** - Dễ maintain và extend
- **✅ Modular Design** - PayPal tách biệt, dễ thêm providers mới
- **✅ Production Ready** - Error handling, logging, monitoring
- **✅ Scalable** - Redis, Kafka, MongoDB cho high performance

Ready để handle PayPal webhooks và có thể mở rộng cho Stripe, VNPay, MoMo, v.v. trong tương lai! 🚀
