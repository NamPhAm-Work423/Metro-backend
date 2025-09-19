# 🎯 Tracing Controllers Implementation Guide

## Applied Pattern Summary

### ✅ Completed Controllers:
- **API Gateway**: routing.controller.js (useService, checkServiceHealth)
- **User Service**: passenger.controller.js (getAllPassengers, getPassengerById, updatePassenger, etc.)
- **Ticket Service**: 
  - ticket.controller.js (createShortTermTicket, getMyTickets)
  - fare.controller.js (createFare, getAllFares)

## 📋 Template for Remaining Controllers

### 1. Add Required Imports
```javascript
// Add to the top of each controller file
const { addCustomSpan } = require('../tracing');
// Update logger import if not using traceInfo/traceError helpers
const { logger } = require('../config/logger'); 
```

### 2. Wrap Methods with Tracing

#### Basic Pattern:
```javascript
methodName = asyncErrorHandler(async (req, res, next) => {
    await addCustomSpan('service.operation-name', async (span) => {
        // Set initial span attributes
        span.setAttributes({
            'operation.type': 'create|read|update|delete',
            'operation.entity': 'entity_name',
            'operation.scope': 'single|all|user_specific',
            'request.authenticated': !!req.user,
            'user.id': req.user?.id || 'unknown'
        });

        try {
            // Log start of operation
            logger.traceInfo('Operation description', {
                // relevant data
                requestedBy: req.user?.id
            });

            // Business logic with nested spans
            const result = await addCustomSpan('service.nested-operation', async (nestedSpan) => {
                nestedSpan.setAttributes({
                    'nested.specific': 'attributes'
                });
                
                const serviceResult = await someService.doSomething();
                
                nestedSpan.setAttributes({
                    'nested.success': !!serviceResult,
                    'nested.result_id': serviceResult?.id
                });
                
                return serviceResult;
            });

            // Set success attributes
            span.setAttributes({
                'operation.success': true,
                'http.status_code': 200, // or appropriate code
                // other success attributes
            });

            logger.traceInfo('Operation completed successfully', {
                // result data
            });

            return res.status(200).json({
                success: true,
                message: 'Success message',
                data: result
            });
        } catch (error) {
            // Error handling with tracing
            span.recordException(error);
            span.setAttributes({
                'operation.success': false,
                'error.type': error.constructor.name,
                'error.message': error.message,
                'http.status_code': 500
            });

            logger.traceError('Operation failed', error, {
                // error context
            });

            return res.status(500).json({
                success: false,
                message: error.message,
                error: 'INTERNAL_ERROR_CODE'
            });
        }
    });
});
```

## 🎯 Remaining Controllers to Implement

### Ticket Service - Remaining Methods:
- **ticket.controller.js**:
  - `createLongTermTicket` (similar to createShortTermTicket)
  - `getAllTickets` (admin function)
  - `getTicketById` (single ticket lookup)
  - `getMyActiveTickets` (user active tickets)
  - `getMyInactiveTickets` (user inactive tickets)
  - `getMyCancelledTickets` (user cancelled tickets)
  - `getMyExpiredTickets` (user expired tickets)
  - `getTicket` (general ticket lookup)

- **promotion.controller.js**:
  - `createPromotion`
  - `getAllPromotions` 
  - `getPromotionById`
  - `updatePromotion`
  - `deletePromotion`
  - `getActivePromotions`

- **transitPass.controller.js**:
  - `createTransitPass`
  - `getAllTransitPasses`
  - `getTransitPassById`
  - `updateTransitPass`
  - `deleteTransitPass`

- **passengerDiscount.controller.js**:
  - `createPassengerDiscount`
  - `getAllPassengerDiscounts`
  - `getPassengerDiscountById`
  - `updatePassengerDiscount`
  - `deletePassengerDiscount`

- **fare.controller.js** - Remaining Methods:
  - `getAllActiveFares`
  - `getFareById`
  - `updateFare`
  - `deleteFare`
  - `getFareByRoute`

