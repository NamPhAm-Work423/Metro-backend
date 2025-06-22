// models.schedule.model.js
module.exports = (sequelize, DataTypes) => {
  const Schedule = sequelize.define('Schedule', {
    scheduleID: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    routeID: {
      type: DataTypes.UUID,
      allowNull: false
    },
    departureTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    arrivalTime: {
      type: DataTypes.TIME,
      allowNull: false
    },
    frequency: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
  return Schedule;
};