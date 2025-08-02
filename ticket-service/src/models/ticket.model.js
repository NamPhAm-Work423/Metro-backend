const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Ticket = sequelize.define('Ticket', {
    ticketId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0
        }
    },
    passengerId: {
        //The number of tickets bought is stored by passengerId
        type: DataTypes.UUID,
        allowNull: true, //For guest ticket
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    fareId: {
        type: DataTypes.UUID,
        allowNull: true, //If null, it is a long term ticket
        validate: {
            notEmpty: true,
            isUUID: 4
        }
    },
    transitPassId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
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
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            notEmpty: true
        },
        comment: 'Station identifier from transport service'
    },
    destinationStationId: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            notEmpty: true
        },
        comment: 'Station identifier from transport service'
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
    ticketType: {
        type: DataTypes.ENUM('oneway', 'return', 'day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'),
        allowNull: false,
        defaultValue: 'oneway',
        comment: 'Supported ticket types based on booking data'
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
        type: DataTypes.ENUM('paypal', 'vnpay', 'card'),
        allowNull: false,
        defaultValue: 'card',
    },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Payment reference ID - ticket create payment id then use this id to get payment detail'
    },
    status: {
        type: DataTypes.ENUM('active', 'used', 'expired', 'cancelled', 'pending_payment'),
        allowNull: false,
        defaultValue: 'active',
    },
    qrCode: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    stationCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0
        },
        comment: 'Number of stations between origin and destination'
    },
    fareBreakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Detailed breakdown of fare calculation'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes for the ticket'
    },
    specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Special requests for the ticket'
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

/**
 * Calculate validity period based on ticket type
 * @param {string} ticketType 
 * @returns {{validFrom: Date, validUntil: Date}}
 */
Ticket.calculateValidityPeriod = function(ticketType) {
    const now = new Date();
    const validFrom = now;
    let validUntil = new Date(now);

    switch(ticketType) {
        case 'day_pass':
            validUntil.setDate(validUntil.getDate() + 1);
            break;
        case 'weekly_pass':
            validUntil.setDate(validUntil.getDate() + 7);
            break;
        case 'monthly_pass':
            validUntil.setDate(validUntil.getDate() + 30);
            break;
        case 'yearly_pass':
            validUntil.setDate(validUntil.getDate() + 365);
            break;
        case 'lifetime_pass':
            validUntil.setFullYear(validUntil.getFullYear() + 100); // Effectively lifetime
            break;
        default: // oneway/return
            validUntil.setDate(validUntil.getDate() + 30); // 30 days validity for regular tickets
    }

    return { validFrom, validUntil };
};

/**
 * Generate ticket records based on booking data coming from frontend
 * @param {Object} bookingData TicketBookingData from FE
 * @param {import('./fare.model')} fare Sequelize Fare instance already fetched & valid
 * @param {import('./promotion.model')} [promotion] Sequelize Promotion instance (optional)
 * @param {number} stationCount number of stations between origin & destination
 * @returns {Promise<Array<Ticket>>}
 */
Ticket.generateTicketsFromBooking = async function(bookingData, fare, promotion = null, stationCount = 0) {
    const passengerCategories = [
        { count: bookingData.numAdults || 0, type: 'adult' },
        { count: bookingData.numElder || 0, type: 'senior' },
        { count: bookingData.numTeenager || 0, type: 'teen' },
        { count: bookingData.numChild || 0, type: 'child' }
    ];

    const ticketsToCreate = [];

    for (const category of passengerCategories) {
        if (!category.count) continue;

        const originalPrice = fare.calculatePriceForTrip(stationCount, bookingData.tripType);

        let discountAmount = 0;
        if (promotion && promotion.isValidForDateTime()) {
            discountAmount = promotion.calculateDiscount(originalPrice);
        }

        const finalPrice = originalPrice - discountAmount;
        const { validFrom, validUntil } = Ticket.calculateValidityPeriod(bookingData.tripType);

        for (let i = 0; i < category.count; i++) {
            ticketsToCreate.push({
                totalPrice: finalPrice,
                fareId: fare.fareId,
                promotionId: promotion ? promotion.promotionId : null,
                originStationId: bookingData.fromStation,
                destinationStationId: bookingData.toStation,
                validFrom,
                validUntil,
                numberOfUses: bookingData.tripType.includes('pass') ? 'many' : 
                            bookingData.tripType === 'Return' ? 'return' : 'single',
                originalPrice,
                discountAmount,
                finalPrice,
                ticketType: bookingData.tripType.toLowerCase(),
                stationCount,
                paymentMethod: 'card',
                status: 'active'
            });
        }
    }

    // Bulk create tickets
    return await Ticket.bulkCreate(ticketsToCreate);
};

module.exports = Ticket;
