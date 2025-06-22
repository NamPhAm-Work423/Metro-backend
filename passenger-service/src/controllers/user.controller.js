const { Passenger, Staff, Admin } = require('../models/index.model');

const getModelByRole = (role) => {
    switch (role) {
        case 'staff':
            return Staff;
        case 'admin':
            return Admin;
        default:
            return Passenger;
    }
};

const profile = async (req, res, next) => {
    try {
        const Model = getModelByRole(req.user.role);
        const record = await Model.findOne({ where: { userId: req.user.id } });
        if (!record) return res.status(404).json({ message: 'Profile not found' });
        res.json({ success: true, data: record });
    } catch (err) {
        next(err);
    }
};

const listUsers = async (req, res, next) => {
    try {
        // For simplicity return all passengers + staff + admins
        const [passengers, staffs, admins] = await Promise.all([
            Passenger.findAll(),
            Staff.findAll(),
            Admin.findAll(),
        ]);
        res.json({
            success: true,
            data: { passengers, staffs, admins },
        });
    } catch (err) {
        next(err);
    }
};

const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params; // id here is role table id (not userId)
        const Model = getModelByRole(req.user.role);

        // Passengers can only update their own profile
        if (req.user.role === 'passenger') {
            const record = await Model.findOne({ where: { userId: req.user.id } });
            if (!record || record.id !== id) {
                return res.status(403).json({ message: 'Forbidden' });
            }
        }

        const [count, [updated]] = await Model.update(req.body, {
            where: { id },
            returning: true,
        });
        if (count === 0) return res.status(404).json({ message: 'Profile not found' });
        res.json({ success: true, data: updated });
    } catch (err) {
        next(err);
    }
};

module.exports = { profile, listUsers, updateUser }; 