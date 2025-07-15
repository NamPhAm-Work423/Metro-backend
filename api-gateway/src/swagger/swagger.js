const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Metro Backend API Gateway',
        version: '1.0.0',
        description: `
# Metro Backend API - Complete Documentation

## 🔐 Authentication

This API uses **cookie-based authentication** for maximum security and ease of use.


### FRONT END DEVELOPER MUST DO THIS WHEN HANDLING WITH PAGES 
- **Must call /v1/route/user/passenger/sync-passenger route when access to ticket buy page to sync passenger data to cache**


### How it works:
1. **Login** using \`/v1/auth/login\` - JWT token is automatically stored in HTTP-only cookie
2. **Use any endpoint** - Cookies are automatically sent with requests
3. **No manual token management** required


### Swagger UI Testing:
1. Use the \`/v1/auth/login\` endpoint to login
2. Cookies are automatically handled by your browser
3. All subsequent requests will be authenticated

## 📋 Available Services:
- **Authentication**: User registration, login, password management
- **User Management**: Admin, Passenger, and Staff user operations  
- **System**: Service discovery, health checks, and routing

## 🔐 Admin Account Security Policy:

### ⚠️ CRITICAL SECURITY NOTICE ⚠️
**ADMIN ACCOUNTS CANNOT BE CREATED THROUGH PUBLIC REGISTRATION**

- ❌ **Forbidden**: Using 'admin' role in \'/v1/auth/register\`
- ❌ **Blocked**: Auto-creation of admin profiles from user events
- ✅ **Required**: Manual creation by existing administrators only



### Admin Creation Process:
1. Only existing administrators can create new admin accounts
2. Admin creation must go through secure internal processes
3. All admin account creation is logged and audited
4. No self-service admin registration is permitted

**This policy prevents privilege escalation attacks and ensures proper authorization.**

## 🚀 Getting Started:
1. Register a new user with \`/v1/auth/register\`
2. Login with \`/v1/auth/login\`
3. Explore the available endpoints below
        `,
        contact: {
            name: 'Metro Backend Team',
            email: 'support@metro.com'
        }
    },
    servers: [
        { 
            url: 'http://localhost:3000', 
            description: 'Local Development Server' 
        },
        { 
            url: 'https://api.metro.com', 
            description: 'Production Server' 
        }
    ],
    components: {
        securitySchemes: {
            cookieAuth: {
                type: 'apiKey',
                in: 'cookie',
                name: 'accessToken',
                description: 'JWT token automatically stored in HTTP-only cookie after login. No manual setup required.'
            }
        },
        schemas: {
            // Common schemas
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string' },
                    error: { type: 'string' }
                }
            },
            Success: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { type: 'object' }
                }
            },
            // User schemas
            User: {
                type: 'object',
                description: 'Core user profile returned by authentication/user services',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    username: { type: 'string' },
                                         roles: { 
                        type: 'array', 
                        items: { 
                            type: 'string', 
                            enum: ['admin', 'passenger', 'staff'] 
                        },
                        description: '🚨 NOTE: Admin role can only be assigned manually by existing administrators, never through public registration'
                    },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    isVerified: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            // Admin schemas
            Admin: {
                type: 'object',
                description: 'Administrator role linked to a base user. Created only by existing admins.',
                properties: {
                    adminId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            // Passenger schemas
            Passenger: {
                type: 'object',
                description: 'Passenger profile with personal information',
                properties: {
                    passengerId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                    address: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            // Staff schemas
            Staff: {
                type: 'object',
                description: 'Railway staff profile including position and employment status',
                properties: {
                    staffId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                    address: { type: 'string' },
                    position: { type: 'string' },
                    department: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            // Transport schemas
            Station: {
                type: 'object',
                description: 'A train/metro station with geo-location and facilities',
                properties: {
                    stationId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    location: { type: 'string', description: 'Human-readable address or description' },
                    latitude: { type: 'number', format: 'float' },
                    longitude: { type: 'number', format: 'float' },
                    openTime: { type: 'string', format: 'time' },
                    closeTime: { type: 'string', format: 'time' },
                    facilities: { type: 'object', description: 'JSON object describing facilities (e.g., restrooms, elevators)' },
                    connections: { type: 'object', description: 'JSON object for connections to other lines or transport' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            Route: {
                type: 'object',
                description: 'A defined line connecting an origin station to a destination station',
                properties: {
                    routeId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    originId: { type: 'string', format: 'uuid', description: 'Origin stationId' },
                    destinationId: { type: 'string', format: 'uuid', description: 'Destination stationId' },
                    distance: { type: 'number', format: 'float', description: 'Distance in kilometers' },
                    duration: { type: 'number', format: 'float', description: 'Estimated duration in minutes' },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            RouteStation: {
                type: 'object',
                description: 'Link entity that maps stations to a route in travel sequence',
                properties: {
                    routeStationId: { type: 'string', format: 'uuid' },
                    routeId: { type: 'string', format: 'uuid' },
                    stationId: { type: 'string', format: 'uuid' },
                    sequence: { type: 'integer', description: 'Order of the station in the route' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            Stop: {
                type: 'object',
                description: 'A scheduled stop for a trip at a particular station',
                properties: {
                    stopId: { type: 'string', format: 'uuid' },
                    tripId: { type: 'string', format: 'uuid' },
                    stationId: { type: 'string', format: 'uuid' },
                    arrivalTime: { type: 'string', format: 'time', nullable: true },
                    departureTime: { type: 'string', format: 'time', nullable: true },
                    sequence: { type: 'integer' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            Train: {
                type: 'object',
                description: 'A physical train asset with capacity and maintenance info',
                properties: {
                    trainId: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['standard', 'express', 'freight'] },
                    capacity: { type: 'integer' },
                    status: { type: 'string', enum: ['active', 'maintenance', 'out-of-service'] },
                    lastMaintenance: { type: 'string', format: 'date-time', nullable: true },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            Trip: {
                type: 'object',
                description: 'A scheduled departure of a train along a route',
                properties: {
                    tripId: { type: 'string', format: 'uuid' },
                    routeId: { type: 'string', format: 'uuid' },
                    trainId: { type: 'string', format: 'uuid' },
                    departureTime: { type: 'string', format: 'time' },
                    arrivalTime: { type: 'string', format: 'time' },
                    dayOfWeek: { type: 'string', enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
                    isActive: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    tags: [
        {
            name: 'Authentication',
            description: `User authentication and authorization.\n\n**User model fields**:\n- id (uuid)\n- email (string)\n- username (string)\n- roles (array<admin|passenger|staff>)\n- firstName (string)\n- lastName (string)\n- phoneNumber (string)\n- isVerified (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Admin Management',
            description: `🚨 Admin user management operations.\n\n**Admin model fields**:\n- adminId (uuid)\n- userId (uuid)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Passenger Management', 
            description: `Passenger user management operations.\n\n**Passenger model fields**:\n- passengerId (uuid)\n- userId (uuid)\n- firstName (string)\n- lastName (string)\n- phoneNumber (string)\n- dateOfBirth (date)\n- gender (male|female|other)\n- address (string)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Staff Management',
            description: `Staff user management operations.\n\n**Staff model fields**:\n- staffId (uuid)\n- userId (uuid)\n- firstName (string)\n- lastName (string)\n- phoneNumber (string)\n- dateOfBirth (date)\n- gender (male|female|other)\n- address (string)\n- position (string)\n- department (string)\n- status (active|inactive|on_leave)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Stations',
            description: `Endpoints for creating, updating and retrieving station data.\n\n**Station model fields**:\n- stationId (uuid)\n- name (string)\n- location (string)\n- latitude (float)\n- longitude (float)\n- openTime (time)\n- closeTime (time)\n- facilities (object)\n- connections (object)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Routes',
            description: `Endpoints for managing routes between stations.\n\n**Route model fields**:\n- routeId (uuid)\n- name (string)\n- originId (uuid)\n- destinationId (uuid)\n- distance (float km)\n- duration (float minutes)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Route Stations',
            description: `Endpoints that map stations to routes and provide search between stations.\n\n**RouteStation model fields**:\n- routeStationId (uuid)\n- routeId (uuid)\n- stationId (uuid)\n- sequence (integer)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Stops',
            description: `Endpoints for managing scheduled stops within trips.\n\n**Stop model fields**:\n- stopId (uuid)\n- tripId (uuid)\n- stationId (uuid)\n- arrivalTime (time)\n- departureTime (time)\n- sequence (integer)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Trains',
            description: `Endpoints for managing train assets, capacity and status.\n\n**Train model fields**:\n- trainId (uuid)\n- name (string)\n- type (standard|express|freight)\n- capacity (integer seats)\n- status (active|maintenance|out-of-service)\n- lastMaintenance (date-time)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Trips',
            description: `Endpoints for scheduling trips of trains along routes.\n\n**Trip model fields**:\n- tripId (uuid)\n- routeId (uuid)\n- trainId (uuid)\n- departureTime (time)\n- arrivalTime (time)\n- dayOfWeek (Monday-Sunday)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Tickets',
            description: `Ticket management and lifecycle operations.\n\n**Ticket model fields**:\n- ticketId (uuid)\n- passengerId (uuid)\n- tripId (uuid)\n- fareId (uuid)\n- promotionId (uuid, nullable)\n- originStationId (uuid)\n- destinationStationId (uuid)\n- purchaseDate (date-time)\n- validFrom (date-time)\n- validUntil (date-time)\n- usedAt (date-time, nullable)\n- originalPrice (decimal)\n- discountAmount (decimal)\n- finalPrice (decimal)\n- paymentMethod (credit_card|debit_card|cash|digital_wallet|bank_transfer)\n- paymentId (string)\n- status (active|used|expired|cancelled|refunded)\n- ticketType (single|return|day_pass|weekly|monthly)\n- qrCode (string)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Fares',
            description: `Fare management and pricing calculations.\n\n**Fare model fields**:\n- fareId (uuid)\n- routeId (uuid)\n- originStationId (uuid)\n- destinationStationId (uuid)\n- ticketType (single|return|day_pass|weekly|monthly)\n- passengerType (adult|child|senior|student|disabled)\n- basePrice (decimal)\n- peakHourMultiplier (decimal)\n- distance (float)\n- zones (integer)\n- effectiveFrom (date-time)\n- effectiveUntil (date-time, nullable)\n- currency (string)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'Promotions',
            description: `Promotion management and discount validation.\n\n**Promotion model fields**:\n- promotionId (uuid)\n- code (string)\n- name (string)\n- description (string)\n- type (percentage|fixed_amount|buy_one_get_one)\n- value (decimal)\n- maxDiscountAmount (decimal, nullable)\n- minPurchaseAmount (decimal, nullable)\n- applicableTicketTypes (array)\n- applicablePassengerTypes (array)\n- applicableRoutes (array)\n- usageLimit (integer, nullable)\n- usageCount (integer)\n- userUsageLimit (integer, nullable)\n- validFrom (date-time)\n- validUntil (date-time)\n- daysOfWeek (array)\n- timeSlots (array)\n- isActive (boolean)\n- createdAt (date-time)\n- updatedAt (date-time)`
        },
        {
            name: 'System',
            description: 'System health and discovery endpoints'
        },
        {
            name: 'Public API',
            description: 'Public caching service for transport and ticket data'
        }
    ]
}

const options = {
    definition: swaggerDefinition,
    apis: [
        path.join(__dirname, '..', 'routes', '**/*.js'),
        path.join(__dirname, '..', 'swagger', '**/*.js'),
        path.join(__dirname, '..', 'swagger', 'public-service.swagger.js')
    ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
