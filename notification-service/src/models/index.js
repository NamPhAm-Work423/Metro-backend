const sequelize = require('../config/database');
const Email = require('./email.model');
const SMS = require('./sms.model');

// Define associations if needed
// Email.belongsTo(User, { foreignKey: 'userId' });
// SMS.belongsTo(User, { foreignKey: 'userId' });

// Export models and sequelize instance
module.exports = {
    sequelize,
    Email,
    SMS
};
