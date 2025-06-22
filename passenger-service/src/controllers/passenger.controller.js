const { Passenger } = require('../models/index.model');

// POST /v1/passengers
const createPassenger = async (req, res, next) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const userId = req.user.id;
        // Ensure not existing
        const existing = await Passenger.findOne({ where: { userId } });
        if (existing) {
            return res.status(409).json({ message: 'Passenger profile already exists' });
        }
        const passenger = await Passenger.create({ userId, firstName, lastName, phone });
        res.status(201).json({ success: true, data: passenger });
    } catch (err) {
        next(err);
    }
};

// GET /v1/passengers/me
const getMe = async (req, res, next) => {
    try {
        const passenger = await Passenger.findOne({ where: { userId: req.user.id } });
        if (!passenger) {
            return res.status(404).json({ message: 'Passenger profile not found' });
        }
        res.json({ success: true, data: passenger });
    } catch (err) {
        next(err);
    }
};

module.exports = { createPassenger, getMe }; 