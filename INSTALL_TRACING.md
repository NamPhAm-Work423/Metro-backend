# 🚀 Install Tracing Dependencies

## Quick Setup Script

Run these commands to install OpenTelemetry dependencies for all services:

### Node.js Services
```bash
# Install tracing dependencies for all Node.js services
cd api-gateway && npm install
cd ../auth-service && npm install  
cd ../user-service && npm install
cd ../transport-service && npm install
cd ../ticket-service && npm install
cd ../public-service && npm install
cd ../payment-service && npm install
cd ../notification-service && npm install
cd ../scheduler-service && npm install
cd ../webhook && npm install
```

### Python Services
```bash
# Install tracing dependencies for Python services
cd report-service && pip install -r requirements.txt
cd ../control-service && pip install -r requirements.txt
cd ../management-service && pip install -r requirements.txt
```

## Restart Services
```bash
# Restart all services to apply tracing
docker-compose restart
```

## Verify Installation

Check that tracing is working:

1. **Check service logs**:
   ```bash
   docker-compose logs api-gateway | grep "OpenTelemetry"
   docker-compose logs auth-service | grep "OpenTelemetry"
   # etc. for each service
   ```

2. **Access Jaeger UI**:
   - Open http://localhost:16686
   - Select a service from dropdown
   - Click "Find Traces"
   - You should see traces appearing

3. **Access Grafana Tracing Dashboard**:
   - Open http://localhost:3001
   - Navigate to "Metro Distributed Tracing Dashboard"
   - Check for active traces and service maps

## Troubleshooting

### If services fail to start:
- Check that `.env` files have tracing configuration
- Verify Jaeger service is running: `docker-compose ps jaeger`
- Check service logs: `docker-compose logs [service-name]`

### If no traces appear:
- Ensure environment variables are properly set
- Check sampling configuration (set to 1.0 for 100% in development)
- Verify network connectivity between services and Jaeger

### Common Issues:
- **Module not found**: Run `npm install` or `pip install -r requirements.txt`
- **Connection refused**: Check if Jaeger container is running
- **No traces**: Verify `SERVICE_NAME` environment variables are set correctly

