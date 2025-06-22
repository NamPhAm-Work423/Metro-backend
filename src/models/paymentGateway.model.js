// models/paymentGateway.model.js
module.exports = (sequelize, DataTypes) => {
  const PaymentGateway = sequelize.define('PaymentGateway', {
    gatewayID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.STRING  
    }
  });
  return PaymentGateway;
};
