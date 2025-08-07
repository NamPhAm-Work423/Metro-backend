# Ticket Service Module

This module provides a comprehensive ticket management system following SOLID principles. The large `ticket.service.js` file has been broken down into smaller, focused services with clear separation of concerns.

## Architecture Overview

The ticket service follows a clean architecture pattern with the following structure:

```
ticket/
├── interfaces/          # Service contracts and interfaces
├── repositories/        # Data access layer
├── services/           # Business logic implementation
├── calculators/        # Complex calculations (if needed)
└── index.js           # Main module exports
```

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
Each service has a single, well-defined responsibility:
- **TicketService**: Main orchestration and ticket creation logic
- **TicketRepository**: Data access and persistence
- **TicketValidatorService**: Ticket validation logic
- **TicketCommunicationService**: Communication (email, SMS, QR codes)
- **TicketPaymentService**: Payment processing and waiting

### 2. Open/Closed Principle (OCP)
The system is open for extension but closed for modification:
- New ticket types can be added by extending existing services
- New validation rules can be added without modifying existing code
- New communication methods can be added to the communication service

### 3. Liskov Substitution Principle (LSP)
All implementations properly implement their interfaces:
- `TicketService` implements `ITicketService`
- `TicketRepository` implements `ITicketRepository`
- `TicketValidatorService` implements `ITicketValidator`

### 4. Interface Segregation Principle (ISP)
Interfaces are focused and specific:
- `ITicketService`: Core ticket operations
- `ITicketRepository`: Data access operations
- `ITicketValidator`: Validation operations

### 5. Dependency Inversion Principle (DIP)
High-level modules depend on abstractions:
- Services depend on interfaces, not concrete implementations
- Dependencies are injected through constructors

## Services Breakdown

### TicketService (Main Service)
- **Responsibility**: Orchestrates ticket creation and management
- **Dependencies**: FareService, Repository, Validator, Communication, Payment
- **Key Methods**:
  - `createShortTermTicket()`: Creates oneway/return tickets
  - `createLongTermTicket()`: Creates pass-based tickets
  - `createGuestTicket()`: Creates tickets for non-registered users

### TicketRepository
- **Responsibility**: Data access and persistence
- **Dependencies**: Sequelize models
- **Key Methods**:
  - `create()`: Create new tickets
  - `findById()`: Find ticket by ID
  - `findAll()`: Find tickets with filters
  - `update()`: Update ticket data
  - `delete()`: Soft delete tickets

### TicketValidatorService
- **Responsibility**: Ticket validation logic
- **Dependencies**: Ticket model
- **Key Methods**:
  - `validateTicket()`: Validate ticket by ID
  - `validateTicketAtGate()`: Validate for entry/exit
  - `isValid()`: Check if ticket is valid
  - `isExpired()`: Check if ticket is expired

### TicketCommunicationService
- **Responsibility**: Communication with users
- **Dependencies**: Ticket model, Fare model, Promotion model
- **Key Methods**:
  - `sendTicketToPhone()`: Send ticket via SMS
  - `sendTicketToEmail()`: Send ticket via email
  - `getTicketWithQR()`: Generate QR code for ticket
  - `generateQRData()`: Generate QR code data

### TicketPaymentService
- **Responsibility**: Payment processing
- **Dependencies**: Ticket model, Kafka events
- **Key Methods**:
  - `processTicketPayment()`: Process ticket payment
  - `waitForPaymentResponse()`: Wait for payment response
  - `payAdditionalFare()`: Handle additional fare payments

## Usage Examples

### Creating a Short-term Ticket
```javascript
const { TicketService } = require('./services/ticket');

const ticketData = {
    passengerId: 'passenger123',
    fromStation: 'station1',
    toStation: 'station2',
    tripType: 'Oneway',
    numAdults: 1,
    paymentMethod: 'vnpay',
    paymentSuccessUrl: 'https://success.com',
    paymentFailUrl: 'https://fail.com'
};

const result = await TicketService.createShortTermTicket(ticketData);
```

### Validating a Ticket
```javascript
const { TicketValidatorService } = require('./services/ticket');

const validation = await TicketValidatorService.validateTicket('ticket123');
if (validation.valid) {
    console.log('Ticket is valid');
} else {
    console.log('Ticket invalid:', validation.reason);
}
```

### Sending Ticket to Email
```javascript
const { TicketCommunicationService } = require('./services/ticket');

await TicketCommunicationService.sendTicketToEmail(
    'ticket123',
    'user@example.com',
    'passenger123'
);
```

## Benefits of This Structure

1. **Maintainability**: Each service has a single responsibility
2. **Testability**: Services can be tested in isolation
3. **Extensibility**: New features can be added without modifying existing code
4. **Reusability**: Services can be reused across different parts of the application
5. **Clarity**: Clear separation of concerns makes the code easier to understand

## Migration from Old Structure

The old `ticket.service.js` file has been broken down into these focused services. To migrate existing code:

1. Replace direct imports of `ticket.service.js` with the new service structure
2. Update method calls to use the appropriate service
3. Use the main `TicketService` for orchestration operations
4. Use specific services for focused operations

## Future Enhancements

- Add caching layer for frequently accessed data
- Implement event-driven architecture for ticket state changes
- Add support for different payment providers
- Implement ticket analytics and reporting
- Add support for bulk operations
