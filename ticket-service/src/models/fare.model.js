const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
    originStationId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    destinationStationId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    ticketType: {
        type: DataTypes.ENUM('single', 'return', 'day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'),
        allowNull: true,
    },
    passengerType: {
        type: DataTypes.ENUM('adult', 'child', 'student', 'senior', 'disabled'),
        allowNull: true,
    },
    basePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    zones: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    effectiveFrom: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    effectiveUntil: {
        type: DataTypes.DATE,
        allowNull: true,
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
            fields: ['originStationId', 'destinationStationId']
        },
        {
            fields: ['ticketType', 'passengerType']
        },
        {
            fields: ['effectiveFrom', 'effectiveUntil']
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

Fare.prototype.calculatePrice = function(isPeakHour = false) {
    const basePrice = parseFloat(this.basePrice);
    if (isPeakHour) {
        return basePrice * parseFloat(this.peakHourMultiplier);
    }
    return basePrice;
};

module.exports = Fare;
