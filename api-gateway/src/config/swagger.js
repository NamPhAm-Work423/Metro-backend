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
                properties: {
                    passengerId: { type: 'string', format: 'uuid' },
                    userId: { type: 'string', format: 'uuid' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    dateOfBirth: { type: 'string', format: 'date' },
                    gender: { type: 'string', enum: ['male', 'female', 'other'] },
                    address: { type: 'string' },
                    ticketList: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'List of ticket IDs'
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                }
            },
            // Staff schemas
            Staff: {
                type: 'object',
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
            }
        }
    },
    tags: [
        {
            name: 'Authentication',
            description: 'User authentication and authorization'
        },
        {
            name: 'Admin Management',
            description: '🚨 Admin user management operations - ADMIN ACCOUNTS CANNOT BE CREATED VIA PUBLIC REGISTRATION. Manual creation by existing administrators only!'
        },
        {
            name: 'Passenger Management', 
            description: 'Passenger user management operations'
        },
        {
            name: 'Staff Management',
            description: 'Staff user management operations'
        },
        {
            name: 'System',
            description: 'System health and discovery endpoints'
        }
    ]
}

const options = {
    definition: swaggerDefinition,
    apis: [
        path.join(__dirname, '..', 'routes', '**/*.js'),
        path.join(__dirname, '..', 'swagger', '**/*.js')
    ],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = { swaggerUi, swaggerSpec };
