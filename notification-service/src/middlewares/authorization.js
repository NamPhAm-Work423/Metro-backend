const jwt = require('jsonwebtoken');

// 🔐 SECURE: Verify service-to-service JWT token
const verifyServiceAuth = (req, res, next) => {
    const authHeader = req.headers['x-service-auth'];
    
    console.log('Service Auth Debug:', {
        hasAuthHeader: !!authHeader,
        authHeaderPreview: authHeader ? authHeader.substring(0, 20) + '...' : 'null',
        allHeaders: Object.keys(req.headers),
        serviceJwtSecret: !!process.env.SERVICE_JWT_SECRET
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Missing service auth header:', {
            authHeader,
            headers: req.headers
        });
        return res.status(401).json({ 
            success: false,
            message: 'Service authentication required',
            error: 'MISSING_SERVICE_AUTH',
            debug: {
                hasAuthHeader: !!authHeader,
                headerFormat: authHeader ? 'Invalid format' : 'Missing'
            }
        });
    }

    const token = authHeader.split(' ')[1];
    
    try {
        if (!process.env.SERVICE_JWT_SECRET) {
            console.error('SERVICE_JWT_SECRET not found in environment');
            throw new Error('SERVICE_JWT_SECRET environment variable is required');
        }

        console.log('Attempting to verify service JWT:', {
            tokenPrefix: token.substring(0, 20) + '...',
            secretAvailable: !!process.env.SERVICE_JWT_SECRET,
            secretPrefix: process.env.SERVICE_JWT_SECRET.substring(0, 10) + '...'
        });

        const decoded = jwt.verify(token, process.env.SERVICE_JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'api-gateway',
            audience: 'internal-services'
        });

        console.log('JWT decoded successfully:', {
            userId: decoded.userId,
            email: decoded.email,
            roles: decoded.roles,
            issuer: decoded.iss,
            audience: decoded.aud,
            issuedAt: decoded.iat,
            expiresAt: decoded.exp
        });

        // Verify token is not too old (max 5 minutes)
        const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
        console.log('Token age check:', {
            currentTime: Math.floor(Date.now() / 1000),
            issuedAt: decoded.iat,
            tokenAge: tokenAge,
            maxAge: 300,
            isValid: tokenAge <= 300
        });

        if (tokenAge > 300) { // 5 minutes
            console.error('Token too old:', {
                tokenAge,
                maxAge: 300
            });
            return res.status(401).json({
                success: false,
                message: 'Service token expired',
                error: 'TOKEN_TOO_OLD',
                debug: {
                    tokenAge,
                    maxAge: 300
                }
            });
        }

        // Extract authenticated user information
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            roles: decoded.roles
        };

        console.log('Service authentication verified', {
            userId: decoded.userId,
            roles: decoded.roles,
            tokenAge: tokenAge + 's'
        });

        next();
    } catch (error) {
        console.error('Service JWT verification failed:', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            tokenPrefix: token ? token.substring(0, 20) + '...' : 'null'
        });

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid service token',
                error: 'INVALID_SERVICE_TOKEN',
                debug: {
                    reason: error.message,
                    tokenPreview: token ? token.substring(0, 20) + '...' : 'null'
                }
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Service token expired',
                error: 'EXPIRED_SERVICE_TOKEN',
                debug: {
                    reason: error.message
                }
            });
        }

        console.error('Service auth verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Service authentication failed',
            error: 'SERVICE_AUTH_ERROR',
            debug: {
                errorType: error.name,
                errorMessage: error.message
            }
        });
    }
};

// Extract user information from API Gateway headers
const extractUser = (req, res, next) => {
    console.warn('DEPRECATED: Using insecure header-based authentication');
    
    const id = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const rolesHeader = req.headers['x-user-roles'];

    if (!id) {
        return res.status(401).json({ 
            success: false,
            message: 'User authentication required' 
        });
    }

    let roles = ['user']; // default role
    if (rolesHeader) {
        try {
            roles = JSON.parse(rolesHeader);
        } catch (error) {
            console.error('Failed to parse user roles:', error);
        }
    }

    req.user = { 
        id, 
        email,
        roles 
    };
    next();
};

const authorizeRoles = (...requiredRoles) => {
    return [verifyServiceAuth, (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        // Check if user has any of the required roles
        const hasRole = requiredRoles.some(role => req.user.roles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false,
                message: 'Insufficient permissions',
                required: requiredRoles,
                current: req.user.roles
            });
        }
        next();
    }];
};

// Legacy authorization (DEPRECATED - use authorizeRoles instead)
const legacyAuthorizeRoles = (...requiredRoles) => {
    console.warn('DEPRECATED: Using legacy authorization. Upgrade to secure authorizeRoles');
    return [extractUser, (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(401).json({ 
                success: false,
                message: 'Authentication required' 
            });
        }

        // Check if user has any of the required roles
        const hasRole = requiredRoles.some(role => req.user.roles.includes(role));
        
        if (!hasRole) {
            return res.status(403).json({ 
                success: false,
                message: 'Insufficient permissions' 
            });
        }
        next();
    }];
};

module.exports = { 
    verifyServiceAuth,
    authorizeRoles,
    extractUser, // DEPRECATED
    legacyAuthorizeRoles // DEPRECATED
}; 