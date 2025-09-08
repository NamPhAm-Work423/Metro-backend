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
     * Process a SePay webhook payload
     */
    async handleWebhookPayload(payload) {
        try {
            if (!payload) {
                logger.warn('Empty SePay webhook payload');
                return;
            }

            const { status, paymentId, amount } = this.normalizePayload(payload);

            if (!paymentId) {
                logger.warn('SePay webhook missing description/paymentId', { status });
                return;
            }

            const payment = await Payment.findByPk(paymentId);
            if (!payment) {
                logger.warn('Payment not found for SePay webhook', { paymentId });
                return;
            }

            if (String(status).toLowerCase() !== 'completed') {
                logger.info('SePay webhook status not completed, ignoring', { paymentId, status });
                return;
            }

            // Amount guard
            if (Number(payment.paymentAmount) !== amount) {
                logger.warn('SePay webhook amount mismatch', {
                    paymentId,
                    expected: String(payment.paymentAmount),
                    actual: String(amount)
                });
                // Still ignore to avoid wrong completion
                return;
            }

            if (payment.paymentStatus === 'COMPLETED') {
                logger.info('SePay webhook received for already completed payment', { paymentId });
                return;
            }

            // Update DB in a best-effort transaction-like sequence
            await Payment.update({
                paymentStatus: 'COMPLETED',
                paymentDate: new Date(),
                paymentGatewayResponse: {
                    ...(payment.paymentGatewayResponse || {}),
                    webhook: payload
                }
            }, { where: { paymentId } });

            await Transaction.create({
                paymentId,
                transactionAmount: amount,
                transactionStatus: 'COMPLETED'
            });

            await PaymentLog.create({
                paymentId,
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
                { webhookProcessed: true }
            );

            logger.info('Processed SePay webhook successfully', { paymentId, amount });
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


