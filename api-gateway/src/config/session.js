const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getClient } = require('./redis');
const { logger } = require('./logger');

/**
 * Configure session middleware with Redis store
 * @returns {Function} Express session middleware
 */
function configureSession() {
    // Try to get Redis client, but don't fail if not available
    const redisClient = getClient();
    
    let sessionConfig = {
        name: process.env.SESSION_NAME || 'sessionToken',
        secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production' || process.env.SESSION_COOKIE_SECURE === 'true',
            httpOnly: process.env.SESSION_COOKIE_HTTPONLY !== 'false',
            sameSite: process.env.SESSION_COOKIE_SAMESITE || 'strict',
            maxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
            domain: process.env.NODE_ENV === 'production' ? '.metrohcm.io.vn' : undefined,
            path: '/'
        },
        rolling: true, // Extend session on each request
        unset: 'destroy' // Remove session from store when unset
    };

    // Add Redis store if available
    if (redisClient && redisClient.isOpen) {
        sessionConfig.store = new RedisStore({ 
            client: redisClient,
            prefix: `${process.env.REDIS_KEY_PREFIX || 'api-gateway:'}session:`
        });
        
        logger.info('Session configuration initialized with Redis store', {
            store: 'Redis',
            cookieName: sessionConfig.name,
            secure: sessionConfig.cookie.secure,
            httpOnly: sessionConfig.cookie.httpOnly,
            sameSite: sessionConfig.cookie.sameSite,
            maxAge: sessionConfig.cookie.maxAge
        });
    } else {
        logger.warn('Redis client not available, using memory store for sessions');
        logger.info('Session configuration initialized with memory store', {
            store: 'Memory',
            cookieName: sessionConfig.name,
            secure: sessionConfig.cookie.secure,
            httpOnly: sessionConfig.cookie.httpOnly,
            sameSite: sessionConfig.cookie.sameSite,
            maxAge: sessionConfig.cookie.maxAge
        });
    }

    const sessionMiddleware = session(sessionConfig);
    
    logger.debug('Session configuration details', {
        cookieName: sessionConfig.name,
        cookieSecure: sessionConfig.cookie.secure,
        cookieHttpOnly: sessionConfig.cookie.httpOnly,
        cookieSameSite: sessionConfig.cookie.sameSite,
        cookieDomain: sessionConfig.cookie.domain,
        cookiePath: sessionConfig.cookie.path,
        cookieMaxAge: sessionConfig.cookie.maxAge,
        hasStore: !!sessionConfig.store,
        storeType: sessionConfig.store ? 'Redis' : 'Memory'
    });
    
    return sessionMiddleware;
}

/**
 * Configure session middleware with Redis store (async version)
 * @returns {Promise<Function>} Express session middleware
 */
async function configureSessionAsync() {
    // Wait for Redis to be available
    const { tryConnect } = require('./redis');
    await tryConnect();
    
    return configureSession();
}

/**
 * Session middleware for authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireSession(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Session required'
        });
    }
    next();
}

/**
 * Optional session middleware (session exists but not required)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function optionalSession(req, res, next) {
    // Session is optional, continue regardless
    next();
}

/**
 * Create user session
 * @param {Object} req - Express request object
 * @param {Object} user - User object
 */
function createUserSession(req, user) {
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userEmail = user.email;
    req.session.createdAt = new Date().toISOString();
    req.session.lastActivity = new Date().toISOString();
    
    logger.info('User session created', {
        userId: user.id,
        userRole: user.role,
        sessionId: req.sessionID
    });
}

/**
 * Destroy user session
 * @param {Object} req - Express request object
 */
function destroyUserSession(req) {
    const sessionId = req.sessionID;
    const userId = req.session?.userId;
    
    // Check if session exists before attempting to destroy it
    if (!req.session) {
        logger.warn('No session to destroy', { sessionId, userId });
        return;
    }
    
    req.session.destroy((err) => {
        if (err) {
            logger.error('Error destroying session', { error: err.message, sessionId });
        } else {
            logger.info('User session destroyed', { userId, sessionId });
        }
    });
}

/**
 * Update session activity
 * @param {Object} req - Express request object
 */
function updateSessionActivity(req) {
    if (req.session) {
        req.session.lastActivity = new Date().toISOString();
    }
}

module.exports = {
    configureSession,
    configureSessionAsync,
    requireSession,
    optionalSession,
    createUserSession,
    destroyUserSession,
    updateSessionActivity
};
