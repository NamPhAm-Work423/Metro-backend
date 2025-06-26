const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
    routeId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    originId: { 
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    destinationId: { 
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    distance: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    duration: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
});

module.exports = Route;