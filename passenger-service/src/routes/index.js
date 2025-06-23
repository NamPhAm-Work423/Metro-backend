const express = require('express');
const router = express.Router();
const passengerRoutes = require('./passenger.route');

// Passenger routes
router.use('/passengers', passengerRoutes);

module.exports = router; 