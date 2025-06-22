const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { role } = req.user;

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};

const roles = {
    ADMIN: 'admin',
    STAFF: 'staff',
    PASSENGER: 'passenger'
};

module.exports = {
    checkRole,
    roles
}; 