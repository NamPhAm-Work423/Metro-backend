const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RouteStation = sequelize.define('RouteStation', {
    /** This model is used to store the route and station relationship, that mean all stations in a specific route will be stored in this model */
    routeStationId: {
        type: DataTypes.STRING(150),
        primaryKey: true,
    },
    routeId: {
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'Routes',
            key: 'routeId',
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
    sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = RouteStation;