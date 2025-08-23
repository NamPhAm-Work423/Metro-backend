const { logger } = require('../config/logger');

/**
 * Authorization Middleware
 * Handles webhook authorization and IP filtering
 * Following Middleware Pattern for Express.js
 */

/**
 * PayPal IP whitelist for webhook sources
 * These are official PayPal webhook IPs - update as needed
 */
const PAYPAL_WEBHOOK_IPS = [
    '173.0.81.1/32',
    '173.0.81.33/32', 
    '173.0.81.65/32',
    '173.0.81.97/32',
    '173.0.81.129/32',
    '173.0.81.161/32',
    '173.0.81.193/32',
    '173.0.81.225/32',
    '64.4.250.1/32',
    '64.4.250.33/32',
    '64.4.250.65/32',
    '64.4.250.97/32',
    '64.4.250.129/32',
    '64.4.250.161/32',
    '64.4.250.193/32',
    '64.4.250.225/32',
    // Sandbox IPs
    '173.0.82.126/32',
    '173.0.82.129/32'
];

/**
 * Generic webhook authorization middleware
 * @param {Object} options - Authorization options
 * @returns {Function} - Express middleware function
 */
function webhookAuthorization(options = {}) {
    const {
        allowedIps = [],
        requireApiKey = false,
        apiKeyHeader = 'x-api-key',
        skipInDevelopment = true
    } = options;

    return (req, res, next) => {
        const startTime = Date.now();
        const clientIp = getClientIp(req);
        const requestId = req.headers['x-request-id'] || `webhook-${Date.now()}`;

        // Skip authorization in development if configured
        if (skipInDevelopment && process.env.NODE_ENV === 'development') {
            logger.info('Webhook authorization skipped in development', {
                requestId,
                clientIp,
                path: req.path
            });
            return next();
        }

        try {
            // IP-based authorization
            if (allowedIps.length > 0 && !isIpAllowed(clientIp, allowedIps)) {
                logger.warn('Webhook request from unauthorized IP', {
                    requestId,
                    clientIp,
                    path: req.path,
                    userAgent: req.headers['user-agent']
                });

                return res.status(403).json({
                    success: false,
                    error: 'UNAUTHORIZED_IP',
                    message: 'Request from unauthorized IP address',
                    requestId
                });
            }

            // API Key authorization
            if (requireApiKey) {
                const apiKey = req.headers[apiKeyHeader];
                const expectedApiKey = process.env.WEBHOOK_API_KEY;

                if (!apiKey || !expectedApiKey || apiKey !== expectedApiKey) {
                    logger.warn('Webhook request with invalid API key', {
                        requestId,
                        clientIp,
                        hasApiKey: !!apiKey,
                        path: req.path
                    });

                    return res.status(401).json({
                        success: false,
                        error: 'INVALID_API_KEY',
                        message: 'Invalid or missing API key',
                        requestId
                    });
                }
            }

            const authTime = Date.now() - startTime;
            logger.debug('Webhook authorization passed', {
                requestId,
                clientIp,
                authTime,
                path: req.path
            });

            next();

        } catch (error) {
            logger.error('Webhook authorization error', {
                requestId,
                clientIp,
                error: error.message,
                stack: error.stack,
                path: req.path
            });

            res.status(500).json({
                success: false,
                error: 'AUTHORIZATION_ERROR',
                message: 'Internal authorization error',
                requestId
            });
        }
    };
}

/**
 * PayPal-specific authorization middleware
 * Validates requests are coming from PayPal's webhook IPs
 */
function paypalWebhookAuthorization() {
    return webhookAuthorization({
        allowedIps: PAYPAL_WEBHOOK_IPS,
        requireApiKey: false,
        skipInDevelopment: true
    });
}

/**
 * Extract client IP from request
 * @param {Object} req - Express request object
 * @returns {string} - Client IP address
 */
function getClientIp(req) {
    // Try various headers to get real IP
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] ||
           req.headers['x-client-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
}

/**
 * Check if IP is allowed
 * @param {string} clientIp - Client IP address
 * @param {Array} allowedIps - Array of allowed IPs/CIDR ranges
 * @returns {boolean} - True if IP is allowed
 */
function isIpAllowed(clientIp, allowedIps) {
    if (!clientIp || clientIp === 'unknown') return false;
    
    for (const allowedIp of allowedIps) {
        if (allowedIp.includes('/')) {
            // CIDR range
            if (isIpInCidr(clientIp, allowedIp)) {
                return true;
            }
        } else {
            // Exact IP match
            if (clientIp === allowedIp) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if IP is in CIDR range
 * Basic CIDR checking - can be enhanced with a proper library
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR range (e.g., "192.168.1.0/24")
 * @returns {boolean} - True if IP is in range
 */
function isIpInCidr(ip, cidr) {
    try {
        const [range, bits] = cidr.split('/');
        const mask = ~(2 ** (32 - parseInt(bits)) - 1);
        
        const ipNum = ipToNumber(ip);
        const rangeNum = ipToNumber(range);
        
        return (ipNum & mask) === (rangeNum & mask);
    } catch (error) {
        logger.error('CIDR check error', { ip, cidr, error: error.message });
        return false;
    }
}

/**
 * Convert IP address to number
 * @param {string} ip - IP address
 * @returns {number} - IP as number
 */
function ipToNumber(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Create request context middleware
 * Adds useful request metadata for webhook processing
 */
function createRequestContext() {
    return (req, res, next) => {
        req.webhookContext = {
            requestId: req.headers['x-request-id'] || `webhook-${Date.now()}`,
            clientIp: getClientIp(req),
            userAgent: req.headers['user-agent'],
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length'],
            timestamp: new Date().toISOString(),
            source: 'webhook'
        };

        // Add request ID to response headers
        res.set('x-request-id', req.webhookContext.requestId);

        next();
    };
}

module.exports = {
    webhookAuthorization,
    paypalWebhookAuthorization,
    createRequestContext,
    getClientIp,
    isIpAllowed,
    PAYPAL_WEBHOOK_IPS
};