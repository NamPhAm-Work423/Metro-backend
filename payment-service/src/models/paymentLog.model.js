const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

/**
 * PaymentLog Model
 * @typedef {object} PaymentLog
 * @property {number} paymentLogId - Primary key, auto-incremented
 * @property {number} paymentId - Associated payment ID (foreign key from Payment)
 * @property {string} paymentLogType - Log type (PAYMENT, REFUND, CHARGEBACK)
 * @property {Date} paymentLogDate - Date/time of log entry
 * @property {string} paymentLogStatus - Status (PENDING, COMPLETED, FAILED)
 */
const PaymentLog = sequelize.define('PaymentLog', {
    /** Primary key, auto-incremented */
    paymentLogId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    /** Associated payment ID (foreign key from Payment) */
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Log type (PAYMENT, REFUND, CHARGEBACK) */
    paymentLogType: {
        type: DataTypes.ENUM('PAYMENT', 'REFUND', 'CHARGEBACK'),
        allowNull: false
    },
    /** Date/time of log entry */
    paymentLogDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    /** Status (PENDING, COMPLETED, FAILED) */
    paymentLogStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
});

module.exports = PaymentLog;