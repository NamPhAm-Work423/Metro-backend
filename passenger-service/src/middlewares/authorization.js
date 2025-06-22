const extractUser = (req, res, next) => {
    const id = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];

    if (!id || !role) {
        return res.status(401).json({ message: 'Unauthenticated' });
    }

    req.user = { id, role };
    next();
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
};

module.exports = { extractUser, authorizeRoles }; 