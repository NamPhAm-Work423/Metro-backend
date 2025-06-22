// models/fare.model.js
module.exports = (sequelize, DataTypes) => {
  const Fare = sequelize.define('Fare', {
    fareID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false
    },
    time: {
      type: DataTypes.TIME,
      allowNull: true
    },
    price: {
      type: DataTypes.ENUM('standard', 'discounted'),
      defaultValue: 'standard'
    },
  });
  return Fare;
};