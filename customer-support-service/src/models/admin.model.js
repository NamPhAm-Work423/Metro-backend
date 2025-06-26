module.exports = (sequelize, DataTypes) => {
    const Admin = sequelize.define('Admin', {
        adminId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            unique: true,
            comment: 'Reference to user ID from API Gateway'
        }
    }, {
        tableName: 'admins',
        timestamps: true
    });

    return Admin;
}; 