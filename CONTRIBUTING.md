# Contributing to Metro Backend

Thank you for your interest in contributing to the Metro Backend project! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Architecture Guidelines](#architecture-guidelines)
- [Security Guidelines](#security-guidelines)

## Getting Started

### Prerequisites

- **Node.js 18+** (for JavaScript/TypeScript services)
- **Python 3.8+** (for Python services)
- **Docker & Docker Compose v2.0+**
- **Git**
- **PostgreSQL 14+** (for local development)
- **Redis 6+** (for caching)
- **Apache Kafka** (for event streaming)

### Development Environment

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/Metro-backend.git
   cd Metro-backend
   ```

2. **Set up environment variables**
   ```bash
   # Copy environment files for all services
   cp api-gateway/env.example api-gateway/.env
   cp auth-service/env.example auth-service/.env
   cp user-service/env.example user-service/.env
   cp transport-service/env.example transport-service/.env
   cp ticket-service/env.example ticket-service/.env
   cp payment-service/env.example payment-service/.env
   cp public-service/env.example public-service/.env
   ```

3. **Start the development environment**
   ```bash
   docker-compose up --build -d
   ```

## Development Setup

### Service-Specific Setup

#### JavaScript/TypeScript Services
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

#### Python Services
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run in development mode
python src/main.py

# Run tests
pytest

# Run linting
flake8 src/
```

### Database Setup

```bash
# Initialize database
docker-compose exec postgres psql -U postgres -d metro_db -f /docker-entrypoint-initdb.d/init_db.sql

# Run migrations (if applicable)
npm run migrate  # For Node.js services
python manage.py migrate  # For Python services
```

## Code Standards

### JavaScript/TypeScript

#### Code Style
- Use **ESLint** and **Prettier** for code formatting
- Follow **Airbnb JavaScript Style Guide**
- Use **TypeScript** for new services (when applicable)
- Maximum line length: **100 characters**

#### Naming Conventions
```javascript
// Variables and functions: camelCase
const userName = 'john_doe';
const getUserProfile = () => {};

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:8000';

// Classes: PascalCase
class UserService {}

// Files: kebab-case
// user-service.js, auth-controller.js
```

#### File Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route handlers
├── models/          # Data models
├── services/        # Business logic
├── middlewares/     # Express middlewares
├── routes/          # Route definitions
├── utils/           # Utility functions
├── tests/           # Test files
└── index.js         # Entry point
```

### Python

#### Code Style
- Follow **PEP 8** style guide
- Use **Black** for code formatting
- Use **Flake8** for linting
- Maximum line length: **88 characters**

#### Naming Conventions
```python
# Variables and functions: snake_case
user_name = 'john_doe'
def get_user_profile():
    pass

# Constants: UPPER_SNAKE_CASE
API_BASE_URL = 'http://localhost:8000'

# Classes: PascalCase
class UserService:
    pass

# Files: snake_case
# user_service.py, auth_controller.py
```

### General Guidelines

#### Error Handling
```javascript
// JavaScript
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.error('Operation failed:', error);
  throw new CustomError('Operation failed', 500);
}
```

```python
# Python
try:
    result = some_async_operation()
    return result
except Exception as error:
    logger.error(f"Operation failed: {error}")
    raise CustomError("Operation failed", 500)
```

#### Logging
```javascript
// JavaScript
const logger = require('./config/logger');

logger.info('User logged in successfully', { userId: user.id });
logger.error('Database connection failed', { error: error.message });
```

```python
# Python
import logging

logger = logging.getLogger(__name__)
logger.info("User logged in successfully", extra={"user_id": user.id})
logger.error("Database connection failed", extra={"error": str(error)})
```

## Testing Guidelines

### Unit Tests
- Write tests for all business logic
- Use **Jest** for JavaScript/TypeScript
- Use **pytest** for Python
- Aim for **80%+ code coverage**

#### JavaScript Example
```javascript
// user.service.test.js
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const result = await userService.createUser(userData);
      
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(userData.name);
    });

    it('should throw error for duplicate email', async () => {
      const userData = { name: 'John', email: 'existing@example.com' };
      
      await expect(userService.createUser(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

#### Python Example
```python
# test_user_service.py
import pytest
from services.user_service import UserService

class TestUserService:
    def test_create_user_success(self):
        user_data = {"name": "John", "email": "john@example.com"}
        result = UserService.create_user(user_data)
        
        assert result.id is not None
        assert result.name == user_data["name"]
    
    def test_create_user_duplicate_email(self):
        user_data = {"name": "John", "email": "existing@example.com"}
        
        with pytest.raises(ValueError, match="Email already exists"):
            UserService.create_user(user_data)
```

### Integration Tests
- Test API endpoints
- Test database operations
- Test Kafka event publishing/consuming
- Test gRPC communication

### Test Commands
```bash
# JavaScript/TypeScript
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage

# Python
pytest                     # Run all tests
pytest -v                  # Verbose output
pytest --cov=src          # Run with coverage
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Commit Message Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples
```bash
# Feature
git commit -m "feat(auth): add JWT token refresh endpoint"

# Bug fix
git commit -m "fix(user): resolve user profile update issue"

# Documentation
git commit -m "docs: update API documentation"

# Refactor
git commit -m "refactor(transport): optimize route calculation algorithm"

# Test
git commit -m "test(ticket): add unit tests for fare calculation"
```

## Pull Request Process

### Before Submitting a PR

1. **Ensure your code follows the standards**
   ```bash
   npm run lint
   npm run format
   npm test
   ```

2. **Update documentation**
   - Update README if needed
   - Update API documentation
   - Update changelog

3. **Test your changes**
   - Run all tests
   - Test manually in development environment
   - Check for any breaking changes

### PR Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows the style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Corresponding changes to documentation made
- [ ] No new warnings generated
- [ ] Tests added for new functionality
- [ ] All tests pass

## Related Issues
Closes #(issue number)
```

### PR Review Process

1. **Automated Checks**
   - Linting passes
   - Tests pass
   - Code coverage maintained
   - No security vulnerabilities

2. **Manual Review**
   - Code quality review
   - Architecture review
   - Security review
   - Performance review

3. **Approval**
   - At least 2 approvals required
   - All comments resolved
   - CI/CD pipeline passes

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
## Bug Description
Clear and concise description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Environment
- OS: [e.g. Windows 10, macOS 12]
- Node.js Version: [e.g. 18.15.0]
- Docker Version: [e.g. 20.10.0]

## Additional Context
Add any other context about the problem here
```

### Feature Requests

Use the feature request template:

```markdown
## Feature Description
Clear and concise description of the feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Description of the proposed solution

## Alternative Solutions
Any alternative solutions you've considered

## Additional Context
Add any other context or screenshots about the feature request
```

## Architecture Guidelines

### Microservices Principles

1. **Single Responsibility**
   - Each service should have one clear purpose
   - Keep services focused and cohesive

2. **Loose Coupling**
   - Services should communicate through well-defined APIs
   - Use events for asynchronous communication
   - Avoid direct database sharing between services

3. **High Cohesion**
   - Related functionality should be in the same service
   - Keep related data and operations together

### Communication Patterns

#### Synchronous Communication
```javascript
// Use gRPC for service-to-service communication
const grpcClient = new FareServiceClient('localhost:50051');
const fare = await grpcClient.calculateFare(request);
```

#### Asynchronous Communication
```javascript
// Use Kafka for event-driven communication
await producer.send({
  topic: 'user-events',
  messages: [{ value: JSON.stringify(userEvent) }]
});
```

### Data Management

#### Database Per Service
- Each service owns its data
- Use database per service pattern
- Implement eventual consistency where needed

#### Caching Strategy
```javascript
// Use Redis for distributed caching
const cachedData = await redis.get(key);
if (!cachedData) {
  const data = await fetchFromDatabase();
  await redis.setex(key, 3600, JSON.stringify(data));
  return data;
}
return JSON.parse(cachedData);
```

## Security Guidelines

### Authentication & Authorization

1. **JWT Tokens**
   - Use secure token generation
   - Implement proper token validation
   - Set appropriate expiration times

2. **Role-Based Access Control**
   ```javascript
   // Example middleware
   const requireRole = (role) => (req, res, next) => {
     if (req.user.role !== role) {
       return res.status(403).json({ error: 'Insufficient permissions' });
     }
     next();
   };
   ```

### Input Validation

```javascript
// Use express-validator for input validation
const { body, validationResult } = require('express-validator');

const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

### Security Headers

```javascript
// Use Helmet.js for security headers
const helmet = require('helmet');
app.use(helmet());
```

### Rate Limiting

```javascript
// Implement rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Getting Help

- **Documentation**: Check the README and API documentation
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for help in pull requests

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) to keep our approachable and respectable.

---

Thank you for contributing to Metro Backend! 🚇 