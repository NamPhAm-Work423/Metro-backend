const { requireSession, optionalSession } = require('../config/session');
const { logger } = require('../config/logger');

/**
 * Middleware to validate session and forward user data to microservices
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function validateAndForwardSession(req, res, next) {
    try {
        // Debug session state
        logger.debug('Session validation debug', {
            hasSession: !!req.session,
            sessionId: req.sessionID,
            sessionKeys: req.session ? Object.keys(req.session) : [],
            hasUserId: req.session ? !!req.session.userId : false,
            url: req.url,
            method: req.method
        });

        // Check if session exists
        if (!req.session || !req.session.userId) {
            logger.debug('No session found, proceeding without user context');
            return next();
        }

        // Add user context to request headers for microservices
        req.headers['x-user-id'] = req.session.userId;
        req.headers['x-user-role'] = req.session.userRole;
        req.headers['x-user-email'] = req.session.userEmail;
        req.headers['x-session-id'] = req.sessionID;

        logger.debug('Session validated and user context forwarded', {
            userId: req.session.userId,
            userRole: req.session.userRole,
            sessionId: req.sessionID
        });

        next();
    } catch (error) {
        logger.error('Session validation error:', {
            error: error.message,
            stack: error.stack
        });
        next();
    }
}

/**
 * Middleware to require session for protected routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireValidSession(req, res, next) {
    return requireSession(req, res, next);
}

/**
 * Middleware to make session optional (for public routes that can work with or without session)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function optionalValidSession(req, res, next) {
    return optionalSession(req, res, next);
}

/**
 * Middleware to log session activity
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function logSessionActivity(req, res, next) {
    if (req.session && req.session.userId) {
        logger.debug('Session activity', {
            userId: req.session.userId,
            sessionId: req.sessionID,
            url: req.url,
            method: req.method,
            lastActivity: req.session.lastActivity
        });
    }
    next();
}

/**
 * Middleware to check session expiry and warn if close to expiry
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function checkSessionExpiry(req, res, next) {
    if (req.session && req.session.lastActivity) {
        const lastActivity = new Date(req.session.lastActivity);
        const now = new Date();
        const timeDiff = now - lastActivity;
        const maxAge = parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000;
        const warningThreshold = maxAge * 0.8; // Warn at 80% of max age

        if (timeDiff > warningThreshold) {
            logger.warn('Session approaching expiry', {
                userId: req.session.userId,
                sessionId: req.sessionID,
                timeSinceLastActivity: timeDiff,
                maxAge: maxAge,
                remainingTime: maxAge - timeDiff
            });
        }
    }
    next();
}

module.exports = {
    validateAndForwardSession,
    requireValidSession,
    optionalValidSession,
    logSessionActivity,
    checkSessionExpiry
};
