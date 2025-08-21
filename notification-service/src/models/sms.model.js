const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * SMS Model - stores all sent SMS notifications for audit and admin tracking
 * Follows SOLID principles with single responsibility for SMS channel
 */
const SMS = sequelize.define('SMS', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    // Provider information
    provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'vonage',
        comment: 'SMS provider used (vonage, twilio, etc.)'
    },
    providerMessageId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Provider message ID for tracking'
    },
    // Recipient and sender information
    toPhoneNumber: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'Recipient phone number'
    },
    fromSenderId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Sender ID or short code'
    },
    // Message content
    textContent: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'SMS text content'
    },
    messageLength: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Character count of the message'
    },
    segmentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of SMS segments'
    },
    // Template information
    template: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Template used for rendering'
    },
    variables: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Template variables used'
    },
    // Delivery status
    status: {
        type: DataTypes.ENUM('sent', 'failed', 'queued', 'delivered', 'expired', 'rejected'),
        allowNull: false,
        defaultValue: 'sent',
        comment: 'SMS delivery status'
    },
    errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error message if delivery failed'
    },
    providerResponse: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Full provider response data'
    },
    // Cost tracking
    cost: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Cost of sending the SMS'
    },
    currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        defaultValue: 'USD',
        comment: 'Currency of the cost'
    },
    // Metadata
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID if SMS is user-specific'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'SMS category (otp, notification, marketing, etc.)'
    },
    priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'SMS priority level'
    },
    // Geographic information
    countryCode: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: 'Country code derived from phone number'
    },
    // Timing
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When SMS was scheduled to be sent'
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When SMS was actually sent'
    },
    deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When delivery was confirmed'
    },
    // Audit trail
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'sms',
    timestamps: true,
    indexes: [
        {
            fields: ['toPhoneNumber']
        },
        {
            fields: ['status']
        },
        {
            fields: ['provider']
        },
        {
            fields: ['category']
        },
        {
            fields: ['userId']
        },
        {
            fields: ['sentAt']
        },
        {
            fields: ['providerMessageId']
        },
        {
            fields: ['template']
        },
        {
            fields: ['countryCode']
        }
    ],
    comment: 'Stores all SMS notification delivery logs for audit and admin tracking'
});

// Instance methods
SMS.prototype.markAsDelivered = function(deliveredAt = new Date()) {
    this.status = 'delivered';
    this.deliveredAt = deliveredAt;
    return this.save();
};

SMS.prototype.markAsFailed = function(errorMessage) {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    return this.save();
};

SMS.prototype.updateCost = function(cost, currency = 'USD') {
    this.cost = cost;
    this.currency = currency;
    return this.save();
};

// Class methods for querying
SMS.findByRecipient = function(toPhoneNumber, options = {}) {
    return this.findAll({
        where: { toPhoneNumber },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

SMS.findByStatus = function(status, options = {}) {
    return this.findAll({
        where: { status },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

SMS.findByCategory = function(category, options = {}) {
    return this.findAll({
        where: { category },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

SMS.findByProvider = function(provider, options = {}) {
    return this.findAll({
        where: { provider },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

SMS.findByCountry = function(countryCode, options = {}) {
    return this.findAll({
        where: { countryCode },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

SMS.getStats = async function(startDate, endDate) {
    const { Op } = require('sequelize');
    const whereClause = {};
    
    if (startDate && endDate) {
        whereClause.sentAt = {
            [Op.between]: [startDate, endDate]
        };
    }

    const [total, byStatus, byProvider, byCategory, byCountry, totalCost] = await Promise.all([
        this.count({ where: whereClause }),
        this.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: ['status'],
            raw: true
        }),
        this.findAll({
            attributes: [
                'provider',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: ['provider'],
            raw: true
        }),
        this.findAll({
            attributes: [
                'category',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: whereClause,
            group: ['category'],
            raw: true
        }),
        this.findAll({
            attributes: [
                'countryCode',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { ...whereClause, countryCode: { [Op.ne]: null } },
            group: ['countryCode'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10,
            raw: true
        }),
        this.findOne({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost'],
                [sequelize.fn('AVG', sequelize.col('cost')), 'avgCost']
            ],
            where: { ...whereClause, cost: { [Op.ne]: null } },
            raw: true
        })
    ]);

    // Calculate success rate
    const successCount = byStatus.filter(s => ['sent', 'delivered'].includes(s.status))
                                 .reduce((sum, s) => sum + parseInt(s.count), 0);
    const successRate = total > 0 ? (successCount / total * 100).toFixed(2) : 0;

    return {
        total,
        successRate: parseFloat(successRate),
        byStatus,
        byProvider,
        byCategory,
        byCountry,
        costs: {
            total: parseFloat(totalCost?.totalCost || 0),
            average: parseFloat(totalCost?.avgCost || 0),
            currency: 'USD'
        }
    };
};

module.exports = SMS;
