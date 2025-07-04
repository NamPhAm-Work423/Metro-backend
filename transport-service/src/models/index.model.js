const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

// Import model definitions
const Station = require('./station.model');
const Route = require('./route.model');
const Stop = require('./stop.model');
const Train = require('./train.model');
const Trip = require('./trip.model');
const RouteStation = require('./routeStation.model');

// Initialize models
const models = {
    Station,
    Route,
    Stop,
    Train,
    Trip,
    RouteStation
};

// Define associations after all models are loaded
function initializeAssociations() {
    // 2. Route depends on Station
    models.Route.belongsTo(models.Station, { as: 'origin', foreignKey: 'originId' });
    models.Route.belongsTo(models.Station, { as: 'destination', foreignKey: 'destinationId' });

    // 4. RouteStation depends on Route and Station
    models.Route.hasMany(models.RouteStation, { foreignKey: 'routeId', as: 'stations' });
    models.RouteStation.belongsTo(models.Route, { foreignKey: 'routeId' });
    models.Station.hasMany(models.RouteStation, { foreignKey: 'stationId', as: 'routes' });
    models.RouteStation.belongsTo(models.Station, { foreignKey: 'stationId' });

    // 5. Trip depends on Route and Train
    models.Route.hasMany(models.Trip, { foreignKey: 'routeId' });
    models.Trip.belongsTo(models.Route, { foreignKey: 'routeId' });
    models.Train.hasMany(models.Trip, { foreignKey: 'trainId' });
    models.Trip.belongsTo(models.Train, { foreignKey: 'trainId' });

    // 6. Stop depends on Trip and Station
    models.Trip.hasMany(models.Stop, { foreignKey: 'tripId' });
    models.Stop.belongsTo(models.Trip, { foreignKey: 'tripId' });
    models.Station.hasMany(models.Stop, { foreignKey: 'stationId' });
    models.Stop.belongsTo(models.Station, { foreignKey: 'stationId' });
}

// Initialize associations
initializeAssociations();

module.exports = models; 