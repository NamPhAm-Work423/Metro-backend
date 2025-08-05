# Report Service

A Python-based report generation service for the Metro system, built with FastAPI, SQLAlchemy, and Kafka.

## Features

- **Report Generation**: Create daily, weekly, monthly, and custom reports
- **Real-time Analytics**: Process Kafka events for real-time metrics
- **Template System**: Reusable report templates
- **Scheduled Reports**: Automated report generation
- **Metrics Collection**: Prometheus metrics for monitoring
- **Comprehensive Logging**: Structured logging with structlog

## Technology Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Message Queue**: Apache Kafka
- **Logging**: structlog
- **Metrics**: Prometheus
- **Data Processing**: Pandas, Matplotlib, Seaborn

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.py   # Database configuration
│   ├── logger.py     # Logging configuration
│   └── metrics.py    # Prometheus metrics
├── controllers/      # API controllers
│   └── report_controller.py
├── events/          # Kafka event handlers
│   └── report_consumer.py
├── kafka/           # Kafka utilities
│   ├── kafka_consumer.py
│   └── kafka_producer.py
├── models/          # Database models
│   ├── report_model.py
│   └── user_model.py
├── schemas/         # Pydantic schemas
│   └── report_schema.py
├── services/        # Business logic
│   └── report_service.py
├── app.py          # FastAPI application
└── main.py         # Application entry point
```

## API Endpoints

### Reports
- `POST /v1/reports/` - Create a new report
- `GET /v1/reports/` - Get list of reports
- `GET /v1/reports/{report_id}` - Get specific report
- `DELETE /v1/reports/{report_id}` - Delete report

### Templates
- `POST /v1/reports/templates` - Create report template
- `GET /v1/reports/templates` - Get all templates

### Schedules
- `POST /v1/reports/schedules` - Create report schedule

### Analytics
- `GET /v1/reports/analytics/daily` - Daily analytics
- `GET /v1/reports/analytics/weekly` - Weekly analytics
- `GET /v1/reports/analytics/monthly` - Monthly analytics

### System
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Environment Variables

```bash
# Application Configuration
NODE_ENV=development
HOST=0.0.0.0
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/metro_report

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=report-service
KAFKA_GROUP_ID=report-service-group

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=logs/application.log

# Security Configuration
SERVICE_AUTH_SECRET=your-service-auth-secret

# Report Configuration
REPORTS_DIR=reports
MAX_REPORT_SIZE=10MB
REPORT_RETENTION_DAYS=30
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd report-service
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Run the application**
   ```bash
   # Development
   python src/main.py
   
   # Production
   uvicorn src.app:app --host 0.0.0.0 --port 3001
   ```

## Docker

```bash
# Build the image
docker build -t report-service .

# Run the container
docker run -p 3001:3001 --env-file .env report-service
```

## Kafka Events

The service consumes the following Kafka events:

- **ticket-events**: Ticket creation and updates
- **payment-events**: Payment completions
- **user-events**: User registrations and updates
- **transport-events**: Route and station updates

## Report Types

### Daily Reports
- Summary of daily operations
- Ticket sales and revenue
- Passenger counts
- Route performance

### Weekly Reports
- 7-day aggregated data
- Daily breakdown charts
- Trend analysis
- Performance metrics

### Monthly Reports
- Monthly aggregated data
- Weekly breakdown
- Top performing routes
- Revenue analysis

### Custom Reports
- Configurable based on metadata
- Flexible data sources
- Custom visualizations

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Metrics
```bash
curl http://localhost:3001/metrics
```

### Logs
Logs are written to:
- Console (structured JSON)
- `logs/application.log` (all logs)
- `logs/error.log` (error logs only)

## Development

### Running Tests
```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest
```

### Code Quality
```bash
# Install linting tools
pip install black flake8 isort

# Format code
black src/

# Check imports
isort src/

# Lint code
flake8 src/
```

## Production Deployment

1. **Database Setup**
   ```sql
   CREATE DATABASE metro_report;
   ```

2. **Kafka Topics**
   ```bash
   # Create required topics
   kafka-topics.sh --create --topic ticket-events --bootstrap-server localhost:9092
   kafka-topics.sh --create --topic payment-events --bootstrap-server localhost:9092
   kafka-topics.sh --create --topic user-events --bootstrap-server localhost:9092
   kafka-topics.sh --create --topic transport-events --bootstrap-server localhost:9092
   ```

3. **Environment Configuration**
   - Set `NODE_ENV=production`
   - Configure production database URL
   - Set up Kafka brokers
   - Configure logging level

4. **Monitoring**
   - Set up Prometheus scraping
   - Configure log aggregation
   - Set up alerting rules

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL configuration
   - Verify PostgreSQL is running
   - Check network connectivity

2. **Kafka Connection Failed**
   - Verify Kafka brokers are accessible
   - Check topic existence
   - Validate consumer group configuration

3. **Report Generation Failed**
   - Check file system permissions
   - Verify template configuration
   - Review error logs

### Log Analysis

```bash
# View application logs
tail -f logs/application.log

# View error logs
tail -f logs/error.log

# Search for specific errors
grep "ERROR" logs/application.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 