### Other Services (Apply Same Pattern):
- **Payment Service**: All payment-related operations
- **Transport Service**: Route and station management
- **Public Service**: Public API endpoints
- **Auth Service**: Authentication operations
- **Notification Service**: Email/SMS operations
- **Webhook Service**: Webhook handling

## 🔍 Key Attributes to Include

### Common Span Attributes:
```javascript
{
    // Operation metadata
    'operation.type': 'create|read|update|delete',
    'operation.entity': 'ticket|fare|promotion|user|payment',
    'operation.scope': 'single|all|user_specific',
    
    // Request context
    'request.authenticated': !!req.user,
    'user.id': req.user?.id || 'unknown',
    'user.role': req.user?.role || 'unknown',
    'request.ip': req.ip,
    
    // HTTP context
    'http.method': req.method,
    'http.url': req.originalUrl,
    'http.status_code': res.statusCode,
    
    // Business context (customize per controller)
    'entity.id': entityId,
    'entity.type': entityType,
    'query.has_filters': Object.keys(req.query || {}).length > 0,
    
    // Results
    'operation.success': true|false,
    'response.count': results.length,
    'response.found': results.length > 0,
    
    // Errors
    'error.type': error.constructor.name,
    'error.message': error.message
}
```

### Database Operation Spans:
```javascript
await addCustomSpan('db.operation', async (dbSpan) => {
    dbSpan.setAttributes({
        'db.operation': 'SELECT|INSERT|UPDATE|DELETE',
        'db.table': 'table_name',
        'db.query.type': 'find_all|find_by_id|create|update',
        'db.query.entity_id': entityId
    });
    
    const result = await service.databaseOperation();
    
    dbSpan.setAttributes({
        'db.result.count': result.length || (result ? 1 : 0),
        'db.result.found': !!result,
        'db.query.success': true
    });
    
    return result;
});
```

### Cache Operation Spans:
```javascript
await addCustomSpan('cache.operation', async (cacheSpan) => {
    cacheSpan.setAttributes({
        'cache.operation': 'get|set|delete',
        'cache.source': 'redis|memory',
        'cache.key': cacheKey
    });
    
    const result = await cacheService.get(key);
    
    cacheSpan.setAttributes({
        'cache.hit': !!result,
        'cache.found': !!result
    });
    
    return result;
});
```

### External API Call Spans:
```javascript
await addCustomSpan('external.api.call', async (apiSpan) => {
    apiSpan.setAttributes({
        'http.method': 'GET|POST|PUT|DELETE',
        'http.url': apiEndpoint,
        'external.service': 'payment-gateway|notification-service',
        'external.operation': 'process_payment|send_email'
    });
    
    const response = await axios.post(apiEndpoint, data);
    
    apiSpan.setAttributes({
        'http.status_code': response.status,
        'external.success': response.status < 400,
        'response.size': JSON.stringify(response.data).length
    });
    
    return response;
});
```

## 📝 Implementation Checklist

For each controller method:

- [ ] Add `addCustomSpan` wrapper
- [ ] Set initial span attributes (operation type, entity, scope)
- [ ] Add structured logging with `logger.traceInfo`
- [ ] Wrap service calls with nested spans
- [ ] Add cache/db operation spans where applicable
- [ ] Set success attributes on completion
- [ ] Add proper error handling with `span.recordException`
- [ ] Set error attributes on failure
- [ ] Use `logger.traceError` for error logging
- [ ] Test the implementation

## 🎯 Priority Implementation Order:

1. **High Priority** (most used endpoints):
   - Ticket creation/retrieval
   - User authentication
   - Payment processing
   - Route information

2. **Medium Priority**:
   - Promotion management
   - Fare management
   - Notification sending

3. **Low Priority**:
   - Admin functions
   - Reporting endpoints
   - Configuration management

With this pattern established across your main services, you'll have comprehensive end-to-end tracing from API Gateway → Service → Database → External APIs! 🚀

