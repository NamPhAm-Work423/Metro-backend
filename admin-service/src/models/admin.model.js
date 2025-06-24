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
            validate: {
                notEmpty: true,
                isUUID: 4
            }
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        firstName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        lastName: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        phoneNumber: {
            type: DataTypes.STRING(15),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [10, 15]
            }
        },
        adminLevel: {
            type: DataTypes.ENUM('super_admin', 'system_admin', 'operations_admin', 'support_admin'),
            allowNull: false,
            defaultValue: 'support_admin'
        },
        permissions: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false,
            defaultValue: []
        },
        department: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        lastLogin: {
            type: DataTypes.DATE,
            allowNull: true
        },
        loginCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        isSuperAdmin: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        accessLevel: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            validate: {
                min: 1,
                max: 10
            }
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

    // Instance methods
    Admin.prototype.toJSON = function() {
        const values = { ...this.get() };
        return values;
    };

    // Check if admin has specific permission
    Admin.prototype.hasPermission = function(permission) {
        return this.permissions.includes(permission) || this.isSuperAdmin;
    };

    return Admin;
}; 