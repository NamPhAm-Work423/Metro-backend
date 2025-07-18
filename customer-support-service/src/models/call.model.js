const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Call = sequelize.define('Call', {
    callId: {
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
        type: DataTypes.ENUM('ongoing', 'completed', 'missed', 'cancelled'),
        allowNull: false,
        defaultValue: 'ongoing',
    },
    recordingUrl: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    }
}, {
    tableName: 'calls',
    timestamps: true,
});

module.exports = Call;
