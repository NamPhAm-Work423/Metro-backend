const http = require('http');
const app = require('./app');
const sequelize = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 3002;

sequelize.sync({ force: false })
    .then(() => {
        console.log('User service database synced');
        const server = http.createServer(app);
        server.listen(PORT, () => console.log(`User service running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('Unable to connect to database:', err);
        process.exit(1);
    }); 