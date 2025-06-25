module.exports = (sequelize, DataTypes) => {
    const Station = sequelize.define('Station', {
        stationId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        stationCode: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [2, 10]
            }
        },
        stationName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100]
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        operatingHours: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {
                weekdays: { open: "05:30", close: "23:00" },
                weekends: { open: "06:00", close: "23:00" }
            }
        },
        facilities: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: true,
            defaultValue: []
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'stations',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['stationCode']
            },
            {
                fields: ['stationName']
            },
            {
                fields: ['isActive']
            }
        ]
    });

    // Instance methods
    Station.prototype.toJSON = function() {
        const values = { ...this.get() };
        return values;
    };

    // Class methods
    Station.associate = function(models) {
        // Define associations here when other models are added
        // e.g., Station.hasMany(models.Route, { foreignKey: 'stationId' });
    };

    return Station;
}; 