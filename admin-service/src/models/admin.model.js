module.exports = (sequelize, DataTypes) => {
    const Admin = sequelize.define('Admin', {
        adminId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        }
    }, {
        tableName: 'admins',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId']
            },
            {
                fields: ['adminLevel']
            },
            {
                fields: ['isActive']
            },
            {
                fields: ['isSuperAdmin']
            }
        ]
    });

    return Admin;
}; 