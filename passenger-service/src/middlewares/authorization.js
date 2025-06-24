// Extract user information from API Gateway headers
const extractUser = (req, res, next) => {
    const id = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const rolesHeader = req.headers['x-user-roles'];

    if (!id) {
        return res.status(401).json({ 
            success: false,
            message: 'Passenger authentication required' 
        });
    }

    let roles = ['passenger']; // default role
    if (rolesHeader) {
        try {
            roles = JSON.parse(rolesHeader);
        } catch (error) {
            console.error('Failed to parse passenger roles:', error);
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

module.exports = { extractUser, authorizeRoles }; 