# User Service

Unified microservice handling admin, passenger and staff user profiles for the Metro backend system.

## Overview

This service consolidates three previously separate services:
- `admin-service` - Admin user management
- `passenger-service` - Passenger user management  
- `staff-service` - Staff user management

By merging these services, we reduce the operational complexity and resource usage while maintaining all functionality.

### Key Benefits:
- ✅ **Unified Architecture**: Single service reduces deployment complexity
- ✅ **Event-Driven**: Automatic profile creation from Kafka user events  
- ✅ **Role-Based Processing**: Smart handling based on user roles
- ✅ **Backward Compatible**: All original API endpoints maintained
- ✅ **Security Enhanced**: Admin profiles NOT auto-created for security
- ✅ **Performance Optimized**: Shared database connections and resources

## Features

### Admin Management
- Admin profile CRUD operations
- Admin self-service endpoints
- Admin-specific event publishing

### Passenger Management
- Passenger profile CRUD operations
- Passenger self-service endpoints
- Ticket management (add/remove/list tickets)
- Passenger-specific event publishing

### Staff Management
- Staff profile CRUD operations
- Staff self-service endpoints
- Staff status management (active/inactive)
- Staff-specific event publishing

### Unified Event Handling
- Consumes `user.created` events from api-gateway
- Automatically creates appropriate profiles based on user roles
- Publishes domain-specific events for other services

## API Endpoints

### Admin Routes (`/v1/admins`)
- `GET /getAllAdmins` - Get all admins (admin only)
- `GET /getAdminById/:id` - Get admin by ID (admin only)
- `PUT /updateAdmin/:id` - Update admin (admin only)
- `DELETE /deleteAdmin/:id` - Delete admin (admin only)
- `GET /me` - Get current admin profile
- `DELETE /me` - Delete current admin profile

### Passenger Routes (`/v1/passengers`)
- `GET /getallPassengers` - Get all passengers (staff/admin only)
- `GET /getPassengerById/:id` - Get passenger by ID (staff/admin only)
- `POST /createPassenger` - Create passenger (staff/admin only)
- `PUT /updatePassenger/:id` - Update passenger (staff/admin only)
- `DELETE /deletePassenger/:id` - Delete passenger (staff/admin only)
- `GET /me` - Get current passenger profile
- `PUT /me` - Update current passenger profile
- `DELETE /me` - Delete current passenger profile
- `GET /me/tickets` - Get my tickets
- `POST /me/tickets` - Add ticket
- `DELETE /me/tickets/:ticketId` - Remove ticket

### Staff Routes (`/v1/staff`)
- `GET /getAllStaff` - Get all staff (staff/admin only)
- `GET /getStaffById/:id` - Get staff by ID (staff/admin only)
- `POST /createStaff` - Create staff (staff/admin only)
- `PUT /updateStaff/:id` - Update staff (staff/admin only)
- `DELETE /deleteStaff/:id` - Delete staff (staff/admin only)
- `PUT /updateStaffStatus/:id` - Update staff status (admin only)
- `GET /me` - Get current staff profile
- `PUT /me` - Update current staff profile
- `DELETE /me` - Delete current staff profile

## Architecture

```
user-service/
├── src/
│   ├── config/          # Database, logger, etc.
│   ├── models/          # Sequelize models (Admin, Passenger, Staff)
│   ├── controllers/     # HTTP request handlers
│   ├── services/        # Business logic
│   ├── routes/          # Express routes
│   ├── events/          # Kafka event handlers
│   ├── kafka/           # Kafka utilities
│   ├── middlewares/     # Authorization, etc.
│   ├── helpers/         # Utility functions
│   ├── app.js           # Express application
│   └── index.js         # Entry point
├── package.json
├── Dockerfile
└── README.md
```

## Environment Variables

Create a `.env` file in the user-service directory:

