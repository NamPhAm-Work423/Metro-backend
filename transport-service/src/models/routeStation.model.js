const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RouteStation = sequelize.define('RouteStation', {
    routeStationId: {
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
    stationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = RouteStation;