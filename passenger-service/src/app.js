const express = require('express');
const helmet = require('helmet');
const routes = require('./routes');
const { extractUser } = require('./middlewares/authorization');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware to extract user from headers set by API Gateway
app.use(extractUser);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// API Routes
app.use('/v1/users', routes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

module.exports = app; 