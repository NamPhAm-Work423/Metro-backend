# Metro Backend - Overall System Architecture

## 🏗️ Complete System Architecture Diagram

```mermaid
graph TB
    %% Client Layer
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile App]
        ADMIN[Admin Panel]
        API_CLIENT[API Clients]
    end

    %% Edge Layer
    subgraph "Edge Layer"
        NGINX[Nginx Reverse Proxy<br/>:80, :443<br/>SSL Termination<br/>Rate Limiting<br/>CORS Management]
    end

    %% API Gateway Layer
    subgraph "API Gateway Layer"
        GATEWAY[API Gateway<br/>:8000<br/>Authentication<br/>Dynamic Routing<br/>Load Balancing<br/>Circuit Breaker]
    end

    %% Core Microservices
    subgraph "Core Microservices"
        AUTH[Auth Service<br/>:8001<br/>JWT Authentication<br/>User Management<br/>API Key Generation]
        
        USER[User Service<br/>:8002<br/>User Profiles<br/>Passenger Management<br/>Event Publishing]
        
        TRANSPORT[Transport Service<br/>:8003<br/>Routes & Stations<br/>Train Fleet<br/>gRPC Server]
        
        TICKET[Ticket Service<br/>:8004<br/>Ticket Management<br/>Fare Calculation<br/>Promotions]
        
        PUBLIC[Public Service<br/>:8005<br/>Data Aggregation<br/>Caching Layer<br/>Public APIs]
        
        PAYMENT[Payment Service<br/>:8006<br/>Multi-Gateway Support<br/>VNPay & PayPal<br/>Transaction Processing]
        
        REPORT[Report Service<br/>:8007<br/>Analytics<br/>Business Intelligence<br/>Revenue Tracking]
        
        CONTROL[Control Service<br/>:8008<br/>AI Scheduler<br/>Prophet ML<br/>Schedule Optimization]
        
        NOTIFICATION[Notification Service<br/>:8009<br/>Email & SMS<br/>Push Notifications<br/>Event Processing]
    end

    %% Supporting Services
    subgraph "Supporting Services"
        SCHEDULER[Scheduler Service<br/>Cron Jobs<br/>gRPC Endpoints<br/>Job Management]
        
        WEBHOOK[Webhook Service<br/>Payment Webhooks<br/>External Integrations<br/>Event Processing]
    end

    %% Data Layer
    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Primary Database<br/>Users, Services<br/>Transactions)]
        
        REDIS[(Redis Cache<br/>Session Management<br/>API Keys<br/>Rate Limiting)]
        
        MONGODB[(MongoDB<br/>Webhook Logs<br/>Unstructured Data<br/>Event Storage)]
        
        KAFKA[(Kafka Cluster<br/>Event Streaming<br/>Service Communication<br/>Message Broker)]
    end

    %% Monitoring & Observability
    subgraph "Monitoring & Observability"
        PROMETHEUS[Prometheus<br/>Metrics Collection<br/>Alerting]
        
        GRAFANA[Grafana<br/>Dashboards<br/>Visualization]
        
        LOKI[Loki<br/>Log Aggregation<br/>Centralized Logging]
        
        ALERTMANAGER[Alertmanager<br/>Alert Routing<br/>Notification Management]
    end

    %% External Services
    subgraph "External Services"
        VNPAY[VNPay Gateway<br/>Vietnamese Payments<br/>VND Processing]
        
        PAYPAL[PayPal Gateway<br/>International Payments<br/>USD Processing]
        
        EMAIL[SMTP Server<br/>Email Delivery<br/>Gmail SMTP]
        
        SMS[SMS Provider<br/>Text Messaging<br/>Notification Delivery]
    end

    %% Client Connections
    WEB --> NGINX
    MOBILE --> NGINX
    ADMIN --> NGINX
    API_CLIENT --> NGINX

    %% Edge to Gateway
    NGINX --> GATEWAY

    %% Gateway to Services
    GATEWAY --> AUTH
    GATEWAY --> USER
    GATEWAY --> TRANSPORT
    GATEWAY --> TICKET
    GATEWAY --> PUBLIC
    GATEWAY --> PAYMENT
    GATEWAY --> REPORT
    GATEWAY --> CONTROL
    GATEWAY --> NOTIFICATION

    %% Inter-Service Communication
    AUTH -.->|JWT Validation| GATEWAY
    USER -.->|gRPC| TRANSPORT
    TICKET -.->|gRPC| TRANSPORT
    PUBLIC -.->|gRPC| TRANSPORT
    PUBLIC -.->|gRPC| TICKET
    CONTROL -.->|gRPC| TRANSPORT
    SCHEDULER -.->|gRPC| CONTROL
    WEBHOOK -.->|HTTP| PAYMENT

    %% Data Connections
    GATEWAY --> POSTGRES
    GATEWAY --> REDIS
    AUTH --> POSTGRES
    USER --> POSTGRES
    TRANSPORT --> POSTGRES
    TICKET --> POSTGRES
    PAYMENT --> POSTGRES
    REPORT --> POSTGRES
    WEBHOOK --> MONGODB

    %% Cache Connections
    GATEWAY --> REDIS
    USER --> REDIS
    PUBLIC --> REDIS
    TICKET --> REDIS

    %% Event Streaming
    GATEWAY --> KAFKA
    USER --> KAFKA
    TRANSPORT --> KAFKA
    TICKET --> KAFKA
    PAYMENT --> KAFKA
    NOTIFICATION --> KAFKA

    %% External Integrations
    PAYMENT --> VNPAY
    PAYMENT --> PAYPAL
    NOTIFICATION --> EMAIL
    NOTIFICATION --> SMS
    WEBHOOK --> VNPAY
    WEBHOOK --> PAYPAL

    %% Monitoring Connections
    GATEWAY --> PROMETHEUS
    AUTH --> PROMETHEUS
    USER --> PROMETHEUS
    TRANSPORT --> PROMETHEUS
    TICKET --> PROMETHEUS
    PAYMENT --> PROMETHEUS
    CONTROL --> PROMETHEUS
    NOTIFICATION --> PROMETHEUS

    PROMETHEUS --> GRAFANA
    PROMETHEUS --> ALERTMANAGER
    LOKI --> GRAFANA

    %% Styling
    classDef clientLayer fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef edgeLayer fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef gatewayLayer fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef microservice fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef supporting fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef dataLayer fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    classDef monitoring fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    classDef external fill:#ffebee,stroke:#b71c1c,stroke-width:2px

    class WEB,MOBILE,ADMIN,API_CLIENT clientLayer
    class NGINX edgeLayer
    class GATEWAY gatewayLayer
    class AUTH,USER,TRANSPORT,TICKET,PUBLIC,PAYMENT,REPORT,CONTROL,NOTIFICATION microservice
    class SCHEDULER,WEBHOOK supporting
    class POSTGRES,REDIS,MONGODB,KAFKA dataLayer
    class PROMETHEUS,GRAFANA,LOKI,ALERTMANAGER monitoring
    class VNPAY,PAYPAL,EMAIL,SMS external
```

