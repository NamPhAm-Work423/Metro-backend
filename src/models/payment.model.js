// models.payment.model.js
module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    paymentID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    ticketID: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Ticket',
        key: 'ticketID'
      }
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
  return Payment;
};