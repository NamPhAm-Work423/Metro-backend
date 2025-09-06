const express = require('express');
const vnpayRoutes = require('./vnpay.route');
const paypalRoutes = require('./paypal.route');
const sepayRoutes = require('./sepay.route');
const paymentRoutes = require('./payment.route');
const router = express.Router();

const paymentRouter = express.Router();

// Payment routes
paymentRouter.use('/vnpay', vnpayRoutes);

// PayPal routes
paymentRouter.use('/paypal', paypalRoutes);

// Sepay routes
paymentRouter.use('/sepay', sepayRoutes);

// General payment routes
paymentRouter.use('/', paymentRoutes);

router.use('/payment', paymentRouter);

module.exports = router; 