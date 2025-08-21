const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Email Model - stores all sent email notifications for audit and admin tracking
 * Follows SOLID principles with single responsibility for email channel
 */
const Email = sequelize.define('Email', {
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
        defaultValue: 'resend',
        comment: 'Email provider used (resend, sendgrid, etc.)'
    },
    providerMessageId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Provider message ID for tracking'
    },
    // Recipient and sender information
    toEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Recipient email address'
    },
    fromEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Sender email address'
    },
    // Message content
    subject: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Email subject line'
    },
    htmlContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'HTML email content'
    },
    textContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Plain text email content'
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
        type: DataTypes.ENUM('sent', 'failed', 'queued', 'delivered', 'bounced', 'opened', 'clicked'),
        allowNull: false,
        defaultValue: 'sent',
        comment: 'Email delivery status'
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
    // Metadata
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User ID if email is user-specific'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Email category (auth, booking, payment, etc.)'
    },
    priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Email priority level'
    },
    // Attachments
    hasAttachments: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether email contains attachments'
    },
    attachmentCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of attachments'
    },
    // Timing
    scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When email was scheduled to be sent'
    },
    sentAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When email was actually sent'
    },
    deliveredAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When delivery was confirmed'
    },
    openedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When email was first opened'
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
    tableName: 'emails',
    timestamps: true,
    indexes: [
        {
            fields: ['toEmail']
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
        }
    ],
    comment: 'Stores all email notification delivery logs for audit and admin tracking'
});

// Instance methods
Email.prototype.markAsDelivered = function(deliveredAt = new Date()) {
    this.status = 'delivered';
    this.deliveredAt = deliveredAt;
    return this.save();
};

Email.prototype.markAsOpened = function(openedAt = new Date()) {
    if (!this.openedAt) {
        this.openedAt = openedAt;
        return this.save();
    }
    return Promise.resolve(this);
};

Email.prototype.markAsFailed = function(errorMessage) {
    this.status = 'failed';
    this.errorMessage = errorMessage;
    return this.save();
};

// Class methods for querying
Email.findByRecipient = function(toEmail, options = {}) {
    return this.findAll({
        where: { toEmail },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

Email.findByStatus = function(status, options = {}) {
    return this.findAll({
        where: { status },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

Email.findByCategory = function(category, options = {}) {
    return this.findAll({
        where: { category },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

Email.findByProvider = function(provider, options = {}) {
    return this.findAll({
        where: { provider },
        order: [['sentAt', 'DESC']],
        ...options
    });
};

Email.getStats = async function(startDate, endDate) {
    const { Op } = require('sequelize');
    const whereClause = {};
    
    if (startDate && endDate) {
        whereClause.sentAt = {
            [Op.between]: [startDate, endDate]
        };
    }

    const [total, byStatus, byProvider, byCategory] = await Promise.all([
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
        })
    ]);

    // Calculate success rate
    const successCount = byStatus.find(s => ['sent', 'delivered'].includes(s.status))?.count || 0;
    const successRate = total > 0 ? (successCount / total * 100).toFixed(2) : 0;

    return {
        total,
        successRate: parseFloat(successRate),
        byStatus,
        byProvider,
        byCategory
    };
};

module.exports = Email;
