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
}, {
    indexes: [
        // Primary foreign key indexes for joins
        {
            fields: ['tripId'] // Most common - getStopsByTrip
        },
        {
            fields: ['stationId'] // Very common - getStopsByStation
        },
        // Composite indexes for performance
        {
            fields: ['tripId', 'sequence'] // Ordered stops by trip
        },
        {
            fields: ['stationId', 'sequence'] // Ordered stops by station
        },
        {
            fields: ['arrivalTime'] // Time range queries
        },
        {
            fields: ['departureTime'] // Time range queries
        },
        {
            fields: ['stationId', 'arrivalTime'] // Station + arrival time filtering
        },
        {
            fields: ['stationId', 'departureTime'] // Station + departure time filtering
        },
        // Composite with sequence for ordering
        {
            fields: ['stationId', 'arrivalTime', 'sequence'] // Complex station queries
        }
    ]
});

module.exports = Stop;