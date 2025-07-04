const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

/**Just calculate fare price based on route and station count, long term price is not included */
const Fare = sequelize.define('Fare', {
    fareId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    routeId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        },
        comment: 'Price for oneway/return ticket'
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'VND',
        type: DataTypes.ENUM('VND', 'USD', 'CNY'),
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
}, {
    tableName: 'fares',
    timestamps: true,
    indexes: [
        {
            fields: ['routeId']
        },
        {
            fields: ['ticketType']
        }
    ]
});

// Instance methods
Fare.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
};

Fare.prototype.isCurrentlyValid = function() {
    const now = new Date();
    return this.effectiveFrom <= now && 
           (this.effectiveUntil === null || this.effectiveUntil >= now) &&
           this.isActive;
};



module.exports = Fare;
