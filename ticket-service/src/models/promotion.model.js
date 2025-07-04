const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Promotion = sequelize.define('Promotion', {
    promotionId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        validate: {
            notEmpty: true,
            len: [3, 50]
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            notEmpty: true,
            len: [3, 100]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM('percentage', 'fixed_amount', 'buy_one_get_one', 'free_upgrade'),
        allowNull: true,
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    applicableTicketTypes: {
        type: DataTypes.ARRAY(DataTypes.ENUM('oneway', 'return', 'day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass')),
        allowNull: true,
        defaultValue: [],
    },
    applicablePassengerTypes: {
        type: DataTypes.ARRAY(DataTypes.ENUM('adult', 'child', 'student', 'senior', 'disabled')),
        allowNull: true,
        defaultValue: []
    },
    applicableRoutes: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: []
    },
    usageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        }
    },
    usageCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    userUsageLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 1
        }
    },
    validFrom: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    validUntil: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
}, {
    tableName: 'promotions',
    timestamps: true,
    indexes: [
        {
            fields: ['code']
        },
        {
            fields: ['type']
        },
        {
            fields: ['validFrom', 'validUntil']
        },
        {
            fields: ['isActive']
        }
    ]
});

// Instance methods
Promotion.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
};

Promotion.prototype.isCurrentlyValid = function() {
    const now = new Date();
    return this.validFrom <= now && 
           this.validUntil >= now &&
           this.isActive &&
           (this.usageLimit === null || this.usageCount < this.usageLimit);
};

Promotion.prototype.isValidForDateTime = function(dateTime = new Date()) {
    if (!this.isCurrentlyValid()) {
        return false;
    }

    const dayOfWeek = dateTime.getDay();
    if (this.daysOfWeek && !this.daysOfWeek.includes(dayOfWeek)) {
        return false;
    }

    if (this.timeSlots && this.timeSlots.length > 0) {
        const timeStr = dateTime.toTimeString().substr(0, 5); // HH:MM format
        const isValidTime = this.timeSlots.some(slot => {
            return timeStr >= slot.start && timeStr <= slot.end;
        });
        if (!isValidTime) {
            return false;
        }
    }

    return true;
};

Promotion.prototype.calculateDiscount = function(originalPrice) {
    const price = parseFloat(originalPrice);
    let discount = 0;

    switch (this.type) {
        case 'percentage':
            discount = price * (parseFloat(this.value) / 100);
            break;
        case 'fixed_amount':
            discount = parseFloat(this.value);
            break;
        case 'buy_one_get_one':
            discount = price * 0.5; // 50% off for BOGO
            break;
        case 'free_upgrade':
            // For pass upgrades (e.g. day → week, month → year)
            if (this.applicableTicketTypes.some(t => t.includes('pass'))) {
                discount = price * 0.3; // 30% off upgrade to next tier
            } else {
                discount = parseFloat(this.value); // Fixed upgrade value
            }
            break;
        default:
            discount = 0;
    }

    // Apply maximum discount limit if set
    if (this.maxDiscountAmount && discount > parseFloat(this.maxDiscountAmount)) {
        discount = parseFloat(this.maxDiscountAmount);
    }

    // Long-term passes get reduced discount
    if (this.applicableTicketTypes.some(t => ['yearly_pass', 'lifetime_pass'].includes(t))) {
        discount = discount * 0.5; // 50% of normal discount for long-term passes
    }

    // Ensure discount doesn't exceed original price
    return Math.min(discount, price);
};

Promotion.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    await this.save();
};

/**
 * Return final price after applying promotion.
 * @param {number} originalPrice
 * @returns {{finalPrice:number, discountAmount:number}}
 */
Promotion.prototype.applyToPrice = function(originalPrice) {
    const discount = this.calculateDiscount(originalPrice);
    return { finalPrice: originalPrice - discount, discountAmount: discount };
};

module.exports = Promotion;
