const { publish: publishKafka } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

const QR_STORAGE_TOPIC = process.env.KAFKA_QR_STORAGE_TOPIC || 'qr.storage';

/**
 * Publish a QR image to the storage topic. The public-service will consume
 * this message, persist the image, and serve it under /qr/:ticketId.ext
 *
 * @param {Object} params
 * @param {string} params.ticketId - Ticket identifier used for filename
 * @param {string} params.imageBase64 - Base64 (no data URL prefix)
 * @param {string} [params.mimeType='image/png'] - Image MIME type
 * @param {string|number} [params.key] - Optional Kafka key
 */
async function publishQrImage({ ticketId, imageBase64, mimeType = 'image/png', key }) {
  if (!ticketId) throw new Error('ticketId is required');
  if (!imageBase64) throw new Error('imageBase64 is required');

  const payload = { ticketId, imageBase64, mimeType };

  try {
    await publishKafka(QR_STORAGE_TOPIC, key ?? ticketId, payload);
    logger.info('Published QR image to storage topic', { topic: QR_STORAGE_TOPIC, ticketId });
    return { topic: QR_STORAGE_TOPIC, ticketId };
  } catch (error) {
    logger.error('Failed publishing QR image', { error: error.message, ticketId, topic: QR_STORAGE_TOPIC });
    throw error;
  }
}

module.exports = {
  publishQrImage,
};