## 🔄 Data Flow Architecture

```mermaid
sequenceDiagram
    participant Client
    participant Nginx
    participant Gateway
    participant Auth
    participant User
    participant Transport
    participant Ticket
    participant Payment
    participant Kafka
    participant Redis
    participant PostgreSQL

    %% Authentication Flow
    Client->>Nginx: 1. Login Request
    Nginx->>Gateway: 2. Forward to Gateway
    Gateway->>Auth: 3. Authenticate User
    Auth->>PostgreSQL: 4. Validate Credentials
    Auth->>Gateway: 5. Return JWT Token
    Gateway->>Client: 6. JWT + API Key

    %% Ticket Booking Flow
    Client->>Nginx: 7. Book Ticket (API Key)
    Nginx->>Gateway: 8. Forward Request
    Gateway->>Redis: 9. Validate API Key
    Gateway->>Ticket: 10. Create Ticket
    Ticket->>Transport: 11. Get Route Info (gRPC)
    Ticket->>Payment: 12. Process Payment
    Payment->>Ticket: 13. Payment Confirmed
    Ticket->>Kafka: 14. Publish Ticket Event
    Ticket->>Gateway: 15. Return Ticket
    Gateway->>Client: 16. Ticket Confirmation

    %% AI Scheduling Flow
    Note over Gateway,Control: Daily at 3:00 AM
    Gateway->>Control: 17. Generate Daily Schedules
    Control->>Transport: 18. Get Routes (gRPC)
    Control->>Transport: 19. Create Trips (gRPC)
    Control->>Kafka: 20. Publish Schedule Events
```

