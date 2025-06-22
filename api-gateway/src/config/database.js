const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'postgres',
        port: process.env.DB_PORT || '5432',
        showWarnings: true,
        connectTimeout: 1000,
        pool: {
            max: 1000,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
    }
);

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch((error) => {
        console.error('Unable to connect to the database:', error);
    });

module.exports = sequelize;