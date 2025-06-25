const express = require('express');
const app = express();
const helmet = require('helmet');
const { errorHandler: globalErrorHandler } = require('./controllers/error.controller');
const cors = require('cors');
const routing = require('./routes');
const { swaggerUi, swaggerSpec } = require('./config/swagger');
const cookieParser = require('cookie-parser');
const { logger, requestLogger } = require('./config/logger');
const dotenv = require('dotenv');
dotenv.config();

// CORS options
const corsOptions = {
    origin: [process.env.UV_DESK_CLIENT, process.env.UI_CLIENT],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-api-key'],
    credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(cookieParser());

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

app.use(globalErrorHandler);

module.exports = app;
