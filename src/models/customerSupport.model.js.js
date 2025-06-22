// models/customerSupport.model.js
module.exports = (sequelize, DataTypes) => {
  const CustomerSupport = sequelize.define('CustomerSupport', {
    supportID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    customerID: {
      type: DataTypes.UUID,
      allowNull: false
    },
    issueDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'open'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    adminID: {
      type: DataTypes.UUID,
      allowNull: true
    },
    staffID: {
      type: DataTypes.UUID,
      allowNull: true
    },
  });
  return CustomerSupport;
};