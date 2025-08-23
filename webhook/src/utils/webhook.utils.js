const crypto = require('crypto');
const { logger } = require('../config/logger');

/**
 * Webhook Utility Functions
 * Common utilities for webhook processing
 */

/**
 * Generate unique request ID for tracking
 * @param {string} prefix - Prefix for the ID
 * @returns {string} - Unique request ID
 */
function generateRequestId(prefix = 'webhook') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate idempotency key from webhook data
 * @param {Object} eventData - Webhook event data
 * @param {Object} headers - Request headers
 * @param {string} provider - Provider name (paypal, stripe, etc.)
 * @returns {string} - Idempotency key
 */
function generateIdempotencyKey(eventData, headers, provider = 'unknown') {
    let keyComponents = [];

    switch (provider.toLowerCase()) {
        case 'paypal':
            keyComponents = [
                provider,
                eventData.id,
                headers['paypal-transmission-id'],
                eventData.event_type,
                eventData.resource?.id
            ];
            break;
        
        default:
            // Generic fallback
            keyComponents = [
                provider,
                eventData.id || JSON.stringify(eventData),
                headers['content-type'] || 'unknown',
                Date.now().toString()
            ];
    }

    const keyData = keyComponents.filter(Boolean).join(':');
    
    return crypto
        .createHash('sha256')
        .update(keyData)
        .digest('hex');
}

/**
 * Validate webhook request structure
 * @param {Object} req - Express request object
 * @param {Array} requiredFields - Required fields in body
 * @param {Array} requiredHeaders - Required headers
 * @returns {Object} - Validation result
 */
function validateWebhookRequest(req, requiredFields = [], requiredHeaders = []) {
    const errors = [];

    // Check body
    if (!req.body) {
        errors.push('Request body is missing');
    } else {
        // Check required fields
        for (const field of requiredFields) {
            if (!req.body[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    // Check headers
    for (const header of requiredHeaders) {
        if (!req.headers[header]) {
            errors.push(`Missing required header: ${header}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Extract client information from request
 * @param {Object} req - Express request object
 * @returns {Object} - Client information
 */
function extractClientInfo(req) {
    return {
        ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        contentType: req.headers['content-type'],
        contentLength: req.headers['content-length'],
        forwardedFor: req.headers['x-forwarded-for'],
        realIp: req.headers['x-real-ip']
    };
}

/**
 * Normalize webhook event type for consistent processing
 * @param {string} eventType - Original event type
 * @param {string} provider - Provider name
 * @returns {string} - Normalized event type
 */
function normalizeEventType(eventType, provider) {
    if (!eventType) return 'unknown';

    const normalized = eventType.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${provider.toLowerCase()}_${normalized}`;
}

/**
 * Create standardized webhook response
 * @param {Object} result - Processing result
 * @param {Object} metadata - Additional metadata
 * @returns {Object} - Standardized response
 */
function createWebhookResponse(result, metadata = {}) {
    const response = {
        success: result.success || false,
        timestamp: new Date().toISOString(),
        ...metadata
    };

    if (result.success) {
        response.status = result.status || 'processed';
        response.message = result.message || 'Webhook processed successfully';
        
        if (result.webhookId) response.webhookId = result.webhookId;
        if (result.eventsPublished) response.eventsPublished = result.eventsPublished;
        if (result.processingTime) response.processingTime = result.processingTime;
    } else {
        response.error = result.error || 'PROCESSING_ERROR';
        response.message = result.message || 'Webhook processing failed';
        
        if (result.details) response.details = result.details;
    }

    return response;
}

/**
 * Sanitize sensitive data from logs
 * @param {Object} data - Data to sanitize
 * @returns {Object} - Sanitized data
 */
function sanitizeForLogging(data) {
    const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'auth',
        'authorization', 'signature', 'cert', 'private'
    ];
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    function sanitizeObject(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const lowerKey = key.toLowerCase();
                
                if (sensitiveFields.some(field => lowerKey.includes(field))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        }
    }
    
    sanitizeObject(sanitized);
    return sanitized;
}

/**
 * Calculate processing time
 * @param {number} startTime - Start timestamp
 * @returns {number} - Processing time in milliseconds
 */
function calculateProcessingTime(startTime) {
    return Date.now() - startTime;
}

/**
 * Check if webhook is from allowed source
 * @param {string} sourceIp - Source IP address
 * @param {Array} allowedIps - Allowed IP addresses/ranges
 * @returns {boolean} - True if allowed
 */
function isAllowedSource(sourceIp, allowedIps = []) {
    if (!allowedIps.length) return true; // No restrictions
    
    // Simple IP matching - can be enhanced with CIDR support
    return allowedIps.includes(sourceIp);
}

module.exports = {
    generateRequestId,
    generateIdempotencyKey,
    validateWebhookRequest,
    extractClientInfo,
    normalizeEventType,
    createWebhookResponse,
    sanitizeForLogging,
    calculateProcessingTime,
    isAllowedSource
};
