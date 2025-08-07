# Promotion Service - SOLID Principles Implementation

This directory contains a complete promotion management system refactored to follow SOLID principles.

## Architecture Overview

### SOLID Principles Applied

#### 1. Single Responsibility Principle (SRP)
Each class has one reason to change:
- **PromotionRepository**: Only handles data access operations
- **PromotionValidator**: Only handles validation and application logic
- **PromotionService**: Orchestrates operations using dependency injection

#### 2. Open/Closed Principle (OCP)
The system is open for extension but closed for modification:
- New validator types can be added without modifying existing code
- New repository implementations can be added without changing services
- New promotion validation strategies can be implemented by extending interfaces

#### 3. Liskov Substitution Principle (LSP)
All implementations properly extend their interfaces:
- Validators can be substituted without breaking the system
- Repository implementations can be swapped seamlessly
- Service implementations can be replaced with mock implementations for testing

#### 4. Interface Segregation Principle (ISP)
Interfaces are specific to client needs:
- **IPromotionService**: CRUD operations for promotion management
- **IPromotionValidator**: Validation and application operations

#### 5. Dependency Inversion Principle (DIP)
High-level modules don't depend on low-level modules:
- Both depend on abstractions (interfaces)
- Dependency injection is used throughout
- Factory pattern manages object creation

## Directory Structure

```
promotion/
├── interfaces/           # Abstract interfaces
│   ├── IPromotionService.js
│   └── IPromotionValidator.js
├── repositories/         # Data access layer
│   └── PromotionRepository.js
├── validators/          # Validation and application logic
│   └── PromotionValidator.js
├── PromotionService.js  # Main orchestration service
├── PromotionServiceFactory.js # Dependency injection factory
├── index.js            # Module exports
└── README.md           # This file
```

## Usage Examples

### Basic Usage (Backward Compatible)
```javascript
const promotionService = require('./promotion');
// Use as before - all existing methods work
```

### Advanced Usage with Dependency Injection
```javascript
const { PromotionServiceFactory } = require('./promotion');

// Create a configured service
const promotionService = PromotionServiceFactory.createPromotionService();

// Use the service
const promotions = await promotionService.getAllPromotions();
```

### Using Individual Components
```javascript
const { 
    PromotionRepository, 
    PromotionValidator 
} = require('./promotion');

// Create individual components
const repository = new PromotionRepository();
const validator = new PromotionValidator(repository);
```

### Testing with Mock Implementations
```javascript
const { IPromotionValidator } = require('./promotion');

// Create a mock validator for testing
class MockPromotionValidator extends IPromotionValidator {
    async validatePromotion(code, validationData) {
        return { valid: true, promotion: { code, discountAmount: 1000 } };
    }
    // ... implement other methods
}
```

## Key Benefits

1. **Maintainability**: Each class has a single responsibility
2. **Testability**: Easy to mock dependencies and test individual components
3. **Extensibility**: New validation strategies can be added easily
4. **Flexibility**: Components can be swapped or reconfigured
5. **Backward Compatibility**: Existing code continues to work

## Migration Guide

### From Old Monolithic Service
```javascript
// Old way
const PromotionService = require('./promotion.service');
const promotionService = new PromotionService();

// New way (same interface)
const { promotionService } = require('./promotion');
// OR
const { createPromotionService } = require('./promotion');
const promotionService = createPromotionService();
```

### Adding New Validator Types
```javascript
const { IPromotionValidator } = require('./promotion');

class DiscountPromotionValidator extends IPromotionValidator {
    async validateDiscountPromotion(code, discountType) {
        // Implementation
    }
    
    // Implement other required methods or throw errors for unsupported operations
    async validatePromotion() {
        throw new Error('Not supported in DiscountPromotionValidator');
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
