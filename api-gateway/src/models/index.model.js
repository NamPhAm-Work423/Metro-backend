const User = require('./user.model');
const Service = require('./service.model');
const ServiceInstance = require('./serviceInstance.model');
const Key = require('./key.model');

// Define associations
User.hasMany(Key, { foreignKey: 'userId', as: 'keys' });
Key.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Service.hasMany(ServiceInstance, { foreignKey: 'serviceId', as: 'instances' });
ServiceInstance.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

module.exports = {
    User,
    Service,
    ServiceInstance,
    Key
};