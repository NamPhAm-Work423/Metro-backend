const User = require('./user.model');
const Key = require('./key.model');

// Define associations
User.hasMany(Key, { foreignKey: 'userId', as: 'keys' });
Key.belongsTo(User, { foreignKey: 'userId', as: 'user' });


module.exports = {
    User,
    Key
};