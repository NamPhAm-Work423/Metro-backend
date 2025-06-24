const express = require('express');
const helmet = require('helmet');
const routes = require('./routes');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Metrics endpoint for gateway health checks
app.get('/metrics', (req, res) => {
    res.status(200).json({
        service: 'staff-service',
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/v1', routes);

// 404 handler
app.use((req, res) => res.status(404).json({ 
    success: false,
    message: 'Endpoint not found' 
}));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
            success: false,
            message: 'Resource already exists',
            errors: err.errors.map(e => ({ field: e.path, message: e.message }))
        });
    }
    
    res.status(500).json({ 
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

module.exports = app; 