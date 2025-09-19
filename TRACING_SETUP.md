# 🔍 Metro Distributed Tracing Setup Guide

## Overview

This guide covers the setup and usage of **Jaeger distributed tracing** for the Metro backend system. Distributed tracing helps you:

- Track requests across multiple microservices
- Identify performance bottlenecks
- Debug complex distributed systems
- Monitor service dependencies
- Correlate logs and traces

## 🚀 Quick Start

### 1. Services Running

Verify that all monitoring services are running:

```bash
docker-compose ps | grep -E "jaeger|grafana|prometheus|loki"
```

### 2. Access Points

- **Jaeger UI**: http://localhost:16686 - Direct Jaeger interface
- **Grafana Tracing Dashboard**: http://localhost:3001 - Integrated observability
- **Service Dependencies**: View in Jaeger UI or Grafana node graph

## 📊 Dashboards Available

| Dashboard | Purpose | URL |
|-----------|---------|-----|
| **Service Health** | Overall service monitoring | Grafana → Metro Services Health Dashboard |
| **Infrastructure** | Kafka, Redis, Postgres monitoring | Grafana → Metro Infrastructure Dashboard |
| **Logs Dashboard** | Centralized log analysis | Grafana → Metro Logs Dashboard |
| **API Gateway** | Gateway-specific metrics | Grafana → Metro API Gateway Dashboard |
| **Tracing Dashboard** | Distributed tracing analysis | Grafana → Metro Distributed Tracing Dashboard |
| **Performance & SLA** | SLA monitoring and alerting | Grafana → Metro Performance & SLA Dashboard |

## 🛠 Implementing Tracing in Your Services

### For Node.js Services

1. **Install Dependencies**:
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-jaeger @opentelemetry/api
```

2. **Add to your main file** (e.g., `app.js`, `index.js`):
```javascript
// MUST be the very first import
require('./path/to/tracing-config');

// Rest of your application code
const express = require('express');
// ...
```

3. **Use the provided configuration**:
   - Copy `management-service/monitoring/tracing/nodejs-tracing-config.js` to your service
   - Update your `.env` file with tracing variables

### For Python Services

1. **Install Dependencies**:
```bash
pip install -r requirements-tracing.txt
```

2. **Add to your main file**:
```python
# MUST be imported first
from tracing_config import setup_tracing, instrument_flask_app
# or instrument_fastapi_app for FastAPI

# Initialize tracing
setup_tracing()

# For Flask
app = Flask(__name__)
app = instrument_flask_app(app)

# For FastAPI  
app = FastAPI()
app = instrument_fastapi_app(app)
```

3. **Use the provided configuration**:
   - Copy `management-service/monitoring/tracing/python-tracing-config.py` to your service
   - Update your `.env` file with tracing variables

## 🔧 Environment Configuration

### Required Environment Variables

Add these to each service's `.env` file:

```bash
# Service identification (CHANGE FOR EACH SERVICE)
SERVICE_NAME=api-gateway  # auth-service, user-service, etc.
SERVICE_VERSION=1.0.0
ENVIRONMENT=development

# Jaeger endpoints
JAEGER_ENDPOINT=http://jaeger:14268/api/traces  # Node.js
JAEGER_AGENT_HOST=jaeger                        # Python
JAEGER_AGENT_PORT=6831                          # Python

# OpenTelemetry settings (optional)
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0  # 100% sampling (reduce for production)
```

### Service Names by Microservice

| Service | SERVICE_NAME |
|---------|--------------|
| API Gateway | `api-gateway` |
| Authentication | `auth-service` |
| User Management | `user-service` |
| Transport | `transport-service` |
| Ticketing | `ticket-service` |
| Public API | `public-service` |
| Payment | `payment-service` |
| Reporting | `report-service` |
| Control System | `control-service` |
| Notifications | `notification-service` |
| Scheduler | `scheduler-service` |
| Management | `management-service` |
| Webhooks | `webhook` |

## 📈 Using Tracing Data

### 1. Finding Slow Requests

**In Jaeger UI:**
- Go to http://localhost:16686
- Select service from dropdown
- Click "Find Traces"
- Sort by duration to find slowest requests

**In Grafana:**
- Go to Tracing Dashboard
- Check "Response Time Percentiles" panel
- Look for P95/P99 spikes

### 2. Debugging Errors

**Jaeger Search:**
```
Tags: error=true
Operation: any
Service: your-service-name
```

**Grafana Logs Correlation:**
- In Tracing Dashboard, click on a trace
- Use "Logs for this trace" link to see related logs

### 3. Analyzing Dependencies

- **Service Map**: Jaeger UI → Dependencies tab
- **Node Graph**: Grafana Tracing Dashboard → Service Dependency Graph panel

## 🔍 Advanced Usage

### Custom Spans in Code

**Node.js:**
```javascript
const { addCustomSpan } = require('./tracing-config');

