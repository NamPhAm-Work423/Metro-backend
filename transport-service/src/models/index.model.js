const Station = require('./station.model');
const Route = require('./route.model');
const Stop = require('./stop.model');
const Train = require('./train.model');
const Trip = require('./trip.model');
const RouteStation = require('./routeStation.model');

// RouteStation relationships
Route.hasMany(RouteStation, { foreignKey: 'routeId', as: 'stations' });
RouteStation.belongsTo(Route, { foreignKey: 'routeId' });
Station.hasMany(RouteStation, { foreignKey: 'stationId', as: 'routes' });
RouteStation.belongsTo(Station, { foreignKey: 'stationId' });

// Trip relationships
Route.hasMany(Trip, { foreignKey: 'routeId', as: 'trips' });
Trip.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
Train.hasMany(Trip, { foreignKey: 'trainId', as: 'trips' });
Trip.belongsTo(Train, { foreignKey: 'trainId', as: 'train' });

// Route Station relationships
Route.belongsTo(Station, { foreignKey: 'originId', as: 'origin' });
Route.belongsTo(Station, { foreignKey: 'destinationId', as: 'destination' });
Station.hasMany(Route, { foreignKey: 'originId', as: 'originRoutes' });
Station.hasMany(Route, { foreignKey: 'destinationId', as: 'destinationRoutes' });

// Stop relationships
Trip.hasMany(Stop, { foreignKey: 'tripId', as: 'stops' });
Stop.belongsTo(Trip, { foreignKey: 'tripId' });
Station.hasMany(Stop, { foreignKey: 'stationId', as: 'stops' });
Stop.belongsTo(Station, { foreignKey: 'stationId' });


module.exports = {
    Station,
    Route,
    Stop,
    Train,
    Trip,
    RouteStation
}; 