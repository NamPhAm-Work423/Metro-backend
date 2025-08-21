const { KafkaEventConsumer } = require('../kafka/kafkaConsumer');
const { logger } = require('../config/logger');

function startAuthConsumer(eventHandler) {
	const topics = (process.env.KAFKA_AUTH_TOPICS || '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);

	if (topics.length === 0) {
		logger.info('No KAFKA_AUTH_TOPICS configured; skipping auth consumer');
		return null;
	}

	const consumer = new KafkaEventConsumer({
		clientId: (process.env.KAFKA_CLIENT_ID || 'notification-service') + '-auth',
		brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
		groupId: (process.env.KAFKA_GROUP_ID || 'notification-service-group') + '-auth',
		topics,
		eachMessage: async ({ topic, partition, message }) => {
			try {
				const payload = JSON.parse(message.value.toString());
				await eventHandler.handle(payload);
			} catch (error) {
				logger.error('Failed processing auth notification event', {
					error: error.message,
					topic,
					partition
				});
			}
		}
	});

	consumer.start().catch(err => logger.error('Auth consumer failed to start', { error: err.message }));
	return consumer;
}

module.exports = { startAuthConsumer };


