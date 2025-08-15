const express = require('express');
const app = express();
const helmet = require('helmet');
const { errorHandler: globalErrorHandler } = require('./controllers/error.controller');
const cors = require('cors');
const routing = require('./routes');
const { swaggerUi, swaggerSpec } = require('./swagger/swagger');
const cookieParser = require('cookie-parser');
const { logger, requestLogger } = require('./config/logger');
const dotenv = require('dotenv');
const { register, errorCount } = require('./config/metrics');
const metricsMiddleware = require('./middlewares/metrics.middleware');
const { configureSession, configureSessionAsync, updateSessionActivity } = require('./config/session');

app.use(metricsMiddleware);

dotenv.config();

// CORS options
const corsOptions = {
    origin: [
        process.env.UV_VERCEL_CLIENT, 
        process.env.UI_CLIENT,
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key', 'X-Service-Auth'],
    credentials: true,
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

// Only use CORS in development - in production, Nginx handles CORS
if (process.env.NODE_ENV !== 'production') {
    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));
} else {
    // In production, skip CORS middleware to avoid conflicts with Nginx
    logger.info('Production mode: CORS handled by Nginx, skipping Express CORS middleware');
}

app.use(cookieParser());

// Session middleware (must be after cookie-parser)
// Initialize session middleware after Redis is ready
let sessionMiddleware = null;

// Create a wrapper middleware that waits for session to be ready
app.use(async (req, res, next) => {
    if (!sessionMiddleware) {
        try {
            sessionMiddleware = await configureSessionAsync();
        } catch (error) {
            console.error('Failed to configure session middleware:', error);
            // Fallback to basic session without Redis
            sessionMiddleware = configureSession();
        }
    }
    
    // Apply session middleware
    sessionMiddleware(req, res, (err) => {
        if (err) {
            console.error('Session middleware error:', err);
            return next(err);
        }
        
        // Session activity tracking
        updateSessionActivity(req);
        next();
    });
});

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uncomment to see detailed request logs
// app.use(requestLogger);

// Mount all API routes
app.use(routing);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.send('Apis are ready!');
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });

app.use(globalErrorHandler);

module.exports = app;
