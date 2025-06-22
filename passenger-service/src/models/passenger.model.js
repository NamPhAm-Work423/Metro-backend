module.exports = (sequelize, DataTypes) => {
    const Passenger = sequelize.define('Passenger', {
        passengerId: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
    }, {
        tableName: 'passengers',
        timestamps: true,
    });
    return Passenger;
};
