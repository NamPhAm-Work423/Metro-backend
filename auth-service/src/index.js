const http = require('http');
const app = require('./app');
const sequelize = require('./config/database');
const seedAdmin = require('./seed/seedAdmin');
const PORT = process.env.PORT || 8001;

sequelize.sync({ force: false }).then(async () => {
    console.log('Database is ready');
    console.log('Finish initalize auth-service');

    await seedAdmin();

    const sever = http.createServer(app);

    sever.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
