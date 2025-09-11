const path = require('path');
const fs = require('fs');
const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');

class QRService {
    constructor() {
        this.topic = process.env.KAFKA_QR_STORAGE_TOPIC || 'qr.storage';
        this.clientId = process.env.KAFKA_CLIENT_ID || 'public-service-qr';
        this.groupId = process.env.KAFKA_QR_GROUP_ID || 'public-service-qr-group';
        this.brokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
        this.storageDir = path.join(__dirname, '..', 'public', 'qr');
        this.consumer = null;
        this.ensureStorageDir();
    }

    ensureStorageDir() {
        try {
            fs.mkdirSync(this.storageDir, { recursive: true });
        } catch (err) {
            logger.error('Failed to ensure QR storage directory', { error: err.message, storageDir: this.storageDir });
            throw err;
        }
    }

    getExtensionFromMime(mimeType) {
        const map = {
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/gif': 'gif',
            'image/webp': 'webp'
        };
        return map[mimeType] || 'png';
    }

    getFilePath(ticketId, ext = 'png') {
        return path.join(this.storageDir, `${ticketId}.${ext}`);
    }

    getPublicUrl(req, ticketId, ext = 'png') {
        const host = req?.get ? `${req.protocol}://${req.get('host')}` : '';
        const relative = `/qr/${ticketId}.${ext}`;
        return host ? `${host}${relative}` : relative;
    }

    async saveImage({ ticketId, imageBase64, mimeType = 'image/png' }) {
        if (!ticketId || !imageBase64) {
            throw new Error('ticketId and imageBase64 are required');
        }
        const ext = this.getExtensionFromMime(mimeType);
        const filePath = this.getFilePath(ticketId, ext);
        const buffer = Buffer.from(imageBase64, 'base64');
        await fs.promises.writeFile(filePath, buffer);
        logger.info('QR image saved', { ticketId, filePath });
        return { filePath, ext };
    }

    async handleKafkaMessage({ message }) {
        try {
            const value = message.value?.toString();
            if (!value) return;
            const payload = JSON.parse(value);
            const ticketId = payload.ticketId || payload.id || payload.ticket_id;
            const imageBase64 = payload.imageBase64 || payload.qrImageBase64 || payload.qr_base64;
            const mimeType = payload.mimeType || payload.mime || 'image/png';
            if (!ticketId || !imageBase64) {
                logger.warn('Invalid QR storage payload', { payload });
                return;
            }
            await this.saveImage({ ticketId, imageBase64, mimeType });
        } catch (err) {
            logger.error('Failed to process QR storage message', { error: err.message });
        }
    }

    async initializeConsumer() {
        if (this.consumer) return;
        this.consumer = new KafkaEventConsumer({
            clientId: this.clientId,
            brokers: this.brokers,
            groupId: this.groupId,
            topics: [this.topic],
            eachMessage: async ({ topic, partition, message }) => {
                await this.handleKafkaMessage({ message });
            }
        });
        await this.consumer.start();
        logger.info('QR Kafka consumer started', { topic: this.topic });
    }
}

module.exports = new QRService();