app.post('/api/process', async (req, res) => {
  await addCustomSpan('process-business-logic', async (span) => {
    span.setAttributes({
      'user.id': req.user.id,
      'operation.type': 'create',
    });
    
    const result = await businessLogic();
    span.setAttribute('result.status', result.status);
    
    res.json(result);
  });
});
```

**Python:**
```python
from tracing_config import custom_span, trace_function

@trace_function("database-operation")
def get_user_data(user_id):
    return db.query(User).filter(User.id == user_id).first()

def process_payment():
    with custom_span("payment-processing", 
                     user_id="123", 
                     amount=100.50) as span:
        result = charge_payment()
        span.set_attribute("payment.status", result.status)
        return result
```

### Connecting Traces to Logs

Your logs should include trace information:

**Node.js (Winston):**
```javascript
const winston = require('winston');
const { trace } = require('@opentelemetry/api');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.json(),
    winston.format.printf(info => {
      const span = trace.getActiveSpan();
      if (span) {
        const traceId = span.spanContext().traceId;
        info.traceId = traceId;
      }
      return JSON.stringify(info);
    })
  )
});
```

**Python:**
```python
import logging
from opentelemetry import trace

# Configure logging to include trace information
logging.basicConfig(
    format='%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(trace_id)s span_id=%(span_id)s] - %(message)s',
    level=logging.INFO
)

class TracingFormatter(logging.Formatter):
    def format(self, record):
        span = trace.get_current_span()
        record.trace_id = span.get_span_context().trace_id
        record.span_id = span.get_span_context().span_id  
        return super().format(record)
```

## 🎯 Best Practices

### 1. Sampling Strategy

- **Development**: 100% sampling (`OTEL_TRACES_SAMPLER_ARG=1.0`)
- **Production**: 1-10% sampling (`OTEL_TRACES_SAMPLER_ARG=0.1`)

### 2. Span Naming

- Use consistent naming patterns: `service.operation`
- Examples: `api-gateway.authenticate`, `user-service.create-user`

### 3. Span Attributes

Add meaningful attributes:
```javascript
span.setAttributes({
  'user.id': userId,
  'user.type': userType,
  'operation.result': 'success',
  'cache.hit': true,
  'db.rows.affected': 1
});
```

### 4. Error Handling

Always record exceptions:
```javascript
try {
  // operation
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message });
  throw error;
}
```

## 🚨 Troubleshooting

### Common Issues

**1. No traces appearing:**
- Check service environment variables
- Verify Jaeger is running: `docker-compose ps jaeger`
- Check service logs for OpenTelemetry errors

**2. Incomplete traces:**
- Ensure all services have tracing configured
- Check network connectivity between services and Jaeger

**3. Performance impact:**
- Reduce sampling rate in production
- Use asynchronous exporters

**4. Missing service dependencies:**
- Verify inter-service calls are instrumented
- Check HTTP/gRPC instrumentation is enabled

### Debug Commands

```bash
# Check Jaeger health
curl http://localhost:16686/api/services

# View Jaeger configuration
docker-compose exec jaeger /go/bin/all-in-one-linux --help

# Check service connectivity to Jaeger
docker-compose exec api-gateway curl jaeger:14268/api/traces
```

## 🔗 Integration with Existing Monitoring

The tracing system integrates seamlessly with:

- **Prometheus**: Metrics correlation through trace exemplars
- **Loki**: Log correlation through trace IDs
- **Grafana**: Unified observability interface
- **Alerting**: Trace-based alerts in Grafana

This creates a complete observability stack: **Metrics + Logs + Traces = Full Visibility**! 🎯
