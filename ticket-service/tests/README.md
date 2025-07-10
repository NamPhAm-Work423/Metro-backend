# Ticket Service Test Suite

This test suite provides comprehensive coverage for the ticket service, following the same patterns as the user service tests.

## Test Structure

```
tests/
├── setup.js                          # Global test configuration
├── unit/                             # Unit tests
│   └── controllers/                  # Controller tests
│       ├── ticket.controller.test.js # Ticket controller tests
│       ├── fare.controller.test.js   # Fare controller tests
│       └── promotion.controller.test.js # Promotion controller tests
└── integration/                      # Integration tests
    └── routes/                       # Route tests
        ├── ticket.route.test.js      # Ticket route tests
        ├── fare.route.test.js        # Fare route tests
        └── promotion.route.test.js   # Promotion route tests
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Coverage

The test suite covers:

### Unit Tests
- **Ticket Controller**: 
  - Short-term ticket creation (oneway/return)
  - Long-term ticket creation (passes)
  - Ticket retrieval and management
  - Passenger validation
  - Error handling

- **Fare Controller**:
  - Fare CRUD operations
  - Station-based fare calculation
  - Route-specific fare queries
  - Fare statistics

- **Promotion Controller**:
  - Promotion CRUD operations
  - Code validation
  - Price application
  - Statistics

### Integration Tests
- **Ticket Routes**: All API endpoints with proper HTTP methods
- **Fare Routes**: Public and admin fare management endpoints
- **Promotion Routes**: Public validation and admin management

## Key Features Tested

### Short-Term Tickets
- ✅ Oneway ticket creation with station-based pricing
- ✅ Return ticket creation (1.5x multiplier)
- ✅ Station count calculation (1-5, 6-10, 11-15, 16-20, 21-25, >25)
- ✅ Passenger type detection and discounts
- ✅ Promotion code application
- ✅ Route switching logic

### Long-Term Tickets
- ✅ Pass creation (day/week/month/year/lifetime)
- ✅ TransitPass model pricing
- ✅ Passenger type discounts (child 50%, teen 30%, senior 20%)
- ✅ Validity period calculation
- ✅ Unlimited travel validation

### Fare System
- ✅ Station-based fare calculation
- ✅ Trip type multipliers
- ✅ Route-specific pricing
- ✅ Active fare management

### Promotion System
- ✅ Code validation
- ✅ Discount calculation (percentage, fixed, BOGO)
- ✅ Usage tracking
- ✅ Applicability checks

## Mock Strategy

Tests use comprehensive mocking to:
- **Services**: Mock all service layers to isolate controller logic
- **Middleware**: Bypass authentication for focused testing
- **Database**: Avoid database dependencies in unit tests
- **External APIs**: Mock transport service calls

## Environment Setup

Tests automatically configure:
- Test database settings
- Mocked environment variables
- Disabled console output (for cleaner test runs)
- Jest timeout configuration (10 seconds)

## Test Data

Tests use realistic mock data:
- Valid UUIDs for IDs
- Realistic Vietnamese prices (VND)
- Proper date ranges
- Valid station/route relationships

## Error Scenarios

Tests cover error handling for:
- Missing passenger information
- Invalid promotion codes
- Route/station not found
- Validation errors
- Database constraints

## Best Practices

The test suite follows:
- **Isolation**: Each test is independent
- **Mocking**: Services are mocked at the boundary
- **Coverage**: All major code paths are tested
- **Realism**: Mock data reflects real-world scenarios
- **Maintainability**: Clear test structure and naming

## Running in CI/CD

These tests are designed to run in automated environments:
- No external dependencies
- Fast execution
- Clear pass/fail indicators
- Coverage reporting

## Extending Tests

When adding new features:
1. Add unit tests for new controller methods
2. Add integration tests for new routes
3. Update mock data as needed
4. Maintain test isolation
5. Follow existing naming conventions 