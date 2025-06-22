# API Gateway

The API Gateway serves as the entry point for all client requests in our microservices architecture. It handles routing, authentication, load balancing, and service discovery.

## Features

- Service Discovery and Registration
- Load Balancing (Round-robin and Weighted Round-robin)
- Circuit Breaker Pattern
- Rate Limiting
- JWT Authentication
- Request/Response Logging
- Health Checks
- Redis Caching
- Swagger API Documentation

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 15
- Redis 7
- Docker and Docker Compose (for containerized deployment)

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── environments/     # Environment-specific configs
├── helpers/         # Helper functions
├── middlewares/     # Custom middlewares
├── models/          # Database models
├── routes/          # API routes
├── services/        # Business logic
└── utils/           # Utility functions
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application
NODE_ENV=development
PORT=8080

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_ACCESS_SECRET=your_access_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd api-gateway
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t api-gateway .
```

2. Run with Docker Compose:
```bash
docker-compose up -d
```

## API Documentation

The API documentation is available at `/api-docs` when the server is running. It provides detailed information about all available endpoints, request/response schemas, and authentication requirements.

### Available Endpoints

#### Service Management
- `POST /api/services` - Register a new service
- `GET /api/services` - Get all services
- `GET /api/services/:name` - Get service by name
- `PUT /api/services/:serviceId` - Update service configuration

#### Instance Management
- `POST /api/services/:serviceId/instances` - Register a new service instance
- `DELETE /api/services/:serviceId/instances/:instanceId` - Remove a service instance

#### Health and Load Balancing
- `GET /api/services/:serviceId/health` - Perform health check on service instances
- `GET /api/services/:serviceId/next-instance` - Get next available instance for load balancing

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Monitoring and Management

- **Health Check**: Available at `/health`
- **Metrics**: Prometheus metrics available at `/metrics`
- **Logs**: Configured with Winston logger
- **Redis Commander**: Available at `http://localhost:8081`
- **pgAdmin**: Available at `http://localhost:5050`

## Security

- JWT-based authentication
- Rate limiting per IP and per user
- CORS configuration
- Request validation
- Input sanitization
- Secure headers

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 