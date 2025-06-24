const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Load staff model
const Staff = require('./staff.model')(sequelize, DataTypes);

module.exports = {
    sequelize,
    Staff,
}; 