## 🏛️ Service Architecture Patterns

### 1. **API Gateway Pattern**
- **Single Entry Point**: All client requests through Nginx → API Gateway
- **Authentication & Authorization**: JWT + API Key dual system
- **Dynamic Routing**: Service discovery with load balancing
- **Circuit Breaker**: Fault tolerance with automatic fallback

### 2. **Microservices Architecture**
- **Domain-Driven Design**: Each service owns specific business domain
- **Independent Deployment**: Services can be deployed separately
- **Technology Diversity**: Node.js, Python, different databases
- **Event-Driven Communication**: Kafka for loose coupling

### 3. **Event-Driven Architecture**
- **Asynchronous Processing**: Services communicate via events
- **Event Sourcing**: Critical business events stored as logs
- **CQRS**: Separate read/write models for performance
- **Saga Pattern**: Distributed transaction management

### 4. **Multi-Database Strategy**
- **PostgreSQL**: Primary transactional database
- **Redis**: High-performance caching and session management
- **MongoDB**: Document storage for unstructured data
- **Kafka**: Event streaming and message broker

## 🔧 Technology Stack Summary

### **Frontend & Edge**
- **Nginx**: Reverse proxy, SSL termination, rate limiting
- **Web/Mobile**: React, mobile applications
- **Admin Panel**: Management interface

### **Backend Services**
- **API Gateway**: Node.js + Express + PostgreSQL + Redis
- **Auth Service**: Node.js + JWT + PostgreSQL
- **User Service**: Node.js + PostgreSQL + Redis + Kafka
- **Transport Service**: Node.js + PostgreSQL + gRPC
- **Ticket Service**: Node.js + PostgreSQL + Redis + gRPC
- **Public Service**: Node.js + Redis + gRPC
- **Payment Service**: Node.js + PostgreSQL + Kafka
- **Report Service**: Python + PostgreSQL
- **Control Service**: Python + Prophet ML + gRPC
- **Notification Service**: Node.js + Kafka + SMTP/SMS

### **Supporting Services**
- **Scheduler Service**: Node.js + gRPC + Cron
- **Webhook Service**: Node.js + MongoDB + Redis

### **Data & Infrastructure**
- **PostgreSQL**: Primary database
- **Redis**: Caching and session management
- **MongoDB**: Document storage
- **Kafka**: Event streaming
- **Prometheus + Grafana**: Monitoring
- **Loki**: Log aggregation

### **External Integrations**
- **VNPay**: Vietnamese payment gateway
- **PayPal**: International payment gateway
- **SMTP**: Email delivery
- **SMS**: Text messaging

## 🚀 Key Architectural Benefits

### **Scalability**
- **Horizontal Scaling**: Each service can scale independently
- **Load Balancing**: Nginx + API Gateway load distribution
- **Caching**: Redis for high-performance data access
- **Event Streaming**: Kafka for high-throughput messaging

