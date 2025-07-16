const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Payment = sequelize.define('Payment', {
    paymentId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    passengerId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    paymentAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.ENUM('MOMO', 'VNPAY', 'BANK_TRANSFER', 'CASH'),
        allowNull: false
    },
    paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
        allowNull: false
    },
    paymentDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
});

module.exports = Payment;