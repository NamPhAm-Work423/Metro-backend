const { publish } = require('../kafka/kafkaProducer');
const { logger } = require('../config/logger');

class AdminEventProducer {
    /** We dont find any thing to publish for admin */
}

module.exports = new AdminEventProducer(); 