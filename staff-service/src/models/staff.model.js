module.exports = (sequelize, DataTypes) => {
    const Staff = sequelize.define('Staff', {
        staffId: {
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
        employeeId: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [3, 20]
            }
        },
        department: {
            type: DataTypes.ENUM('operations', 'maintenance', 'customer_service', 'security', 'management'),
            allowNull: false
        },
        position: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100]
            }
        },
        hireDate: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: true
            }
        },
        shift: {
            type: DataTypes.ENUM('morning', 'afternoon', 'night', 'rotating'),
            allowNull: false
        },
        salary: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        permissions: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: []
        }
    }, {
        tableName: 'staff',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId']
            },
            {
                unique: true,
                fields: ['employeeId']
            },
            {
                fields: ['department']
            },
            {
                fields: ['isActive']
            }
        ]
    });

    // Instance methods
    Staff.prototype.toJSON = function() {
        const values = { ...this.get() };
        delete values.salary; // Don't expose salary in JSON by default
        return values;
    };

    return Staff;
}; 