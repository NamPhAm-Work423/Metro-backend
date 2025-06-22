// models/metroStaff.model.js
module.exports = (sequelize, DataTypes) => {
  const MetroStaff = sequelize.define('MetroStaff', {
    staffID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    position: {
      type: DataTypes.STRING
    }
  });
  return MetroStaff;
};
