const express = require('express');
const router = express.Router();
const emailRoutes = require('./email.routes');
const smsRoutes = require('./sms.routes');

const notificationServiceRouter = express.Router();

notificationServiceRouter.use('/emails', emailRoutes);

notificationServiceRouter.use('/sms', smsRoutes);

notificationServiceRouter.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Notification Service is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        channels: ['email', 'sms'],
        providers: {
            email: ['resend'],
            sms: ['vonage']
        }
    });
});

router.use('/notification', notificationServiceRouter);

module.exports = router;
