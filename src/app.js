const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Import routes
const adminRoutes = require('./routes/admin.routes');
const fareRoutes = require('./routes/fare.routes');
const metroStaffRoutes = require('./routes/metroStaff.routes');
const passengerRoutes = require('./routes/passenger.routes');
const paymentRoutes = require('./routes/payment.routes');
const paymentGatewayRoutes = require('./routes/paymentGateway.routes');
const promotionRoutes = require('./routes/promotion.routes');
const reportRoutes = require('./routes/report.routes');
const routeRoutes = require('./routes/route.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const ticketRoutes = require('./routes/ticket.routes');
const userRoutes = require('./routes/user.routes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/fares', fareRoutes);
app.use('/api/staff', metroStaffRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-gateways', paymentGatewayRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: err.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 