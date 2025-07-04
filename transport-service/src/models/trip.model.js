const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
    tripId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    routeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Routes',
            key: 'routeId',
        },
    },
    trainId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Trains',
            key: 'trainId',
        },
    },
    departureTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    arrivalTime: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    dayOfWeek: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']]
        }
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
});

module.exports = Trip;