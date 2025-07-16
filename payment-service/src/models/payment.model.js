const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

/**
 * Payment Model
 * @typedef {object} Payment
 * @property {number} paymentId - Primary key, auto-incremented
 * @property {number} ticketId - Associated ticket ID (foreign key from ticket-service)
 * @property {number} passengerId - Associated passenger ID (foreign key from user-service)
 * @property {number} paymentAmount - Amount paid (VND)
 * @property {string} paymentMethod - Payment method (MOMO, VNPAY, BANK_TRANSFER, CASH)
 * @property {string} paymentStatus - Status (PENDING, COMPLETED, FAILED)
 * @property {Date} paymentDate - Date/time of payment
 * @property {object} paymentGatewayResponse - Raw response from payment gateway (JSON)
 */
const Payment = sequelize.define('Payment', {
    /** Primary key, auto-incremented */
    paymentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    /** Associated ticket ID (foreign key from ticket-service) */
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Associated passenger ID (foreign key from user-service) */
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Amount paid (VND) */
    paymentAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    /** Payment method (MOMO, VNPAY, BANK_TRANSFER, CASH) */
    paymentMethod: {
        type: DataTypes.ENUM('MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH'),
        allowNull: false
    },
    /** Status (PENDING, COMPLETED, FAILED) */
    paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
    /** Date/time of payment */
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    /** Raw response from payment gateway (JSON) */
    paymentGatewayResponse: {
        type: DataTypes.JSON,
        allowNull: true
    }
});

module.exports = Payment;