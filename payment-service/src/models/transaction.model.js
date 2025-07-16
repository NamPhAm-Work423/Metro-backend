const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Transaction = sequelize.define('Transaction', {
    transactionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    paymentId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    transactionAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    transactionStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
});

module.exports = Transaction;