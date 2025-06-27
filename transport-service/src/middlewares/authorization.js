const jwt = require('jsonwebtoken');

// 🔐 SECURE: Verify service-to-service JWT token
const verifyServiceAuth = (req, res, next) => {
    const authHeader = req.headers['x-service-auth'];
    
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
            throw new Error('SERVICE_JWT_SECRET environment variable is required');
        }

        const decoded = jwt.verify(token, process.env.SERVICE_JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'api-gateway',
            audience: 'internal-services'
        });

        // Verify token is not too old (max 5 minutes)
        const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;


        if (tokenAge > 300) { // 5 minutes
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

        next();
    } catch (error) {


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


module.exports = { 
    verifyServiceAuth,
    authorizeRoles
}; 