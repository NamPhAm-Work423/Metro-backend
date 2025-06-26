const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Admin = require('./admin.model')(sequelize, DataTypes);
const Passenger = require('./passenger.model')(sequelize, DataTypes);
const Staff = require('./staff.model')(sequelize, DataTypes);

module.exports = {
    sequelize,
    Admin,
    Passenger,
    Staff
}; 