const { mongoose } = require('../config/database');

/**
 * PayPal Webhook Hook Model
 * Specialized model cho PayPal webhook events
 */
const paypalHookSchema = new mongoose.Schema({
    // PayPal webhook identification
    webhookId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // PayPal specific event types
    eventType: {
        type: String,
        required: true,
        enum: [
            'PAYMENT.CAPTURE.COMPLETED',
            'PAYMENT.CAPTURE.DENIED', 
            'CHECKOUT.ORDER.APPROVED',
            'PAYMENT.CAPTURE.PENDING',
            'CHECKOUT.ORDER.COMPLETED',
            'PAYMENT.CAPTURE.REFUNDED'
        ],
        index: true
    },
    
    resourceType: {
        type: String,
        required: true,
        enum: ['capture', 'order', 'payment', 'refund']
    },
    
    resourceId: {
        type: String,
        required: true,
        index: true
    },
    
    // Raw PayPal webhook data for audit
    rawPayload: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    
    // Request metadata
    headers: {
        paypalAuthAlgo: String,
        paypalTransmissionId: String,
        paypalCertId: String,
        paypalTransmissionSig: String,
        paypalTransmissionTime: String,
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
    
    // PayPal business data extracted
    paypalData: {
        // Order information
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
        
        // Payer information
        payerId: String,
        payerEmail: String,
        payerName: {
            givenName: String,
            surname: String
        },
        
        // Merchant information
        merchantId: String,
        facilitatorAccessToken: String,
        
        // Links
        links: [{
            href: String,
            rel: String,
            method: String
        }],
        
        // Additional PayPal specific fields
        createTime: Date,
        updateTime: Date,
        finalCapture: Boolean,
        
        // Custom fields từ PayPal
        customId: String,
        invoiceId: String,
        description: String
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
    
    // Idempotency cho PayPal
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
    
    // PayPal signature verification
    signatureVerified: {
        type: Boolean,
        default: false
    },
    
    verificationMethod: {
        type: String,
        enum: ['webhook_signature', 'certificate', 'skip_dev'],
        default: 'webhook_signature'
    }
    
}, {
    timestamps: true, // createdAt, updatedAt
    collection: 'paypal_webhook_hooks'
});

// Indexes for PayPal specific queries
paypalHookSchema.index({ eventType: 1, createdAt: -1 });
paypalHookSchema.index({ 'paypalData.orderId': 1 });
paypalHookSchema.index({ 'paypalData.captureId': 1 });
paypalHookSchema.index({ 'paypalData.payerId': 1 });
paypalHookSchema.index({ resourceId: 1, eventType: 1 });
paypalHookSchema.index({ status: 1, createdAt: -1 });
paypalHookSchema.index({ idempotencyKey: 1 }, { unique: true });

// Instance methods
paypalHookSchema.methods.markAsProcessing = function() {
    this.status = 'processing';
    this.processingAttempts += 1;
    this.lastProcessedAt = new Date();
    return this.save();
};

paypalHookSchema.methods.markAsProcessed = function() {
    this.status = 'processed';
    this.lastProcessedAt = new Date();
    return this.save();
};

paypalHookSchema.methods.markAsFailed = function(error) {
    this.status = 'failed';
    this.errorMessage = error.message;
    this.errorStack = error.stack;
    this.lastProcessedAt = new Date();
    return this.save();
};

paypalHookSchema.methods.markAsDuplicate = function() {
    this.status = 'duplicate';
    return this.save();
};

paypalHookSchema.methods.addPublishedEvent = function(service, topic, eventData, messageId, success = true, errorMessage = null) {
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

paypalHookSchema.methods.extractPayPalBusinessData = function(rawPayload) {
    const resource = rawPayload.resource || {};
    
    this.paypalData = {
        // Order/Capture/Refund ID
        orderId: resource.id || rawPayload.resource?.supplementary_data?.related_ids?.order_id,
        captureId: rawPayload.event_type?.includes('CAPTURE') ? resource.id : null,
        refundId: rawPayload.event_type?.includes('REFUND') ? resource.id : null,
        
        // Amount
        amount: {
            value: resource.amount?.value,
            currency: resource.amount?.currency_code
        },
        
        // Status
        paymentStatus: resource.status,
        
        // Payer
        payerId: resource.payer?.payer_id,
        payerEmail: resource.payer?.email_address,
        payerName: {
            givenName: resource.payer?.name?.given_name,
            surname: resource.payer?.name?.surname
        },
        
        // Merchant
        merchantId: resource.payee?.merchant_id || resource.merchant_id,
        facilitatorAccessToken: resource.facilitator_access_token,
        
        // Links
        links: resource.links || [],
        
        // Timestamps
        createTime: resource.create_time ? new Date(resource.create_time) : null,
        updateTime: resource.update_time ? new Date(resource.update_time) : null,
        
        // Additional fields
        finalCapture: resource.final_capture,
        customId: resource.custom_id,
        invoiceId: resource.invoice_id,
        description: resource.description
    };
    
    return this.save();
};

// Static methods
paypalHookSchema.statics.findByWebhookId = function(webhookId) {
    return this.findOne({ webhookId });
};

paypalHookSchema.statics.findByIdempotencyKey = function(idempotencyKey) {
    return this.findOne({ idempotencyKey });
};

paypalHookSchema.statics.findByOrderId = function(orderId) {
    return this.find({ 'paypalData.orderId': orderId }).sort({ createdAt: -1 });
};

paypalHookSchema.statics.findByCaptureId = function(captureId) {
    return this.find({ 'paypalData.captureId': captureId }).sort({ createdAt: -1 });
};

paypalHookSchema.statics.findByPayerId = function(payerId) {
    return this.find({ 'paypalData.payerId': payerId }).sort({ createdAt: -1 });
};

paypalHookSchema.statics.findByResourceId = function(resourceId) {
    return this.find({ resourceId }).sort({ createdAt: -1 });
};

paypalHookSchema.statics.getPayPalStatistics = function(startDate, endDate) {
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
                    $sum: { $toDouble: '$paypalData.amount.value' }
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

paypalHookSchema.statics.getFailedWebhooks = function(limit = 50) {
    return this.find({ status: 'failed' })
        .sort({ lastProcessedAt: -1 })
        .limit(limit);
};

paypalHookSchema.statics.getDuplicateWebhooks = function(limit = 50) {
    return this.find({ status: 'duplicate' })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// Virtual for getting formatted amount
paypalHookSchema.virtual('formattedAmount').get(function() {
    if (this.paypalData.amount?.value && this.paypalData.amount?.currency) {
        return `${this.paypalData.amount.value} ${this.paypalData.amount.currency}`;
    }
    return null;
});

// Ensure virtual fields are serialized
paypalHookSchema.set('toJSON', { virtuals: true });
paypalHookSchema.set('toObject', { virtuals: true });

const PayPalHook = mongoose.model('PayPalHook', paypalHookSchema);

module.exports = PayPalHook;
