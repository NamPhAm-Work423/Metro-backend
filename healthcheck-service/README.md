# Health Check Service (Email Alert Service)

A Flask-based service that receives alerts from monitoring systems and sends email notifications with confirmation links.

## Features

- **Alert Reception**: Receives alerts via HTTP POST to `/alert` endpoint
- **Email Notifications**: Sends HTML email alerts with confirmation links
- **Confirmation System**: Tracks alert confirmations and re-sends unconfirmed alerts
- **Automatic Cleanup**: Removes old alerts and confirmation links
- **Thread-Safe**: Uses locks for concurrent access to alert state
- **Health Endpoint**: Provides `/health` endpoint for service monitoring

## API Endpoints

### `GET /`
Returns service status message.

### `GET /health`
Returns health check information.

### `POST /alert`
Receives alert data in Prometheus AlertManager format:
```json
{
  "alerts": [
    {
      "labels": {
        "job": "service-name",
        "instance": "service-instance"
      },
      "annotations": {
        "summary": "Service is down"
      },
      "status": "firing"
    }
  ]
}
```

### `GET /confirm/<fid>`
Confirms an alert using the unique confirmation ID.

## Configuration

Copy `env.example` to `.env` and configure the following variables:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_NAME=Metro System
EMAIL_FROM=your-email@gmail.com
ADMIN_EMAIL=admin@example.com

# Service Configuration
HOST_URL=http://localhost:3007
```

## Email Setup

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

## Alert Flow

1. **Alert Received**: Service receives alert via POST to `/alert`
2. **Email Sent**: HTML email with confirmation link sent to admin
3. **Confirmation**: Admin clicks link to confirm alert received
4. **Re-alert**: If not confirmed within 5 minutes, another email is sent
5. **Cleanup**: Old alerts and confirmations are cleaned up automatically

## Email Template

The service uses `templates/email_template.html` for email alerts. The template includes:

- Service name and instance
- Alert summary
- Confirmation button
- Styling for professional appearance

## Running the Service

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

### Docker

```bash
# Build the image
docker build -t healthcheck-service .

# Run the container
docker run -d --name healthcheck-service \
  --env-file .env \
  -p 3007:3007 \
  healthcheck-service
```

### Docker Compose

The service is included in the main `docker-compose.yml` file.

## Alert State Management

- **State Storage**: In-memory storage with thread-safe access
- **Confirmation Tracking**: Maps confirmation IDs to alert keys
- **Automatic Cleanup**: Removes old alerts and confirmations
- **Re-alert Logic**: Sends new emails for unconfirmed alerts

## Dependencies

- `Flask`: Web framework
- `Flask-Mail`: Email functionality
- `Flask-APScheduler`: Background task scheduling
- `python-dotenv`: Environment variable loading

## Integration with Monitoring

This service is designed to work with:
- Prometheus AlertManager
- Custom monitoring systems
- Any system that can send HTTP POST alerts

## Security Notes

- Confirmation links use UUID4 for uniqueness
- Links expire after 15 minutes
- Thread-safe operations prevent race conditions
- No persistent storage of sensitive data 