const express = require('express');
const app = express();
const helmet = require('helmet');
const { errorHandler: globalErrorHandler } = require('./controllers/error.controller');
const cors = require('cors');
const routing = require('./routes');
const { logger, requestLogger } = require('./config/logger');
const dotenv = require('dotenv');
const { register, errorCount } = require('./config/metrics');
const metricsMiddleware = require('./middlewares/metrics.middleware');

app.use(metricsMiddleware);

dotenv.config();

// CORS options - webhook service doesn't go through API Gateway
// Mainly for PayPal and other webhook providers
const corsOptions = {
    origin: [
        'https://www.paypal.com',
        'https://www.sandbox.paypal.com',
        'https://api.paypal.com',
        'https://api.sandbox.paypal.com',
        process.env.API_GATEWAY_ORIGIN,
        process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean)
    ].flat().filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'x-request-id',
        // PayPal specific headers
        'paypal-auth-algo',
        'paypal-transmission-id', 
        'paypal-cert-id',
        'paypal-transmission-sig',
        'paypal-transmission-time'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

if (process.env.NODE_ENV !== 'production') {
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
} else {
    // In production, skip CORS middleware to avoid conflicts with Nginx
    logger.info('Production mode: CORS handled by Nginx, skipping Express CORS middleware');
}

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(routing);


app.get('/', (req, res) => {
    res.send('Webhook Service is ready!');
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.use(globalErrorHandler);

module.exports = app;