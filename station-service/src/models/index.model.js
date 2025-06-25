const sequelize = require('../config/database');
const Station = require('./station.model')(sequelize, require('sequelize').DataTypes);

// Initialize models
sequelize.sync({ force: false })
    .then(() => {
        console.log('Station service database models synchronized');
    })
    .catch(err => {
        console.error('Error synchronizing station service database models:', err);
    });

module.exports = {
    sequelize,
    Station
}; 