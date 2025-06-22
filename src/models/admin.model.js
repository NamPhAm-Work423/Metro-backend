// models/admin.model.js
module.exports = (sequelize, DataTypes) => {
  const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    level: { type: DataTypes.STRING },  // ví dụ: super, normal
  });
  return Admin;
};
