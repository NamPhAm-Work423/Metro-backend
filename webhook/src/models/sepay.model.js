const { mongoose } = require('../config/database');

/**
 * Sepay Webhook Hook Model
 * Specialized model for Sepay webhook events
 */
const sepaySchema = new mongoose.Schema({
    // Sepay webhook identification
    webhookId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Sepay specific event types
    eventType: {
        type: String,
        required: true,
        enum: [
            'PAYMENT.CAPTURE.COMPLETED',
            'PAYMENT.CAPTURE.DENIED', 
            'PAYMENT.CAPTURE.PENDING',
            'CHECKOUT.ORDER.COMPLETED',
            'PAYMENT.CAPTURE.REFUNDED',
            'SEPAY_BANK_TRANSFER'
        ],
        index: true
    },
    
    resourceType: {
        type: String,
        required: true,
        enum: ['capture', 'order', 'payment', 'refund', 'bank_transfer']
    },
    
    resourceId: {
        type: String,
        required: true,
        index: true
    },
    
    // Raw Sepay webhook data for audit
    rawPayload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    
    // Request metadata
    headers: {
        sepaySignature: String,
        sepayTimestamp: String,
        userAgent: String,
        contentType: String
    },
    
    // Processing status
    status: {
        type: String,
        enum: ['received', 'processing', 'processed', 'failed', 'duplicate'],
        default: 'received',
        index: true
    },
    
    // Processing attempts
    processingAttempts: {
        type: Number,
        default: 0
    },
    
    lastProcessedAt: {
        type: Date
    },
    
    // Error tracking
    errorMessage: {
        type: String
    },
    
    errorStack: {
        type: String
    },
    
    // Sepay business data extracted
    sepayData: {
        // Transaction information
        transactionId: String,
        orderId: String,
        captureId: String,
        refundId: String,
        
        // Amount information
        amount: {
            value: String,
            currency: String
        },
        
        // Payment status
        paymentStatus: String,
        
        // Customer information
        customerId: String,
        customerEmail: String,
        customerName: {
            firstName: String,
            lastName: String
        },
        
        // Merchant information
        merchantId: String,
        merchantName: String,
        
        // Additional Sepay specific fields
        createTime: Date,
        updateTime: Date,
        
        // Custom fields from Sepay
        customId: String,
        invoiceId: String,
        description: String,
        
        // Sepay specific fields
        sepayTransactionHash: String,
        sepayBlockNumber: String,
        sepayNetwork: String,
        
        // SePay Bank specific fields
        gateway: String,
        accountNumber: String,
        referenceCode: String,
        bankTransactionId: String
    },
    
    // Events published to Kafka
    eventsPublished: [{
        service: {
            type: String,
            required: true,
            enum: ['ticket-service', 'payment-service', 'notification-service']
        },
        topic: {
            type: String,
            required: true
        },
        eventData: mongoose.Schema.Types.Mixed,
        publishedAt: {
            type: Date,
            default: Date.now
        },
        messageId: String,
        success: {
            type: Boolean,
            default: true
        },
        errorMessage: String
    }],
    
    // Idempotency for Sepay
    idempotencyKey: {
        type: String,
        required: true
    },
    
    // Security
    sourceIp: {
        type: String,
        required: true
    },
    
    userAgent: String,
    
    // Sepay signature verification
    signatureVerified: {
        type: Boolean,
        default: false
    },
    
    verificationMethod: {
        type: String,
        enum: ['webhook_signature', 'hmac', 'skip_dev'],
        default: 'webhook_signature'
    }
    
}, {
    timestamps: true, // createdAt, updatedAt
    collection: 'sepay_webhook_hooks'
});

// Indexes for Sepay specific queries
sepaySchema.index({ eventType: 1, createdAt: -1 });
sepaySchema.index({ 'sepayData.orderId': 1 });
sepaySchema.index({ 'sepayData.transactionId': 1 });
sepaySchema.index({ 'sepayData.customerId': 1 });
sepaySchema.index({ resourceId: 1, eventType: 1 });
sepaySchema.index({ status: 1, createdAt: -1 });
sepaySchema.index({ idempotencyKey: 1 }, { unique: true });

// Instance methods
sepaySchema.methods.markAsProcessing = function() {
    this.status = 'processing';
    this.processingAttempts += 1;
    this.lastProcessedAt = new Date();
    return this.save();
};

sepaySchema.methods.markAsProcessed = function() {
    this.status = 'processed';
    this.lastProcessedAt = new Date();
    return this.save();
};

sepaySchema.methods.markAsFailed = function(error) {
    this.status = 'failed';
    this.errorMessage = error.message;
    this.errorStack = error.stack;
    this.lastProcessedAt = new Date();
    return this.save();
};

sepaySchema.methods.markAsDuplicate = function() {
    this.status = 'duplicate';
    return this.save();
};

sepaySchema.methods.addPublishedEvent = function(service, topic, eventData, messageId, success = true, errorMessage = null) {
    this.eventsPublished.push({
        service,
        topic,
        eventData,
        messageId,
        success,
        errorMessage,
        publishedAt: new Date()
    });
    return this.save();
};

