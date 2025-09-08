const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const { logger } = require('../config/logger');
const { publishTicketActivated } = require('../events/ticket.producer');

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
    totalPassengers: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: 1
        },
        comment: 'Total number of passengers for this ticket'
    },
    passengerId: {
        //The number of tickets bought is stored by passengerId
        type: DataTypes.UUID,
        allowNull: true, //For guest ticket
        validate: {
            isUUID: 4
        }
    },
    tripId: {
        type: DataTypes.UUID,
        allowNull: true,
        validate: {
            isUUID: 4
        }
    },
    fareId: {
        type: DataTypes.UUID,
        allowNull: true, //If null, it is a long term ticket
        validate: {
            isUUID: 4
        }
    },
    transitPassId: {
        type: DataTypes.UUID,
        allowNull: true, //If null, it is a long term ticket
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
        allowNull: true,
    },
    validFrom: {
        type: DataTypes.DATE,
        allowNull: true, //If null, it is a long term ticket waiting for activation
    },
    validUntil: {
        type: DataTypes.DATE,
        allowNull: true, //If null, it is a long term ticket waiting for activation
    },
    ticketType: {
        type: DataTypes.ENUM('oneway', 'return', 'day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'),
        allowNull: false,
        defaultValue: 'oneway',
        comment: 'Supported ticket types based on booking data'
    },
    usedList: {
        type: DataTypes.ARRAY(DataTypes.DATE),
        allowNull: true,
    },
    activatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When long-term ticket was created (countdown started for 30 days)'
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
        type: DataTypes.ENUM('paypal', 'vnpay', 'card', 'metro_card', 'free'),
        allowNull: false,
        defaultValue: 'card',
    },
    paymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Payment reference ID - ticket create payment id then use this id to get payment detail'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'pending_payment', 'payment_confirmed', 'used', 'expired', 'cancelled'),
        allowNull: false,
        defaultValue: 'inactive',
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
 * Ensure totalPrice and finalPrice are consistent
 * This method should be called after any price calculations
 */
Ticket.prototype.syncPrices = function() {
    this.finalPrice = this.calculateFinalPrice();
    this.totalPrice = this.finalPrice;
    return this;
};

/**
 * Static helper method to calculate final price from original price and discount
 * @param {number} originalPrice 
 * @param {number} discountAmount 
 * @returns {number} Final price after discount
 */
Ticket.calculateFinalPrice = function(originalPrice, discountAmount) {
    return originalPrice - discountAmount;
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
 * When long-term ticket is activated, start count down for long-term ticket
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Activated ticket
 */
Ticket.startCountDown = async function(ticketId) {
    try {
        const ticket = await Ticket.findByPk(ticketId);
        
        if (!ticket) {
            throw new Error('Ticket not found');
        }

        // Only allow activation for long-term tickets (passes)
        const longTermTypes = ['day_pass', 'weekly_pass', 'monthly_pass', 'yearly_pass', 'lifetime_pass'];
        if (!longTermTypes.includes(ticket.ticketType)) {
            throw new Error('Only long-term tickets can be activated');
        }

        // Check if ticket is already active
        if (ticket.status === 'active') {
            throw new Error('Ticket is already active');
        }

        // Check if ticket is paid (can be 'payment_confirmed' or 'inactive' status)
        if (!['payment_confirmed', 'inactive'].includes(ticket.status)) {
            throw new Error('Ticket must be paid before activation');
        }

        // Calculate new validity period from activation time
        const { validFrom, validUntil } = Ticket.calculateValidityPeriod(ticket.ticketType);
        const activatedAt = new Date();
        // Update ticket with new validity period and status
        const updatedTicket = await ticket.update({
            status: 'active',
            validFrom: validFrom,
            validUntil: validUntil,
            activatedAt: activatedAt,
        });

        logger.info('Long-term ticket activated successfully', {
            ticketId: ticket.ticketId,
            ticketType: ticket.ticketType,
            validFrom: validFrom,
            validUntil: validUntil,
            activatedAt: activatedAt,
            passengerId: ticket.passengerId
        });

        // Publish ticket activated event for notifications and other services
        try {
            const paymentData = {
                paymentMethod: ticket.paymentMethod,
                status: ticket.status,
                gatewayResponse: null
            };
            
            await publishTicketActivated(updatedTicket, paymentData);
            logger.info('Ticket activated event published for long-term ticket', {
                ticketId: ticket.ticketId,
                ticketType: ticket.ticketType,
                activatedAt: activatedAt
            });
        } catch (publishError) {
            logger.error('Failed to publish ticket activated event for long-term ticket', {
                ticketId: ticket.ticketId,
                error: publishError.message
            });
            // Don't fail the activation if event publishing fails
        }

        return updatedTicket;
    } catch (error) {
        logger.error('Error activating long-term ticket', {
            error: error.message,
            ticketId: ticketId,
            activatedAt: activatedAt
        });
        throw error;
    }
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

        // Use the centralized price calculation method
        const finalPrice = Ticket.calculateFinalPrice(originalPrice, discountAmount);
        const { validFrom, validUntil } = Ticket.calculateValidityPeriod(bookingData.tripType);

        for (let i = 0; i < category.count; i++) {
            ticketsToCreate.push({
                totalPrice: finalPrice,
                totalPassengers: 1, // Each ticket is for 1 passenger
                fareId: fare.fareId,
                promotionId: promotion ? promotion.promotionId : null,
                originStationId: bookingData.fromStation,
                destinationStationId: bookingData.toStation,
                validFrom,
                validUntil,
                originalPrice,
                discountAmount,
                finalPrice,
                ticketType: bookingData.tripType.toLowerCase(),
                stationCount,
                paymentMethod: 'card',
                status: 'pending_payment' // Tickets start as pending payment, not active
            });
        }
    }

    // Bulk create tickets
    return await Ticket.bulkCreate(ticketsToCreate);
};
//When Date() is equal to activatedAt, turn to active
Ticket.prototype.turnToInactive = async function() {
    if (this.activatedAt === null) {
        return;
    }
    
    const now = new Date();
    // When current date equals activatedAt, turn from inactive to active
    if (now >= this.activatedAt && this.status === 'inactive') {
        this.status = 'active';
        await this.save();
    }
};

module.exports = Ticket;
