const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Route = sequelize.define('Route', {
    routeId: {
        type: DataTypes.STRING(100),
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    originId: { 
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    destinationId: { 
        type: DataTypes.STRING(100),
        allowNull: false,
        references: {
            model: 'Stations',
            key: 'stationId',
        },
    },
    numberOfStations: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    distance: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    duration: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
}, {
    hooks: {
        afterCreate: async (route) => {
            try {
                const RouteStation = require('./routeStation.model');
                const count = await RouteStation.count({ where: { routeId: route.routeId }});
                if (count !== route.numberOfStations) {
                    await route.update({ numberOfStations: count }, { hooks: false });
                }
            } catch (error) {
                console.error('Error in afterCreate hook:', error);
            }
        },
        afterUpdate: async (route) => {
            try {
                const RouteStation = require('./routeStation.model');
                const count = await RouteStation.count({ where: { routeId: route.routeId }});
                if (count !== route.numberOfStations) {
                    await route.update({ numberOfStations: count }, { hooks: false });
                }
            } catch (error) {
                console.error('Error in afterUpdate hook:', error);
            }
        },
        afterBulkCreate: async (routes) => {
            try {
                const RouteStation = require('./routeStation.model');
                for (const route of routes) {
                    const count = await RouteStation.count({ where: { routeId: route.routeId }});
                    if (count !== route.numberOfStations) {
                        await route.update({ numberOfStations: count }, { hooks: false });
                    }
                }
            } catch (error) {
                console.error('Error in afterBulkCreate hook:', error);
            }
        }
    }
});

// Instance method to manually update station count
Route.prototype.updateStationCount = async function() {
    try {
        const RouteStation = require('./routeStation.model');
        const count = await RouteStation.count({ where: { routeId: this.routeId }});
        await this.update({ numberOfStations: count }, { hooks: false });
        return count;
    } catch (error) {
        console.error('Error updating station count:', error);
        throw error;
    }
};

module.exports = Route;