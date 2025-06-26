const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Station = require('./station.model')(sequelize, DataTypes);
const Route = require('./route.model')(sequelize, DataTypes);
const Stop = require('./stop.model')(sequelize, DataTypes);
const Train = require('./train.model')(sequelize, DataTypes);
const Trip = require('./trip.model')(sequelize, DataTypes);
const RouteStation = require('./routeStation.model')(sequelize, DataTypes);

// RouteStation relationships
Route.hasMany(RouteStation, { foreignKey: 'routeId', as: 'stations' });
RouteStation.belongsTo(Route, { foreignKey: 'routeId' });
Station.hasMany(RouteStation, { foreignKey: 'stationId', as: 'routes' });
RouteStation.belongsTo(Station, { foreignKey: 'stationId' });

// Trip relationships
Route.hasMany(Trip, { foreignKey: 'routeId', as: 'trips' });
Trip.belongsTo(Route, { foreignKey: 'routeId' });
Train.hasMany(Trip, { foreignKey: 'trainId', as: 'trips' });
Trip.belongsTo(Train, { foreignKey: 'trainId' });

// Stop relationships
Trip.hasMany(Stop, { foreignKey: 'tripId', as: 'stops' });
Stop.belongsTo(Trip, { foreignKey: 'tripId' });
Station.hasMany(Stop, { foreignKey: 'stationId', as: 'stops' });
Stop.belongsTo(Station, { foreignKey: 'stationId' });


module.exports = {
    sequelize,
    Station,
    Route,
    Stop,
    Train,
    Trip,
    RouteStation
}; 