/**
 * Model Index for Payment Service
 *
 * Exports all models and defines associations:
 * - Payment hasMany Transaction (paymentId)
 * - Payment hasMany PaymentLog (paymentId)
 * - Transaction and PaymentLog belongTo Payment
 */
const sequelize = require('../config/database');
const Payment = require('./payment.model');
const PaymentLog = require('./paymentLog.model');
const Transaction = require('./transaction.model');

// Define relationships between models

// Payment-Transaction relationship
Payment.hasMany(Transaction, { foreignKey: 'paymentId', as: 'transactions' });
Transaction.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

// Payment-PaymentLog relationship
Payment.hasMany(PaymentLog, { foreignKey: 'paymentId', as: 'logs' });
PaymentLog.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

// Note: Foreign key relationships to other services (e.g., ticketId, passengerId)
// are handled via foreign keys only since these models exist in different services
// The actual joins would be handled at the application level or via federation

module.exports = {
    sequelize,
    Payment,
    PaymentLog,
    Transaction
}; 