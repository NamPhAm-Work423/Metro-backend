// models/index.js
const fs        = require('fs');
const path      = require('path');
const Sequelize = require('sequelize');
const config    = require('../config/db.js');
const sequelize = new Sequelize(config);

const db = {};

// Import tự động tất cả file .model.js
fs
  .readdirSync(__dirname)
  .filter(f => f.endsWith('.model.js'))
  .forEach(f => {
    const model = require(path.join(__dirname, f))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Destructure các model vừa load
const {
  User,
  Admin,
  Passenger,
  MetroStaff,
  CustomerSupport,
  SupportRequest,
  UserGuide,
  ChatSession,
  Route,
  Schedule,
  Fare,
  Promotion,
  Ticket,
  Report,
  Payment,
  PaymentGateway
} = db;

// --- Associations ---
// User specializations
User.hasMany(Passenger,    { foreignKey: 'userID' });
Passenger.belongsTo(User, { foreignKey: 'userID' });

User.hasMany(Admin,        { foreignKey: 'userID' });
Admin.belongsTo(User,     { foreignKey: 'userID' });

User.hasMany(MetroStaff,   { foreignKey: 'userID' });
MetroStaff.belongsTo(User,{ foreignKey: 'userID' });

User.hasMany(CustomerSupport,    { foreignKey: 'userID' });
CustomerSupport.belongsTo(User, { foreignKey: 'userID' });

// CustomerSupport → SupportRequest, UserGuide, ChatSession
CustomerSupport.hasMany(SupportRequest, { foreignKey: 'supportID' });
SupportRequest.belongsTo(CustomerSupport, { foreignKey: 'supportID' });

CustomerSupport.hasMany(UserGuide,      { foreignKey: 'supportID' });
UserGuide.belongsTo(CustomerSupport,       { foreignKey: 'supportID' });

CustomerSupport.hasMany(ChatSession,    { foreignKey: 'supportID' });
ChatSession.belongsTo(CustomerSupport,   { foreignKey: 'supportID' });

// Route & Schedule
Route.hasMany(Schedule, { foreignKey: 'routeID' });
Schedule.belongsTo(Route, { foreignKey: 'routeID' });

Route.hasMany(Fare, { foreignKey: 'routeID' });

// Fare & Promotion configurations
Admin.hasMany(Fare, { foreignKey: 'adminID' });
Fare.belongsTo(Admin, { foreignKey: 'adminID' });

Fare.hasMany(Promotion, { foreignKey: 'fareID' });
Promotion.belongsTo(Fare, { foreignKey: 'fareID' });

// Promotion ↔ Route 
Promotion.belongsToMany(Route, { through: 'RoutePromotions' });

// Promotion ↔ Ticket
Promotion.hasMany(Ticket, { foreignKey: 'promotionID' });
Ticket.belongsTo(Promotion, { foreignKey: 'promotionID' });

// Schedule → Ticket
Schedule.hasMany(Ticket, { foreignKey: 'scheduleID' });
Ticket.belongsTo(Schedule, { foreignKey: 'scheduleID' });

// Ticket → Report
Ticket.hasMany(Report, { foreignKey: 'reportID', sourceKey: 'ticketID' });
Report.belongsTo(Ticket, { foreignKey: 'reportID', targetKey: 'ticketID' });

// Admin → Report
Admin.hasMany(Report, { foreignKey: 'adminID' });
Report.belongsTo(Admin, { foreignKey: 'adminID' });

// Ticket → Payment
Ticket.hasOne(Payment, { foreignKey: 'ticketID' });
Payment.belongsTo(Ticket, { foreignKey: 'ticketID' });

// PaymentGateway → Payment
PaymentGateway.hasMany(Payment, { foreignKey: 'gatewayID' });
Payment.belongsTo(PaymentGateway, { foreignKey: 'gatewayID' });

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
