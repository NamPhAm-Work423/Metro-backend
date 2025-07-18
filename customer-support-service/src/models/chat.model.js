const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Chat = sequelize.define('Chat', {
    chatId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    supportReqId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 }
    },
    agentId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 }
    },
    customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 }
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    status: {
        type: DataTypes.ENUM('active', 'closed', 'pending'),
        allowNull: false,
        defaultValue: 'active',
    },
    transcript: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
}, {
    tableName: 'chats',
    timestamps: true,
});

module.exports = Chat;

