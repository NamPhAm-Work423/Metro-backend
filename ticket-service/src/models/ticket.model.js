const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
    ticketId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    passengerId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    fareId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    promotionId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            isUUID: 4
        }
    },
    originStationId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    destinationStationId: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    validFrom: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    validUntil: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    originalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    discountAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0
        }
    },
    finalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    paymentMethod: {
        type: DataTypes.ENUM('cash', 'card', 'mobile_payment', 'metro_card'),
        allowNull: false,
        defaultValue: 'card',
    },
    paymentId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            isUUID: 4
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled', 'refunded'),
        allowNull: false,
        defaultValue: 'active',
    },
    ticketType: {
        type: DataTypes.ENUM('single', 'return', 'day_pass', 'weekly_pass', 'monthly_pass'),
        allowNull: false,
        defaultValue: 'single',
    },
    qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }
}, {
    tableName: 'tickets',
    timestamps: true,
    indexes: [
        {
            fields: ['passengerId']
        },
        {
            fields: ['tripId']
        },
        {
            fields: ['status']
        },
        {
            fields: ['validFrom', 'validUntil']
        }
    ]
});

// Instance methods
Ticket.prototype.toJSON = function() {
    const values = { ...this.get() };
    return values;
};

Ticket.prototype.isValid = function() {
    const now = new Date();
    return this.status === 'active' && 
           this.validFrom <= now && 
           this.validUntil >= now && 
           this.isActive;
};

Ticket.prototype.isExpired = function() {
    const now = new Date();
    return this.validUntil < now;
};

Ticket.prototype.calculateFinalPrice = function() {
    return this.originalPrice - this.discountAmount;
};

module.exports = Ticket;
