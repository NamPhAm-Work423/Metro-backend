const { KafkaEventConsumer } = require('../../kafka/kafkaConsumer');
const { logger } = require('../../config/logger');
const { Payment, Transaction, PaymentLog } = require('../../models/index.model');
const { 
    publishPaymentCompleted,
    publishPaymentFailed,
    publishPaymentCancelled
} = require('../payment.producer');

/**
 * SePay Hook Consumer
 * Listens to 'sepay.webhook.event' and finalizes payments based on webhook payload
 */
class SepayHookConsumer {
    constructor() {
        this.eventConsumer = null;
    }

    /**
     * Normalize payload into { status, paymentId, amount }
     */
    normalizePayload(raw) {
        // SePay bank webhook format: { gateway, transferType, content, transferAmount, ... }
        if (this.isSepayBankWebhook(raw)) {
            return this.normalizeSepayBankPayload(raw);
        }

        // Flat format: { status, description, amount }
        if (raw && (raw.status || raw.description)) {
            return {
                status: raw.status,
                paymentId: (raw.description || '').trim(),
                amount: Number(raw.amount)
            };
        }

        // Structured webhook: { event_type, resource: { status, amount{value}, description, custom_id } }
        const eventType = raw?.event_type || '';
        const resource = raw?.resource || {};
        const normalizedStatus = resource.status || (eventType.includes('COMPLETED') ? 'completed' : (eventType.includes('DENIED') ? 'denied' : raw?.status));
        const paymentId = (resource.description || resource.custom_id || raw?.custom_id || '').trim();
        const amountValue = resource.amount?.value ?? resource.amount;

        return {
            status: normalizedStatus,
            paymentId,
            amount: Number(amountValue)
        };
    }

    /**
     * Check if this is SePay bank webhook format
     * @param {Object} payload - Webhook payload
     * @returns {boolean} - True if SePay bank format
     */
    isSepayBankWebhook(payload) {
        return payload && 
               payload.hasOwnProperty('gateway') && 
               payload.hasOwnProperty('transferType') && 
               payload.hasOwnProperty('content') &&
               payload.hasOwnProperty('transferAmount');
    }

