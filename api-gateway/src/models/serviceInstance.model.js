const { DataTypes, HSTORE } = require('sequelize');
const sequelize = require('../config/database');

const ServiceInstance = sequelize.define('ServiceInstance', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        primaryKey: true,
    },
    serviceId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Services',
            key: 'id'
        }
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1,
            max: 10
        }
    },
    region: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'default'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'unhealthy'),
        allowNull: false,
        defaultValue: 'active',
    },
    isHealthy: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    lastHealthCheck: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['serviceId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['isHealthy']
        },
        {
            unique: true,
            fields: ['serviceId', 'host', 'port']
        }
    ]
});

module.exports = ServiceInstance;