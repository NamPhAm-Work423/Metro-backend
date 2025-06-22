// models.metroStaff.model.js
module.exports = (sequelize, DataTypes) => {
  const MetroStaff = sequelize.define('MetroStaff', {
    staffID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
  return MetroStaff;
};