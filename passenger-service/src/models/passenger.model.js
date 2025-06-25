module.exports = (sequelize, DataTypes) => {
    const Passenger = sequelize.define('Passenger', {
        passengerId: {
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
                len: [9, 15]
            }
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            validate: {
                isDate: true,
                isBefore: new Date().toISOString().split('T')[0] // Must be before today
            }
        },
        gender: {
            type: DataTypes.ENUM('male', 'female', 'other'),
            allowNull: true
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        ticketList: {
            type: DataTypes.ARRAY(DataTypes.UUID),
            allowNull: true,
            defaultValue: []
        }
    }, {
        tableName: 'passengers',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId']
            },
            {
                fields: ['phoneNumber']
            }
        ]
    });

    // Instance methods
    Passenger.prototype.toJSON = function() {
        const values = { ...this.get() };
        return values;
    };

    return Passenger;
};
