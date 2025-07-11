const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Stop = sequelize.define('Stop', {
    stopId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Trips',
            key: 'tripId',
        },
    },
    stationId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    arrivalTime: {
        type: DataTypes.TIME,
        allowNull: true, // Null for first station
    },
    departureTime: {
        type: DataTypes.TIME,
        allowNull: true, // Null for last station
    },
    sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
});

module.exports = Stop;