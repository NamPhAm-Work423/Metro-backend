const http = require('http');
const app = require('./app');
const sequelize = require('./config/database');
const kafkaConsumer = require('./events/kafkaConsumer');
require('dotenv').config();

const PORT = process.env.PORT || 3002;

sequelize.sync({ force: false })
    .then(() => {
        console.log('User service database synced');
        const server = http.createServer(app);
        server.listen(PORT, async () => {
            console.log(`Passenger Service listening on port ${PORT}`);
            try {
                await kafkaConsumer.start();
                console.log('Kafka consumer running');
            } catch (err) {
                console.error('Kafka consumer error', err.message);
            }
        });
    })
    .catch((err) => {
        console.error('Unable to connect to database:', err);
        process.exit(1);
    });

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        await kafkaConsumer.stop();
        console.log('Kafka consumer stopped');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.message);
        process.exit(1);
    }
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        await kafkaConsumer.stop();
        console.log('Kafka consumer stopped');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.message);
        process.exit(1);
    }
}); 