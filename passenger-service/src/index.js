const http = require('http');
const app = require('./app');
const sequelize = require('./config/database');
const eventConsumerService = require('./services/passenger.service');
require('dotenv').config();

const PORT = process.env.PORT || 3002;

sequelize.sync({ force: false })
    .then(() => {
        console.log('User service database synced');
        const server = http.createServer(app);
        server.listen(PORT, async () => {
            console.log(`Passenger Service listening on port ${PORT}`);
            try {
                await eventConsumerService.start();
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