const { body, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation errors',
            errors: errors.array()
        });
    }
    next();
};

/**
 * Validation rules for service registration
 */
const validateService = [
    body('name')
        .isLength({ min: 3, max: 50 })
        .withMessage('Service name must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9-_]+$/)
        .withMessage('Service name can only contain alphanumeric characters, hyphens, and underscores'),
    
    body('path')
        .isLength({ min: 1 })
        .withMessage('Service path is required')
        .matches(/^\//)
        .withMessage('Service path must start with /'),
    
    body('timeout')
        .optional()
        .isInt({ min: 1000, max: 30000 })
        .withMessage('Timeout must be between 1000 and 30000 milliseconds'),
    
    body('retries')
        .optional()
        .isInt({ min: 0, max: 5 })
        .withMessage('Retries must be between 0 and 5'),
    
    body('circuitBreaker.enabled')
        .optional()
        .isBoolean()
        .withMessage('Circuit breaker enabled must be a boolean'),
    
    body('circuitBreaker.threshold')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Circuit breaker threshold must be between 1 and 100'),
    
    body('loadBalancer.strategy')
        .optional()
        .isIn(['round-robin', 'weighted-round-robin'])
        .withMessage('Load balancer strategy must be round-robin or weighted-round-robin'),
    
    body('authentication.required')
        .optional()
        .isBoolean()
        .withMessage('Authentication required must be a boolean'),
    
    body('rateLimit.enabled')
        .optional()
        .isBoolean()
        .withMessage('Rate limit enabled must be a boolean'),
    
    body('rateLimit.requests')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Rate limit requests must be between 1 and 1000'),
    
    handleValidationErrors
];

/**
 * Validation rules for service instance registration
 */
const validateInstance = [
    body('host')
        .isLength({ min: 1 })
        .withMessage('Host is required')
        .matches(/^[a-zA-Z0-9.-]+$/)
        .withMessage('Host must be a valid hostname or IP address'),
    
    body('port')
        .isInt({ min: 1, max: 65535 })
        .withMessage('Port must be between 1 and 65535'),
    
    body('weight')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Weight must be between 1 and 10'),
    
    handleValidationErrors
];

/**
 * Validation rules for service update
 */
const validateServiceUpdate = [
    body('timeout')
        .optional()
        .isInt({ min: 1000, max: 30000 })
        .withMessage('Timeout must be between 1000 and 30000 milliseconds'),
    
    body('retries')
        .optional()
        .isInt({ min: 0, max: 5 })
        .withMessage('Retries must be between 0 and 5'),
    
    body('circuitBreaker.enabled')
        .optional()
        .isBoolean()
        .withMessage('Circuit breaker enabled must be a boolean'),
    
    body('circuitBreaker.threshold')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Circuit breaker threshold must be between 1 and 100'),
    
    body('loadBalancer.strategy')
        .optional()
        .isIn(['round-robin', 'weighted-round-robin'])
        .withMessage('Load balancer strategy must be round-robin or weighted-round-robin'),
    
    handleValidationErrors
];

module.exports = {
    validateService,
    validateInstance,
    validateServiceUpdate,
    handleValidationErrors
}; 