    /**
     * Normalize SePay bank webhook payload
     * @param {Object} raw - Raw SePay bank webhook payload
     * @returns {Object} - Normalized payload
     */
    normalizeSepayBankPayload(raw) {
        const content = (raw.content || '').trim();
        
        logger.info('SePay bank webhook content extraction debug', {
            content: content,
            contentLength: content.length
        });
        
        let ticketIdMatch = content.match(/Payment for ticket ([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        
        if (!ticketIdMatch) {
            ticketIdMatch = content.match(/Payment for ticket ([a-f0-9]{32})/i);
            logger.info('SePay bank webhook trying 32-char hex format', {
                found: !!ticketIdMatch,
                ticketId: ticketIdMatch ? ticketIdMatch[1] : null
            });
        } else {
            logger.info('SePay bank webhook found UUID format', {
                ticketId: ticketIdMatch[1]
            });
        }
        
        const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

        logger.info('SePay bank webhook normalized payload', {
            ticketId: ticketId,
            status: raw.transferType === 'in' ? 'completed' : 'pending',
            amount: Number(raw.transferAmount || 0),
            bankTransactionId: raw.id,
            gateway: raw.gateway
        });

        return {
            status: raw.transferType === 'in' ? 'completed' : 'pending',
            paymentId: null, // Will be resolved by ticket ID lookup
            ticketId: ticketId,
            amount: Number(raw.transferAmount || 0),
            bankTransactionId: raw.id,
            gateway: raw.gateway,
            referenceCode: raw.referenceCode
        };
    }

    /**
     * Process a SePay webhook payload
     */
    async handleWebhookPayload(payload) {
        try {
            if (!payload) {
                logger.warn('Empty SePay webhook payload');
                return;
            }

            logger.info('SePay webhook payload received', {
                isBankWebhook: this.isSepayBankWebhook(payload),
                hasGateway: !!payload.gateway,
                hasTransferType: !!payload.transferType,
                hasContent: !!payload.content,
                hasTransferAmount: !!payload.transferAmount,
                payloadKeys: Object.keys(payload)
            });

            const normalizedData = this.normalizePayload(payload);
            const { status, paymentId, ticketId, amount } = normalizedData;

            logger.info('SePay webhook normalized data', {
                status,
                paymentId,
                ticketId,
                amount,
                hasTicketId: !!ticketId,
                hasPaymentId: !!paymentId
            });

            // For SePay bank webhooks, find payment by ticket ID
            let payment;
            if (paymentId) {
                // Legacy format - find by payment ID
                payment = await Payment.findByPk(paymentId);
                if (!payment) {
                    logger.warn('Payment not found for SePay webhook', { paymentId });
                    return;
                }
            } else if (ticketId) {
                // SePay bank format - find by ticket ID
                logger.info('SePay bank webhook searching for payment by ticket ID', { ticketId });
                
                // Try exact match first
                payment = await Payment.findOne({
                    where: { ticketId: ticketId }
                });
                
                // If not found and ticketId is 32-char hex, try converting to UUID format
                if (!payment && ticketId.length === 32 && /^[a-f0-9]{32}$/i.test(ticketId)) {
                    const uuidFormat = `${ticketId.substring(0, 8)}-${ticketId.substring(8, 12)}-${ticketId.substring(12, 16)}-${ticketId.substring(16, 20)}-${ticketId.substring(20, 32)}`;
                    
                    logger.info('SePay bank webhook trying UUID format conversion', {
                        originalTicketId: ticketId,
                        uuidFormat: uuidFormat
                    });
                    
                    payment = await Payment.findOne({
                        where: { ticketId: uuidFormat }
                    });
                }
                
                if (!payment) {
                    // Debug: Let's see what payments exist for this ticket format
                    const similarPayments = await Payment.findAll({
                        where: {
                            ticketId: {
                                [require('sequelize').Op.like]: `%${ticketId.substring(0, 8)}%`
                            }
                        },
                        limit: 5,
                        attributes: ['paymentId', 'ticketId', 'paymentStatus', 'paymentAmount']
                    });
                    
                    logger.warn('Payment not found for SePay bank webhook', { 
                        searchTicketId: ticketId,
                        ticketIdLength: ticketId.length,
                        similarPayments: similarPayments.map(p => ({
                            paymentId: p.paymentId,
                            ticketId: p.ticketId,
                            status: p.paymentStatus,
                            amount: p.paymentAmount
                        }))
                    });
                    return;
                }
                
                logger.info('SePay bank webhook found payment', {
                    ticketId: ticketId,
                    paymentId: payment.paymentId,
                    paymentStatus: payment.paymentStatus,
                    paymentAmount: payment.paymentAmount
                });
            } else {
                logger.warn('SePay webhook missing both paymentId and ticketId', { status });
                return;
            }

            if (String(status).toLowerCase() !== 'completed') {
                logger.info('SePay webhook status not completed, ignoring', { 
                    paymentId: payment.paymentId, 
                    ticketId: payment.ticketId, 
                    status 
                });
                return;
            }

            // Amount guard
            if (Number(payment.paymentAmount) !== amount) {
                logger.warn('SePay webhook amount mismatch', {
                    paymentId: payment.paymentId,
                    ticketId: payment.ticketId,
                    expected: String(payment.paymentAmount),
                    actual: String(amount)
                });
                // Still ignore to avoid wrong completion
                return;
            }

            if (payment.paymentStatus === 'COMPLETED') {
                logger.info('SePay webhook received for already completed payment', { 
                    paymentId: payment.paymentId,
                    ticketId: payment.ticketId 
                });
                return;
            }

            // Update DB in a best-effort transaction-like sequence
            await Payment.update({
                paymentStatus: 'COMPLETED',
                paymentDate: new Date(),
                paymentGatewayResponse: {
                    ...(payment.paymentGatewayResponse || {}),
                    webhook: payload,
                    ...(normalizedData.bankTransactionId && { bankTransactionId: normalizedData.bankTransactionId }),
                    ...(normalizedData.gateway && { gateway: normalizedData.gateway }),
                    ...(normalizedData.referenceCode && { referenceCode: normalizedData.referenceCode })
                }
            }, { where: { paymentId: payment.paymentId } });

            await Transaction.create({
                paymentId: payment.paymentId,
                transactionAmount: amount,
                transactionStatus: 'COMPLETED'
            });

            await PaymentLog.create({
                paymentId: payment.paymentId,
                paymentLogType: 'WEBHOOK',
                paymentLogStatus: 'COMPLETED',
                paymentLogDate: new Date()
            });

            await publishPaymentCompleted(
                payment.paymentId,
                payment.ticketId,
                payment.passengerId,
                amount,
                'sepay',
                { 
                    webhookProcessed: true,
                    ...(normalizedData.bankTransactionId && { bankTransactionId: normalizedData.bankTransactionId }),
                    ...(normalizedData.gateway && { gateway: normalizedData.gateway })
                }
            );

            logger.info('Processed SePay webhook successfully', { 
                paymentId: payment.paymentId, 
                ticketId: payment.ticketId,
                amount,
                gateway: normalizedData.gateway,
                bankTransactionId: normalizedData.bankTransactionId
            });
        } catch (error) {
            logger.error('Failed to process SePay webhook payload', { error: error.message });
            throw error;
        }
    }

    /**
     * Kafka message handler
     */
    async processMessage(messageData) {
        const { topic, partition, message } = messageData;
        if (!message.value) {
            logger.warn('Received empty SePay webhook message', { topic, partition });
            return;
        }
        let payload;
        try {
            payload = JSON.parse(message.value.toString());
        } catch (e) {
            logger.error('JSON parse error for SePay webhook message', { error: e.message });
            return;
        }
        await this.handleWebhookPayload(payload.payload || payload);
    }

    async start() {
        try {
            const topics = ['sepay.webhook.event'];
            this.eventConsumer = new KafkaEventConsumer({
                clientId: process.env.KAFKA_CLIENT_ID || 'payment-service',
                brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
                groupId: 'payment-service-sepay-webhook',
                topics,
                eachMessage: this.processMessage.bind(this)
            });
            await this.eventConsumer.start();
            logger.info('SePay hook consumer started successfully');
        } catch (error) {
            logger.error('Failed to start SePay hook consumer', { error: error.message });
            throw error;
        }
    }

    async stop() {
        if (this.eventConsumer) {
            await this.eventConsumer.stop();
            logger.info('SePay hook consumer stopped');
        }
    }

    async isHealthy() {
        return this.eventConsumer ? this.eventConsumer.isHealthy() : false;
    }

    async getStats() {
        return this.eventConsumer ? this.eventConsumer.getStats() : {};
    }
}

module.exports = SepayHookConsumer;


