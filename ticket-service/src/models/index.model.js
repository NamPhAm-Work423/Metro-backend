const sequelize = require('../config/database');
const Ticket = require('./ticket.model');
const Fare = require('./fare.model');
const Promotion = require('./promotion.model');
const TransitPass = require('./transitPass.model');

// Define relationships between models

// Ticket-Fare relationship (Many tickets can use the same fare)
Fare.hasMany(Ticket, { foreignKey: 'fareId', as: 'tickets' });
Ticket.belongsTo(Fare, { foreignKey: 'fareId', as: 'fare' });

// Ticket-Promotion relationship (Many tickets can use the same promotion)
Promotion.hasMany(Ticket, { foreignKey: 'promotionId', as: 'tickets' });
Ticket.belongsTo(Promotion, { foreignKey: 'promotionId', as: 'promotion' });

// Ticket-TransitPass relationship (Many tickets can use the same transit pass)
TransitPass.hasMany(Ticket, { foreignKey: 'transitPassId', as: 'tickets' });
Ticket.belongsTo(TransitPass, { foreignKey: 'transitPassId', as: 'transitPass' });

// Note: Foreign key relationships to other services (passenger, trip, station, route)
// are handled via foreign keys only since these models exist in different services
// The actual joins would be handled at the application level or via federation

module.exports = {
    sequelize,
    Ticket,
    Fare,
    Promotion,
    TransitPass
};
