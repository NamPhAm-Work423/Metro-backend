const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const { logger } = require('../config/logger');

const PassengerDiscount = sequelize.define('PassengerDiscount', {
    discountId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    passengerType: {
        type: DataTypes.ENUM('adult', 'child', 'senior', 'student', 'elder', 'teenager'),
        allowNull: false,
        unique: true
    },
    discountType: {
        type: DataTypes.ENUM('percentage', 'fixed_amount', 'free'),
        allowNull: false,
        defaultValue: 'percentage'
    },
    discountValue: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100 // For percentage, max 100%
        }
    },
    description: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    validFrom: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    validUntil: {
        type: DataTypes.DATE,
        allowNull: true // null means no expiration
    }
}, {
    tableName: 'passenger_discounts',
    timestamps: true,
    indexes: [
        {
            fields: ['passengerType']
        },
        {
            fields: ['isActive']
        },
        {
            fields: ['validFrom', 'validUntil']
        }
    ],
    hooks: {
        beforeCreate: async (discount) => {
            logger.info('Creating passenger discount', {
                passengerType: discount.passengerType,
                discountType: discount.discountType,
                discountValue: discount.discountValue
            });
        },
        beforeUpdate: async (discount) => {
            logger.info('Updating passenger discount', {
                discountId: discount.discountId,
                passengerType: discount.passengerType,
                discountValue: discount.discountValue
            });
        }
    }
});

// Instance methods
PassengerDiscount.prototype.isCurrentlyValid = function() {
    const now = new Date();
    return this.isActive && 
           this.validFrom <= now && 
           (this.validUntil === null || this.validUntil >= now);
};

PassengerDiscount.prototype.calculateDiscount = function(originalPrice) {
    if (!this.isCurrentlyValid()) {
        return 0;
    }

    const price = parseFloat(originalPrice);
    let discount = 0;

    switch (this.discountType) {
        case 'percentage':
            discount = price * (parseFloat(this.discountValue) / 100);
            break;
        case 'fixed_amount':
            discount = parseFloat(this.discountValue);
            break;
        case 'free':
            discount = price; // 100% discount
            break;
        default:
            discount = 0;
    }

    // Ensure discount doesn't exceed original price
    return Math.min(discount, price);
};

PassengerDiscount.prototype.getFinalPrice = function(originalPrice) {
    const discount = this.calculateDiscount(originalPrice);
    return Math.max(0, originalPrice - discount);
};

module.exports = PassengerDiscount;
