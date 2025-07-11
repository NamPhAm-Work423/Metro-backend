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
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        },
        comment: 'Route identifier from transport service'
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
        }
    ]
});

// Instance methods
Fare.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
};

Fare.prototype.isCurrentlyValid = function() {
    return this.isActive;
};

/**
 * Calculate price based on station count
 * 1-5 Station: basePrice
 * 6-10 Station: basePrice*1.2
 * 11-15 Station: basePrice*1.4
 * 16-20 Station: basePrice*1.6
 * 21-25 Station: basePrice*1.8
 * >25 Station: basePrice*2
 */
Fare.prototype.calculateStationBasedPrice = function(stationCount) {
    const basePrice = parseFloat(this.basePrice);
    
    if (stationCount <= 5) {
        return basePrice;
    } else if (stationCount <= 10) {
        return basePrice * 1.2;
    } else if (stationCount <= 15) {
        return basePrice * 1.4;
    } else if (stationCount <= 20) {
        return basePrice * 1.6;
    } else if (stationCount <= 25) {
        return basePrice * 1.8;
    } else {
        return basePrice * 2;
    }
};

/**
 * Calculate price for trip including return multiplier
 * Return ticket: Oneway*1.5
 */
Fare.prototype.calculatePriceForTrip = function(stationCount, tripType = 'Oneway') {
    let price = this.calculateStationBasedPrice(stationCount);
    
    if (tripType === 'Return') {
        price = price * 1.5;
    }
    
    return price;
};

/**
 * Calculate basic price (for compatibility with existing code)
 */
Fare.prototype.calculatePrice = function() {
    return parseFloat(this.basePrice);
};

module.exports = Fare;
