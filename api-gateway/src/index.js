// IMPORTANT: Tracing must be initialized FIRST before any other imports
require('./tracing');

const http = require('http');
const app = require('./app');
const cron = require('node-cron');
// const dotenv = require('dotenv');
// dotenv.config();
const sequelize = require('./config/database');
const config = require('./config')();
const initialize = require('./initialize');
const { updateAllInstancesStatus } = require('./services/loadBalancer.service');

const updateServiceStatusCronJob = () => {
    cron.schedule('*/1 * * * *', async () => {
        console.log('Running service status update for all instances...');
        await updateAllInstancesStatus();
    });
};

sequelize.sync({ force: false }).then(() => {
    console.log('Database is ready');
    initialize().then(async () => {
        console.log('Finish initalize gateway');

        // User seeding is handled in auth-service

        const PORT = config.gateway.port || 8000;

        const sever = http.createServer(app);

        sever.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
        updateServiceStatusCronJob();
    });
});
