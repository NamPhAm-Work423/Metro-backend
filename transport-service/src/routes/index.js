const express = require('express');
const router = express.Router();

const adminRoutes = require('./admin.route');
const passengerRoutes = require('./passenger.route');
const staffRoutes = require('./staff.route');

// User routes with /user prefix to match API Gateway routing
const userRouter = express.Router();

// Admin routes
userRouter.use('/admin', adminRoutes);

// Passenger routes
userRouter.use('/passenger', passengerRoutes);

// Staff routes
userRouter.use('/staff', staffRoutes);

// Mount user routes under /user prefix
router.use('/user', userRouter);

module.exports = router; 