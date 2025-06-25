const { logger } = require('../config/logger');

/**
 * Authorization middleware to check user roles
 * @param {...string} allowedRoles - Roles that are allowed to access the endpoint
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Extract user information from headers (set by API Gateway)
            const userRoles = req.headers['x-user-roles'];
            const userId = req.headers['x-user-id'];
            
            if (!userRoles || !userId) {
                logger.warn('Authorization failed: Missing user information in headers', {
                    headers: req.headers,
                    url: req.url,
                    method: req.method
                });
                
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User information not found'
                });
            }

            // Parse roles (assuming they come as comma-separated string)
            const roles = userRoles.split(',').map(role => role.trim());
            
            // Check if user has any of the allowed roles
            const hasAllowedRole = roles.some(role => allowedRoles.includes(role));
            
            if (!hasAllowedRole) {
                logger.warn('Authorization failed: Insufficient permissions', {
                    userId,
                    userRoles: roles,
                    allowedRoles,
                    url: req.url,
                    method: req.method
                });
                
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden: Insufficient permissions'
                });
            }

            // Add user information to request object for use in controllers
            req.user = {
                id: userId,
                roles: roles
            };

            logger.info('Authorization successful', {
                userId,
                userRoles: roles,
                url: req.url,
                method: req.method
            });

            next();

        } catch (error) {
            logger.error('Authorization middleware error', {
                error: error.message,
                stack: error.stack,
                url: req.url,
                method: req.method
            });
            
            return res.status(500).json({
                success: false,
                message: 'Internal server error during authorization'
            });
        }
    };
};

/**
 * Middleware to check if user is authenticated (has valid user info)
 */
const requireAuth = (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'];
        const userRoles = req.headers['x-user-roles'];
        
        if (!userId || !userRoles) {
            logger.warn('Authentication failed: Missing user information', {
                url: req.url,
                method: req.method
            });
            
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Authentication required'
            });
        }

        // Add user information to request object
        req.user = {
            id: userId,
            roles: userRoles.split(',').map(role => role.trim())
        };

        next();

    } catch (error) {
        logger.error('Authentication middleware error', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method
        });
        
        return res.status(500).json({
            success: false,
            message: 'Internal server error during authentication'
        });
    }
};

module.exports = {
    authorizeRoles,
    requireAuth
}; 