### **Reliability**
- **Circuit Breaker**: Automatic failure handling
- **Health Checks**: Service monitoring and auto-recovery
- **Graceful Degradation**: System continues with reduced functionality
- **Data Consistency**: Event sourcing and saga patterns

### **Security**
- **Multi-layer Security**: Nginx + API Gateway + Service-level
- **JWT + API Key**: Dual authentication system
- **Rate Limiting**: Protection against abuse
- **CORS Management**: Controlled cross-origin access

### **Observability**
- **Comprehensive Monitoring**: Prometheus + Grafana
- **Centralized Logging**: Loki for log aggregation
- **Distributed Tracing**: Request correlation across services
- **Performance Metrics**: Real-time system health monitoring

## 🗄️ Database Schema & Entity Relationship Diagrams (ERD)

Based on the comprehensive analysis of all service README files and database models, here are the individual Entity Relationship Diagrams for each microservice in the Metro Backend system:

### 🔐 API Gateway Service Database

```mermaid
erDiagram
    SERVICES ||--o{ SERVICE_INSTANCES : "has"
    
    SERVICES {
        UUID id PK
        STRING name UK
        STRING endPoint
        TEXT description
        STRING version
        INTEGER timeout
        INTEGER retries
        JSONB circuitBreaker
        JSONB loadBalancer
        JSONB authentication
        JSONB rateLimit
        ENUM status
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    SERVICE_INSTANCES {
        UUID id PK
        UUID serviceId FK
        STRING host
        INTEGER port
        INTEGER weight
        STRING region
        ENUM status
        BOOLEAN isHealthy
        TIMESTAMP lastHealthCheck
        JSONB metadata
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    API_KEYS {
        UUID id PK
        STRING keyHash UK
        STRING name
        JSONB permissions
        BOOLEAN isActive
        TIMESTAMP expiresAt
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 🔑 Auth Service Database

```mermaid
erDiagram
    
    USERS {
        UUID id PK
        VARCHAR email UK
        VARCHAR username UK
        VARCHAR password
        BOOLEAN isVerified
        BOOLEAN accountLocked
        VARCHAR emailToken
        TIMESTAMP emailTokenExpiry
        ARRAY roles
        TIMESTAMP lastLoginAt
        VARCHAR passwordResetToken
        TIMESTAMP passwordResetExpiry
        INTEGER loginAttempts
        TIMESTAMP lockUntil
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    KEYS {
        UUID id PK
        VARCHAR value
        ENUM status
        VARCHAR title
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 👥 User Service Database

```mermaid
erDiagram
    ADMINS ||--o{ USERS : "references"
    PASSENGERS ||--o{ USERS : "references"  
    STAFF ||--o{ USERS : "references"
    
    ADMINS {
        UUID adminId PK
        UUID userId UK
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    PASSENGERS {
        UUID passengerId PK
        UUID userId UK
        STRING username UK
        STRING email UK
        STRING firstName
        STRING lastName
        STRING phoneNumber
        DATE dateOfBirth
        ENUM gender
        TEXT address
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    STAFF {
        UUID staffId PK
        UUID userId UK
        STRING username UK
        STRING email UK
        STRING firstName
        STRING lastName
        STRING phoneNumber
        DATE dateOfBirth
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 🚇 Transport Service Database

```mermaid
erDiagram
    STATIONS ||--o{ ROUTES : "origin"
    STATIONS ||--o{ ROUTES : "destination"
    STATIONS ||--o{ ROUTE_STATIONS : "belongs_to"
    STATIONS ||--o{ STOPS : "stops_at"
    
    ROUTES ||--o{ ROUTE_STATIONS : "has_stations"
    ROUTES ||--o{ TRIPS : "has_trips"
    ROUTES ||--o{ TRAINS : "assigned_to"
    
    TRAINS ||--o{ TRIPS : "operates"
    
    TRIPS ||--o{ STOPS : "has_stops"
    
    STATIONS {
        STRING stationId PK
        STRING name
        STRING location
        FLOAT latitude
        FLOAT longitude
        TIME openTime
        TIME closeTime
        JSON facilities
        JSON connections
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    ROUTES {
        STRING routeId PK
        STRING name
        STRING originId FK
        STRING destinationId FK
        INTEGER numberOfStations
        FLOAT distance
        FLOAT duration
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    ROUTE_STATIONS {
        STRING routeStationId PK
        STRING routeId FK
        STRING stationId FK
        INTEGER sequence
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    TRAINS {
        STRING trainId PK
        STRING name
        STRING type
        INTEGER capacity
        STRING status
        STRING routeId FK
        DATE lastMaintenance
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    TRIPS {
        STRING tripId PK
        STRING routeId FK
        STRING trainId FK
        TIME departureTime
        TIME arrivalTime
        STRING dayOfWeek
        DATE serviceDate
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    STOPS {
        STRING stopId PK
        STRING tripId FK
        STRING stationId FK
        TIME arrivalTime
        TIME departureTime
        INTEGER sequence
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 🎫 Ticket Service Database

```mermaid
erDiagram
    TICKETS ||--o{ FARES : "references"
    TICKETS ||--o{ PROMOTIONS : "references"
    TICKETS ||--o{ TRANSIT_PASSES : "references"
    TICKETS ||--o{ PASSENGER_DISCOUNTS : "applies"
    
    TICKETS {
        UUID ticketId PK
        UUID passengerId
        INTEGER totalPassengers
        UUID tripId
        UUID fareId
        UUID transitPassId
        UUID promotionId
        STRING originStationId
        STRING destinationStationId
        DATE purchaseDate
        DATE validFrom
        DATE validUntil
        ENUM ticketType
        ARRAY usedList
        DATE activatedAt
        DECIMAL originalPrice
        DECIMAL discountAmount
        DECIMAL finalPrice
        DECIMAL totalPrice
        ENUM paymentMethod
        STRING paymentId
        ENUM status
        INTEGER stationCount
        JSON fareBreakdown
        TEXT qrCode
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    FARES {
        UUID fareId PK
        STRING routeId
        DECIMAL basePrice
        ENUM currency
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    PROMOTIONS {
        UUID promotionId PK
        STRING promotionCode
        STRING name
        ENUM type
        DECIMAL value
        ARRAY applicableTicketTypes
        ARRAY applicablePassengerTypes
        INTEGER usageLimit
        INTEGER usageCount
        DATE validFrom
        DATE validUntil
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    TRANSIT_PASSES {
        UUID transitPassId PK
        ENUM transitPassType
        DECIMAL price
        ENUM currency
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    PASSENGER_DISCOUNTS {
        UUID discountId PK
        ENUM passengerType
        ENUM discountType
        DECIMAL discountValue
        STRING description
        DATE validFrom
        DATE validUntil
        BOOLEAN isActive
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 💳 Payment Service Database

```mermaid
erDiagram
    PAYMENTS ||--o{ TRANSACTIONS : "has"
    PAYMENTS ||--o{ PAYMENT_LOGS : "has"
    
    PAYMENTS {
        UUID paymentId PK
        UUID ticketId FK
        UUID passengerId FK
        DECIMAL paymentAmount
        ENUM paymentMethod
        ENUM paymentStatus
        TIMESTAMP paymentDate
        JSON paymentGatewayResponse
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    TRANSACTIONS {
        UUID transactionId PK
        UUID paymentId FK
        DECIMAL transactionAmount
        ENUM transactionStatus
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    PAYMENT_LOGS {
        UUID logId PK
        UUID paymentId FK
        ENUM paymentLogType
        TIMESTAMP paymentLogDate
        ENUM paymentLogStatus
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 📧 Notification Service Database

```mermaid
erDiagram
    EMAILS ||--o{ USERS : "references"
    SMS ||--o{ USERS : "references"
    
    EMAILS {
        UUID id PK
        VARCHAR provider
        VARCHAR providerMessageId
        VARCHAR toEmail
        VARCHAR fromEmail
        VARCHAR subject
        TEXT htmlContent
        TEXT textContent
        VARCHAR template
        JSONB variables
        ENUM status
        TEXT errorMessage
        JSONB providerResponse
        UUID userId
        VARCHAR category
        ENUM priority
        BOOLEAN hasAttachments
        INTEGER attachmentCount
        TIMESTAMP scheduledAt
        TIMESTAMP sentAt
        TIMESTAMP deliveredAt
        TIMESTAMP openedAt
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
    
    SMS {
        UUID id PK
        VARCHAR provider
        VARCHAR providerMessageId
        VARCHAR toPhoneNumber
        VARCHAR fromSenderId
        TEXT textContent
        INTEGER messageLength
        INTEGER segmentCount
        VARCHAR template
        JSONB variables
        ENUM status
        TEXT errorMessage
        JSONB providerResponse
        DECIMAL cost
        VARCHAR currency
        UUID userId
        VARCHAR category
        ENUM priority
        VARCHAR countryCode
        TIMESTAMP scheduledAt
        TIMESTAMP sentAt
        TIMESTAMP deliveredAt
        TIMESTAMP createdAt
        TIMESTAMP updatedAt
    }
```

### 📊 Report Service Database

```mermaid
erDiagram
    REPORTS ||--o{ REPORT_ITEMS : "contains"
    REPORTS ||--o{ REPORT_METRICS : "tracks"
    REPORT_TEMPLATES ||--o{ REPORT_SCHEDULES : "used_by"
    
    REPORTS {
        STRING id PK
        STRING title
        TEXT description
        STRING report_type
        STRING status
        STRING file_path
        JSON metadata_json
        TIMESTAMP created_at
        TIMESTAMP updated_at
        TIMESTAMP completed_at
    }
    
    REPORT_ITEMS {
        STRING id PK
        STRING report_id FK
        STRING item_type
        STRING title
        JSON content
        INTEGER order_index
        TIMESTAMP created_at
    }
    
    REPORT_TEMPLATES {
        STRING id PK
        STRING name
        TEXT description
        STRING template_type
        JSON config
        INTEGER is_active
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    
    REPORT_SCHEDULES {
        STRING id PK
        STRING template_id FK
        STRING name
        STRING schedule_type
        JSON schedule_config
        JSON recipients
        INTEGER is_active
        TIMESTAMP last_run
        TIMESTAMP next_run
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    
    REPORT_METRICS {
        STRING id PK
        STRING metric_name
        FLOAT metric_value
        STRING metric_unit
        STRING report_id FK
        TIMESTAMP timestamp
        JSON metadata_json
    }
```

### ⚙️ Management Service Database

```mermaid
erDiagram
    MANAGEMENT_SERVICES ||--o{ MANAGEMENT_SERVICE_INSTANCES : "has"
    
    MANAGEMENT_SERVICES {
        VARCHAR id PK
        STRING name
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
    
    MANAGEMENT_SERVICE_INSTANCES {
        VARCHAR id PK
        STRING host
        INTEGER port
        STRING endpoint
        BOOLEAN status
        STRING skeleton_path
        VARCHAR service_id FK
        STRING version
        JSONB metadata_json
        TIMESTAMP last_heartbeat
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }
```

### 🔗 Webhook Service Database (MongoDB)

```mermaid
erDiagram
    PAYPAL_WEBHOOK ||--o{ EVENTS_PUBLISHED : "has"
    SEPAY_WEBHOOK ||--o{ EVENTS_PUBLISHED : "has"
    
    PAYPAL_WEBHOOK {
        STRING webhookId PK
        STRING eventType
        STRING resourceType
        STRING resourceId
        MIXED rawPayload
        STRING status
        OBJECT paypalData
        STRING idempotencyKey UK
        BOOLEAN signatureVerified
        DATE createdAt
        DATE updatedAt
    }
    
    SEPAY_WEBHOOK {
        STRING webhookId PK
        STRING eventType
        STRING resourceType
        STRING resourceId
        MIXED rawPayload
        STRING status
        OBJECT sepayData
        STRING idempotencyKey UK
        BOOLEAN signatureVerified
        DATE createdAt
        DATE updatedAt
    }
    
    EVENTS_PUBLISHED {
        STRING service
        STRING topic
        MIXED eventData
        DATE publishedAt
        STRING messageId
        BOOLEAN success
        STRING errorMessage
    }
```

### 🚫 Stateless Services (No Database)

- **Control Service**: Sử dụng file system để lưu trữ Prophet ML models (Joblib)
- **Public Service**: Chỉ sử dụng Redis cache, không có database riêng
- **Scheduler Service**: Sử dụng in-memory job registry, không có persistence

### 📊 Database Distribution Across Services

| Service | Database Type | Primary Tables/Collections | Purpose |
|---------|---------------|---------------------------|---------|
| **API Gateway** | PostgreSQL | Services, ServiceInstances, APIKeys | Service registry, load balancing, API key management |
| **Auth Service** | PostgreSQL | Users, Keys | User authentication, JWT tokens, API keys |
| **User Service** | PostgreSQL | Admins, Passengers, Staff | User profile management, role-based data |
| **Transport Service** | PostgreSQL | Stations, Routes, RouteStations, Trains, Trips, Stops | Metro infrastructure, scheduling, route management |
| **Ticket Service** | PostgreSQL | Tickets, Fares, Promotions, TransitPasses, PassengerDiscounts | Ticket lifecycle, pricing, promotions |
| **Payment Service** | PostgreSQL | Payments, Transactions, PaymentLogs | Payment processing, transaction tracking |
| **Notification Service** | PostgreSQL | Emails, SMS | Notification delivery tracking, audit trail |
| **Report Service** | PostgreSQL | Reports, ReportItems, ReportTemplates, ReportSchedules, ReportMetrics | Report generation, analytics, scheduling |
| **Management Service** | PostgreSQL | Services, ServiceInstances | Service management, monitoring |
| **Webhook Service** | MongoDB | PayPal_Webhook, Sepay_Webhook, Events_Published | Webhook processing, event audit |
| **Control Service** | File System | Prophet Models (Joblib) | AI model storage, no database |
| **Public Service** | Redis Cache | Transport/Ticket data cache | Data aggregation, caching layer |
| **Scheduler Service** | In-Memory | Job Registry (Map) | Cron job management, no persistence |

### 🔗 Key Relationships & Data Flow

1. **User Management Flow**: `Users` (Auth) → `Admins/Passengers/Staff` (User Service)
2. **Ticket Lifecycle**: `Passengers` → `Tickets` → `Payments` → `Notifications`
3. **Transport System**: `Stations` → `Routes` → `Trips` → `Stops`
4. **Service Discovery**: `Services` → `ServiceInstances` (API Gateway)
5. **Event Processing**: Kafka events → Service databases → Audit logs
6. **Report Generation**: Service data → `Reports` → Analytics

### 🏗️ Database Architecture Patterns

- **Multi-Database Strategy**: PostgreSQL for transactional data, MongoDB for document storage, Redis for caching
- **Event Sourcing**: Critical business events stored as audit logs
- **CQRS**: Separate read/write models for performance optimization
- **Database per Service**: Each service owns its data domain
- **Eventual Consistency**: Cross-service data synchronization via Kafka events

---

**Metro Backend Architecture** represents a modern, production-ready microservices platform designed for high availability, scalability, and maintainability in the urban transit domain.
