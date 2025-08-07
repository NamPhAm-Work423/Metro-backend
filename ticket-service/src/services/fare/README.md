# Fare Service - SOLID Principles Implementation

This directory contains a complete fare management system refactored to follow SOLID principles.

## Architecture Overview

### SOLID Principles Applied

#### 1. Single Responsibility Principle (SRP)
Each class has one reason to change:
- **FareRepository**: Only handles data access operations
- **StationService**: Only handles station-related operations
- **StationBasedFareCalculator**: Only handles station-based fare calculations
- **PassBasedFareCalculator**: Only handles pass-based fare calculations
- **MultiRouteFareCalculator**: Only handles multi-route fare calculations
- **FareService**: Orchestrates operations using dependency injection

#### 2. Open/Closed Principle (OCP)
The system is open for extension but closed for modification:
- New calculator types can be added without modifying existing code
- New repository implementations can be added without changing services
- New fare calculation strategies can be implemented by extending interfaces

#### 3. Liskov Substitution Principle (LSP)
All implementations properly extend their interfaces:
- Calculators can be substituted without breaking the system
- Repository implementations can be swapped seamlessly
- Service implementations can be replaced with mock implementations for testing

#### 4. Interface Segregation Principle (ISP)
Interfaces are specific to client needs:
- **IFareService**: CRUD operations for fare management
- **IFareCalculator**: Calculation operations for different fare types
- **IStationService**: Station-related operations

#### 5. Dependency Inversion Principle (DIP)
High-level modules don't depend on low-level modules:
- Both depend on abstractions (interfaces)
- Dependency injection is used throughout
- Factory pattern manages object creation

## Directory Structure

```
fare/
├── interfaces/           # Abstract interfaces
│   ├── IFareService.js
│   ├── IFareCalculator.js
│   └── IStationService.js
├── repositories/         # Data access layer
│   └── FareRepository.js
├── services/            # Business logic services
│   └── StationService.js
├── calculators/         # Fare calculation strategies
│   ├── StationBasedFareCalculator.js
│   ├── PassBasedFareCalculator.js
│   └── MultiRouteFareCalculator.js
├── FareService.js       # Main orchestration service
├── FareServiceFactory.js # Dependency injection factory
├── index.js            # Module exports
└── README.md           # This file
```

## Usage Examples

### Basic Usage (Backward Compatible)
```javascript
const fareService = require('./fare');
// Use as before - all existing methods work
```

### Advanced Usage with Dependency Injection
```javascript
const { FareServiceFactory } = require('./fare');

// Create a configured service
const fareService = FareServiceFactory.createFareService();

// Use the service
const fares = await fareService.getAllFares();
```

### Using Individual Components
```javascript
const { 
    FareRepository, 
    StationService, 
    StationBasedFareCalculator 
} = require('./fare');

// Create individual components
const repository = new FareRepository();
const stationService = new StationService();
const calculator = new StationBasedFareCalculator(repository, stationService);
```

### Testing with Mock Implementations
```javascript
const { IFareCalculator } = require('./fare');

// Create a mock calculator for testing
class MockFareCalculator extends IFareCalculator {
    async calculateSinglePassengerFare() {
        return { basePrice: 10000, currency: 'VND' };
    }
    // ... implement other methods
}
```

## Key Benefits

1. **Maintainability**: Each class has a single responsibility
2. **Testability**: Easy to mock dependencies and test individual components
3. **Extensibility**: New fare calculation strategies can be added easily
4. **Flexibility**: Components can be swapped or reconfigured
5. **Backward Compatibility**: Existing code continues to work

## Migration Guide

### From Old Monolithic Service
```javascript
// Old way
const FareService = require('./fare.service');
const fareService = new FareService();

// New way (same interface)
const { fareService } = require('./fare');
// OR
const { createFareService } = require('./fare');
const fareService = createFareService();
```

### Adding New Calculator Types
```javascript
const { IFareCalculator } = require('./fare');

class DiscountFareCalculator extends IFareCalculator {
    async calculateDiscountFare(routeId, discountType) {
        // Implementation
    }
    
    // Implement other required methods or throw errors for unsupported operations
    async calculateSinglePassengerFare() {
        throw new Error('Not supported in DiscountFareCalculator');
    }
}
```

## Performance Considerations

- **Lazy Loading**: Components are created only when needed
- **Caching**: Repository layer can implement caching strategies
- **Connection Pooling**: Database connections are managed efficiently
- **Async Operations**: All operations are properly async/await

## Error Handling

All components follow consistent error handling patterns:
- Logging with structured data
- Proper error propagation
- Meaningful error messages
- Graceful fallbacks where appropriate

## Contributing

When adding new features:
1. Follow the existing interface patterns
2. Add appropriate tests
3. Update documentation
4. Maintain backward compatibility
5. Follow SOLID principles