sepaySchema.methods.extractSepayBusinessData = function(rawPayload) {
    const resource = rawPayload.resource || {};
    
    this.sepayData = {
        // Transaction/Order/Capture/Refund ID
        transactionId: resource.transaction_id || resource.id,
        orderId: resource.order_id || rawPayload.order_id,
        captureId: rawPayload.event_type?.includes('CAPTURE') ? resource.id : null,
        refundId: rawPayload.event_type?.includes('REFUND') ? resource.id : null,
        
        // Amount
        amount: {
            value: resource.amount?.value || resource.amount,
            currency: resource.amount?.currency || resource.currency || 'VND'
        },
        
        // Status
        paymentStatus: resource.status || rawPayload.status,
        
        // Customer
        customerId: resource.customer_id || resource.customer?.id,
        customerEmail: resource.customer?.email || resource.email,
        customerName: {
            firstName: resource.customer?.first_name || resource.customer?.name,
            lastName: resource.customer?.last_name
        },
        
        // Merchant
        merchantId: resource.merchant_id || rawPayload.merchant_id,
        merchantName: resource.merchant_name || rawPayload.merchant_name,
        
        // Timestamps
        createTime: resource.create_time ? new Date(resource.create_time) : new Date(),
        updateTime: resource.update_time ? new Date(resource.update_time) : new Date(),
        
        // Additional fields
        customId: resource.custom_id || rawPayload.custom_id,
        invoiceId: resource.invoice_id || rawPayload.invoice_id,
        description: resource.description || rawPayload.description,
        
        // Sepay specific fields
        sepayTransactionHash: resource.transaction_hash || rawPayload.transaction_hash,
        sepayBlockNumber: resource.block_number || rawPayload.block_number,
        sepayNetwork: resource.network || rawPayload.network || 'mainnet'
    };
    
    return this.save();
};

sepaySchema.methods.extractSepayBankBusinessData = function(rawPayload) {
    // Extract ticket ID from content
    const content = (rawPayload.content || '').trim();
    // Try UUID format with dashes first: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    let ticketIdMatch = content.match(/Payment for ticket ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    
    // If no match, try 32-character hex format without dashes: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    if (!ticketIdMatch) {
        ticketIdMatch = content.match(/Payment for ticket ([a-f0-9]{32})/i);
    }
    
    const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;
    
    this.sepayData = {
        // Transaction information
        transactionId: rawPayload.referenceCode || rawPayload.id.toString(),
        orderId: ticketId,
        
        // Amount information
        amount: {
            value: rawPayload.transferAmount?.toString() || '0',
            currency: 'VND'
        },
        
        // Payment status
        paymentStatus: rawPayload.transferType === 'in' ? 'COMPLETED' : 'PENDING',
        
        // Additional SePay bank specific fields
        customId: ticketId,
        description: rawPayload.description || rawPayload.content,
        
        // Bank specific information
        gateway: rawPayload.gateway,
        accountNumber: rawPayload.accountNumber,
        referenceCode: rawPayload.referenceCode,
        bankTransactionId: rawPayload.id?.toString(),
        
        // Timestamps
        createTime: rawPayload.transactionDate ? new Date(rawPayload.transactionDate) : new Date(),
        updateTime: new Date()
    };
    
    return this.save();
};

// Static methods
sepaySchema.statics.findByWebhookId = function(webhookId) {
    return this.findOne({ webhookId });
};

sepaySchema.statics.findByIdempotencyKey = function(idempotencyKey) {
    return this.findOne({ idempotencyKey });
};

sepaySchema.statics.findByOrderId = function(orderId) {
    return this.find({ 'sepayData.orderId': orderId }).sort({ createdAt: -1 });
};

sepaySchema.statics.findByTransactionId = function(transactionId) {
    return this.find({ 'sepayData.transactionId': transactionId }).sort({ createdAt: -1 });
};

sepaySchema.statics.findByCustomerId = function(customerId) {
    return this.find({ 'sepayData.customerId': customerId }).sort({ createdAt: -1 });
};

sepaySchema.statics.findByResourceId = function(resourceId) {
    return this.find({ resourceId }).sort({ createdAt: -1 });
};

sepaySchema.statics.getSepayStatistics = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
                    $lte: endDate || new Date()
                }
            }
        },
        {
            $group: {
                _id: {
                    eventType: '$eventType',
                    status: '$status'
                },
                count: { $sum: 1 },
                totalAmount: {
                    $sum: { $toDouble: '$sepayData.amount.value' }
                }
            }
        },
        {
            $group: {
                _id: '$_id.eventType',
                statistics: {
                    $push: {
                        status: '$_id.status',
                        count: '$count',
                        totalAmount: '$totalAmount'
                    }
                },
                totalCount: { $sum: '$count' },
                totalValue: { $sum: '$totalAmount' }
            }
        }
    ]);
};

sepaySchema.statics.getFailedWebhooks = function(limit = 50) {
    return this.find({ status: 'failed' })
        .sort({ lastProcessedAt: -1 })
        .limit(limit);
};

sepaySchema.statics.getDuplicateWebhooks = function(limit = 50) {
    return this.find({ status: 'duplicate' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Virtual for getting formatted amount
sepaySchema.virtual('formattedAmount').get(function() {
    if (this.sepayData.amount?.value && this.sepayData.amount?.currency) {
        return `${this.sepayData.amount.value} ${this.sepayData.amount.currency}`;
    }
    return null;
});

// Ensure virtual fields are serialized
sepaySchema.set('toJSON', { virtuals: true });
sepaySchema.set('toObject', { virtuals: true });

const SepayHook = mongoose.model('SepayHook', sepaySchema);

module.exports = SepayHook;