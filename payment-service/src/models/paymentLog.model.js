const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const PaymentLog = sequelize.define('PaymentLog', {
    paymentLogId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    paymentLogType: {
        type: DataTypes.ENUM('PAYMENT', 'REFUND', 'CHARGEBACK'),
        allowNull: false
    },
    paymentLogDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    paymentLogStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
});

module.exports = PaymentLog;