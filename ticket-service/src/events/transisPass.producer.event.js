const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

async function publishTransitPassCreated(transitPass) {
  try {
    const eventData = {
      transitPassId: transitPass.transitPassId,
      transitPassType: transitPass.transitPassType,
      price: transitPass.price,
      currency: transitPass.currency,
      isActive: transitPass.isActive,
      createdAt: new Date().toISOString()
    };
    await publish('transitPass.created', transitPass.transitPassId, eventData);
    logger.info('TransitPass created event published', { transitPassId: transitPass.transitPassId });
  } catch (error) {
    logger.error('Failed to publish TransitPass created event', { error: error.message, transitPassId: transitPass?.transitPassId });
  }
}

async function publishTransitPassUpdated(transitPass) {
  try {
    const eventData = {
      transitPassId: transitPass.transitPassId,
      transitPassType: transitPass.transitPassType,
      price: transitPass.price,
      currency: transitPass.currency,
      isActive: transitPass.isActive,
      updatedAt: new Date().toISOString()
    };
    await publish('transitPass.updated', transitPass.transitPassId, eventData);
    logger.info('TransitPass updated event published', { transitPassId: transitPass.transitPassId });
  } catch (error) {
    logger.error('Failed to publish TransitPass updated event', { error: error.message, transitPassId: transitPass?.transitPassId });
  }
}

async function publishTransitPassDeleted(transitPassId) {
  try {
    const eventData = {
      transitPassId,
      deletedAt: new Date().toISOString()
    };
    await publish('transitPass.deleted', transitPassId, eventData);
    logger.info('TransitPass deleted event published', { transitPassId });
  } catch (error) {
    logger.error('Failed to publish TransitPass deleted event', { error: error.message, transitPassId });
  }
}

module.exports = {
  publishTransitPassCreated,
  publishTransitPassUpdated,
  publishTransitPassDeleted
};


