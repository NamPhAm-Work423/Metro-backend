const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Promotion = sequelize.define('Promotion', {
    promotionId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true,
            len: [3, 50]
        }
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
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
        allowNull: false,
        defaultValue: 'percentage',
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    maxDiscountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    minPurchaseAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    applicableTicketTypes: {
        type: DataTypes.ARRAY(DataTypes.ENUM('single', 'return', 'day_pass', 'weekly_pass', 'monthly_pass')),
        allowNull: false,
        defaultValue: ['single']
    },
    applicablePassengerTypes: {
        type: DataTypes.ARRAY(DataTypes.ENUM('adult', 'child', 'student', 'senior', 'disabled')),
        allowNull: false,
        defaultValue: ['adult']
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
    daysOfWeek: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: true,
        defaultValue: [0, 1, 2, 3, 4, 5, 6], // 0=Sunday, 6=Saturday
        validate: {
            isValidDays(value) {
                if (value && value.some(day => day < 0 || day > 6)) {
                    throw new Error('Days of week must be between 0 and 6');
                }
            }
        }
    },
    timeSlots: {
        type: DataTypes.ARRAY(DataTypes.JSON),
        allowNull: true,
        defaultValue: []
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
            discount = parseFloat(this.value); // Fixed upgrade value
            break;
        default:
            discount = 0;
    }

    // Apply maximum discount limit if set
    if (this.maxDiscountAmount && discount > parseFloat(this.maxDiscountAmount)) {
        discount = parseFloat(this.maxDiscountAmount);
    }

    // Ensure discount doesn't exceed original price
    return Math.min(discount, price);
};

Promotion.prototype.incrementUsage = async function() {
    this.usageCount += 1;
    await this.save();
};

module.exports = Promotion;
