const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const SupportReq = sequelize.define('SupportReq', {
    supportReqId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    passengerId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 }
    },
    staffId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 }
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed', 'cancelled'),
        allowNull: false,
        defaultValue: 'open',
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
    },
    channel: {
        type: DataTypes.ENUM('call', 'chat', 'email', 'other'),
        allowNull: false,
        defaultValue: 'other',
    }
}, {
    tableName: 'support_requests',
    timestamps: true,
});

module.exports = SupportReq;

