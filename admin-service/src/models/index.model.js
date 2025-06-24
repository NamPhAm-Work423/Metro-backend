const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Load admin model
const Admin = require('./admin.model')(sequelize, DataTypes);

module.exports = {
    sequelize,
    Admin,
}; 