const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Service = sequelize.define('Service', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV1,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    endPoint: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    version: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1.0.0'
    },
    timeout: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30000,
    },
    retries: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
    },
    circuitBreaker: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            enabled: true,
            threshold: 5,
            timeout: 60000,
            monitoringPeriod: 10000
        }
    },
    loadBalancer: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            strategy: 'round-robin'
        }
    },
    authentication: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            required: false,
            roles: []
        }
    },
    rateLimit: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            enabled: true,
            requests: 100,
            windowMs: 60000
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
        allowNull: false,
        defaultValue: 'active'
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
            unique: true,
            fields: ['name']
        },
        {
            fields: ['endPoint']
        }
    ]
});

module.exports = Service;