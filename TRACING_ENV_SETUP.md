# 🔧 Tracing Environment Variables Setup

## Add to Each Service's .env File

### Node.js Services

Copy the appropriate section below to your service's `.env` file:

#### API Gateway (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=api-gateway
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Auth Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=auth-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### User Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=user-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Transport Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=transport-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Ticket Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=ticket-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Public Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=public-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Payment Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=payment-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Notification Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=notification-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Scheduler Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=scheduler-service
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Webhook Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=webhook
SERVICE_VERSION=1.0.0
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

### Python Services

#### Report Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=report-service
SERVICE_VERSION=1.0.0
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
ENVIRONMENT=development
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Control Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=control-service
SERVICE_VERSION=1.0.0
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
ENVIRONMENT=development
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

#### Management Service (.env)
```bash
# OpenTelemetry Tracing Configuration
SERVICE_NAME=management-service
SERVICE_VERSION=1.0.0
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
ENVIRONMENT=development
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=1.0
```

## Next Steps

1. **Copy the appropriate configuration** to each service's `.env` file
2. **Install dependencies** by running `npm install` (Node.js) or `pip install -r requirements.txt` (Python) in each service
3. **Restart services** to apply the changes: `docker-compose restart [service-name]`
4. **Verify tracing** by checking:
   - Service logs for "✅ OpenTelemetry tracing initialized" message
   - Jaeger UI at http://localhost:16686
   - Grafana tracing dashboard at http://localhost:3001

## Production Configuration

For production, consider reducing sampling rate:
```bash
OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling instead of 100%
```

This reduces performance overhead while still collecting sufficient traces for monitoring.

