const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Trip = sequelize.define('Trip', {
    tripId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    serviceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    routeId: {
        type: DataTypes.STRING(100),
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
}, {
    indexes: [
        // Primary index for serviceDate (most common filter)
        {
            fields: ['serviceDate']
        },
        // Composite index for serviceDate + routeId (common combination)
        {
            fields: ['serviceDate', 'routeId']
        },
        // Composite index for serviceDate + trainId
        {
            fields: ['serviceDate', 'trainId']
        },
        // Composite index for serviceDate + isActive
        {
            fields: ['serviceDate', 'isActive']
        },
        // Index for dayOfWeek (for weekly queries)
        {
            fields: ['dayOfWeek']
        },
        // Composite index for serviceDate + dayOfWeek
        {
            fields: ['serviceDate', 'dayOfWeek']
        },
        // Index for departureTime (for time range queries)
        {
            fields: ['departureTime']
        },
        // Composite index for serviceDate + departureTime (for time filtering)
        {
            fields: ['serviceDate', 'departureTime']
        },
        // Composite index for routeId + isActive (for active routes)
        {
            fields: ['routeId', 'isActive']
        },
        // Composite index for trainId + isActive (for active trains)
        {
            fields: ['trainId', 'isActive']
        }
    ]
});

module.exports = Trip;