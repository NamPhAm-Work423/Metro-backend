const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Fare model
 * @description - Fare model for the fare table
 * @param {Object} fareData - The fare data
 * @param {Object} fareData.fareId - The fare ID
 * @param {Object} fareData.routeId - The route ID
 * The fare is calculate based on the number of stations between the origin and destination station
 * The fare is calculate based on the ticket type
 * The fare is calculate based on the passenger type
 * The fare is calculate based on the base price
 * The fare is calculate based on the currency
 * The fare is calculate based on the isActive
 */
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
        type: DataTypes.ENUM('single'),
        allowNull: false,
        defaultValue: 'single',
        comment: 'Only single-trip tickets are supported'
    },
    passengerType: {
        type: DataTypes.ENUM('child', 'teen', 'adult', 'senior'),
        allowNull: true,
        defaultValue: 'adult',
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
        },
        comment: 'Number of zones or stations (deprecated in favor of dynamic calculation)'
    },
    pricePerStation: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 2000,
        validate: {
            min: 0
        },
        comment: 'Additional price per station beyond base price'
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

Fare.prototype.calculatePrice = function() {
    return parseFloat(this.basePrice);
};

Fare.prototype.calculateStationBasedPrice = function(stationCount) {
    const basePrice = parseFloat(this.basePrice);
    const pricePerStation = parseFloat(this.pricePerStation) || 3000;
    
    return basePrice + (stationCount * pricePerStation);
};

module.exports = Fare;
