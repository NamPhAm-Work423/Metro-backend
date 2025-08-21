require('dotenv').config();
const App = require('./app');
const { logger } = require('./config/logger');
const { KafkaEventConsumer } = require('./kafka/kafkaConsumer');
const NotificationService = require('./services/notification.service');
const ResendEmailProvider = require('./services/providers/resend.provider');
const VonageSmsProvider = require('./services/providers/vonage.provider');
const TemplateService = require('./services/template.service');
const NotificationEventHandler = require('./events/notification.event');
const { startAuthConsumer } = require('./events/auth.consumer');
const { initializeRedis } = require('./config/redis');
const { sequelize } = require('./models');

async function start() {
	const port = process.env.PORT || 8009;

	logger.info('Starting Notification Service', {
		service: 'notification-service',
		environment: process.env.NODE_ENV || 'development',
		port
	});

	// Initialize infrastructure
	await initializeRedis().catch((err) => logger.warn('Redis init failed', { error: err.message }));
	
	// Initialize database
	try {
		await sequelize.sync({ alter: true }); // Use alter in development, force: false in production
		logger.info('Database synchronized successfully');
	} catch (error) {
		logger.error('Database initialization failed', { error: error.message });
		// Don't exit - service should work without database logging
	}

	// Setup providers with enhanced configuration
	const emailProvider = new ResendEmailProvider({
		apiKey: process.env.RESEND_API_KEY,
		defaultFromAddress: process.env.EMAIL_FROM,
		maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES) || 3
	});
	
	const smsProvider = new VonageSmsProvider({
		apiKey: process.env.VONAGE_API_KEY,
		apiSecret: process.env.VONAGE_API_SECRET,
		from: process.env.VONAGE_FROM,
		maxRetries: parseInt(process.env.SMS_MAX_RETRIES) || 3
	});
	const templateService = new TemplateService();
	const notificationService = new NotificationService({ emailProvider, smsProvider, templateService });
	const eventHandler = new NotificationEventHandler(notificationService);

	// Start HTTP server
	const app = new App().getApp();
	const server = app.listen(port, () => logger.info(`HTTP server listening on ${port}`));

	// Kafka consumer (generic)
	const kafkaConsumer = new KafkaEventConsumer({
		clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
		brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
		groupId: process.env.KAFKA_GROUP_ID || 'notification-service-group',
		topics: (process.env.KAFKA_TOPICS || 'notification.events').split(','),
		eachMessage: async ({ topic, partition, message }) => {
			try {
				const payload = JSON.parse(message.value.toString());
				await eventHandler.handle(payload);
			} catch (error) {
				logger.error('Failed processing notification event', {
					error: error.message,
					topic,
					partition
				});
			}
		}
	});

	await kafkaConsumer.start();

	// Kafka consumer (auth topics)
	startAuthConsumer(eventHandler);

	// Graceful shutdown
	const shutdown = (signal) => {
		logger.info(`Received ${signal}, shutting down...`);
		server.close(() => process.exit(0));
	};
	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) start();

module.exports = { start };


