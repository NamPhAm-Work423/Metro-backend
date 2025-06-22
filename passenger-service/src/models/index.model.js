const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Load passenger model
const Passenger = require('./passenger.model')(sequelize, DataTypes);

module.exports = {
    sequelize,
    Passenger,
}; 