```env
NODE_ENV=production
PORT=3003

#Service JWT
SERVICE_JWT_SECRET=ad9be0a348b0e7825a2f3487cb27db4779628e0e4d4c2c6bf1375feb80571b56

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ticket_db
DB_USER=ticket_service
DB_PASSWORD=ticketpass


# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD:-redispass123}
REDIS_KEY_PREFIX=${REDIS_KEY_PREFIX:-api_gateway_dev_}



KAFKA_BROKERS=kafka-1:19092,kafka-2:19093,kafka-3:19094
KAFKA_CLIENT_ID=ticket-service
KAFKA_BROKERS_INTERNAL=kafka-1:19092,kafka-2:19093,kafka-3:19094
```

### Environment Variables Explanation:

#### 📊 **Database Configuration**
- **DB_FORCE_SYNC**: Forces database recreation on startup (development only)
- **DB_ALTER_SYNC**: Allows automatic table alterations (use with caution)

#### 📨 **Event System**
- **Consumer Topics**: Events this service listens to from other services
- **Producer Topics**: Events this service publishes for other services to consume

#### 🔍 **Logging & Monitoring**
- **LOG_LEVEL**: Winston logging level (error, warn, info, debug)
- **LOG_MAX_SIZE**: Maximum log file size before rotation
- **LOG_MAX_FILES**: How long to keep rotated log files

#### 🛡️ **Security**
- **BCRYPT_ROUNDS**: Password hashing rounds (higher = more secure but slower)

## Getting Started

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Docker
```bash
# Build and run with docker-compose
docker-compose up user-service
```

## Migration from Previous Services

This service replaces:
- `admin-service` (port 3xxx)
- `passenger-service` (port 3001)
- `staff-service` (port 3002)

All API endpoints maintain backward compatibility. Update your API Gateway routing to point to:
- `user-service:3001` instead of individual services

### Migration Benefits:
- ✅ **Resource Optimization**: 3 services → 1 service = 66% reduction in containers
- ✅ **Simplified Deployment**: Single Docker image and configuration
- ✅ **Unified Database**: Shared connections and transactions
- ✅ **Event Consolidation**: Single Kafka consumer for all user events
- ✅ **Maintenance Reduction**: One codebase instead of three

## Event Flow

```mermaid
sequenceDiagram
    participant API as API Gateway
    participant KAFKA as Kafka
    participant USER as User Service
    participant DB as PostgreSQL

    Note over API,DB: User Registration & Profile Creation

    API->>KAFKA: Publish user.created event
    KAFKA->>USER: Consume user.created event
    USER->>USER: Check user roles
    
    alt User has "passenger" role
        USER->>DB: Create Passenger profile
        USER->>KAFKA: Publish passenger.created event
    end
    
    alt User has "staff" role
        USER->>DB: Create Staff profile
        USER->>KAFKA: Publish staff.created event
    end
    
    Note over USER: Admin profiles NOT auto-created (security)
    
    Note over API,DB: Profile Updates & Events
    
    USER->>DB: Update passenger/staff profile
    USER->>KAFKA: Publish passenger.updated/staff.updated event
```

### Event Processing Logic:

1. **User Registration**: API Gateway publishes `user.created` event
2. **Role-Based Processing**: User Service creates profiles based on user roles:
   - `passenger` role → Creates Passenger profile
   - `staff` role → Creates Staff profile
   - `admin` role → **NOT auto-created for security**
3. **Event Publishing**: Service publishes domain-specific events for other services
4. **Profile Updates**: All CRUD operations publish corresponding events

### Security Note:
Admin profiles are **never** automatically created from user registration events. Admin accounts must be manually created by existing administrators for security reasons.

## Health Check & Monitoring

### Endpoints:
- **Health Check**: `GET /metrics` - Service health status
- **Database Check**: Included in health endpoint
- **Kafka Check**: Included in health endpoint

### Monitoring Features:
- **Winston Logging**: Structured logging with daily rotation
- **Error Tracking**: Comprehensive error handling with correlation IDs
- **Performance Metrics**: Request timing and database query performance
- **Event Tracking**: Kafka message processing status 