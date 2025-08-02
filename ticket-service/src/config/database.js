const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        connectTimeout: 60000,
        dialectOptions: {
            connectTimeout: 60000,
            // Add performance optimizations
            statement_timeout: 30000, // 30 seconds
            idle_in_transaction_session_timeout: 30000,
            // Enable connection pooling optimizations
            keepAlive: true,
            keepAliveInitialDelay: 0
        },
        retry: {
            match: [
                /ECONNREFUSED/,
                /EHOSTUNREACH/,
                /ENOTFOUND/,
                /EAI_AGAIN/,
                /ECONNRESET/,
                /ETIMEDOUT/
            ],
            max: 5
        },
        pool: {
            max: 20, // Reduced from 50 to prevent connection exhaustion
            min: 5,  
            acquire: 30000,
            idle: 10000,
            // Add connection pool optimizations
            evict: 60000, // Check for dead connections every minute
            handleDisconnects: true
        },
        // Add query optimization settings
        benchmark: process.env.NODE_ENV === 'development',
        define: {
            timestamps: true,
            freezeTableName: true
        }
    }
);

// Retry connection with exponential backoff
async function connectWithRetry() {
    const maxRetries = 10;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await sequelize.authenticate();
            console.log('Ticket service database connection established successfully.');
            return;
        } catch (error) {
            console.error(`Database connection attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            if (attempt === maxRetries) {
                console.error('Failed to connect to database after all retries');
                process.exit(1);
            }
            
            // Exponential backoff: 1s, 2s, 4s, 8s, etc.
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Start connection attempts
connectWithRetry();

module.exports = sequelize; 