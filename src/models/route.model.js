// models.route.model.js
module.exports = (sequelize, DataTypes) => {
  const Route = sequelize.define('Route', {
    routeID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    startLocation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    endLocation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    distance: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    duration: {
      type: DataTypes.TIME,
      allowNull: false
    }
  });
  return Route;
};