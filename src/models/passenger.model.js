// models/passenger.model.js
module.exports = (sequelize, DataTypes) => {
  const Passenger = sequelize.define('Passenger', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName:    { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING },
  });
  return Passenger;
};
