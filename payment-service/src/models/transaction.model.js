const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

/**
 * Transaction Model
 * @typedef {object} Transaction
 * @property {number} transactionId - Primary key, auto-incremented
 * @property {number} paymentId - Associated payment ID (foreign key from Payment)
 * @property {number} transactionAmount - Transaction amount (VND)
 * @property {string} transactionStatus - Status (PENDING, COMPLETED, FAILED)
 */
const Transaction = sequelize.define('Transaction', {
    /** Primary key, auto-incremented */
    transactionId: {
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
    /** Transaction amount (VND) */
    transactionAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    /** Status (PENDING, COMPLETED, FAILED) */
    transactionStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
});

module.exports = Transaction;