// IMPORTANT: Tracing must be initialized FIRST before any other imports
require('./tracing');

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
const TicketConsumer = require('./events/ticket.consumer');
const TransportEventConsumer = require('./events/transport.consumer');
const ticketGrpcClient = require('./grpc/ticket.client');
const userGrpcClient = require('./grpc/user.client');
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
		const syncMode = (process.env.DB_SYNC_MODE || 'safe').toLowerCase();
		const syncOptions = syncMode === 'alter' ? { alter: true } : { force: false };
		await sequelize.sync(syncOptions);
		logger.info('Database synchronized successfully', { syncMode });
	} catch (error) {
		logger.error('Database initialization failed', { error: error.message });
		// Don't exit - service should work without database logging
	}

	// Initialize gRPC clients
	try {
		await Promise.all([
			ticketGrpcClient.initialize(),
			userGrpcClient.initialize()
		]);
		logger.info('gRPC clients initialized successfully');
	} catch (error) {
		logger.error('gRPC clients initialization failed', { 
			error: error.message,
			stack: error.stack
		});
		// Continue without gRPC - service should work with fallback logic
	}

	// Setup providers with enhanced configuration
	const emailProvider = new ResendEmailProvider({
		apiKey: process.env.RESEND_API_KEY,
		defaultFromAddress: process.env.EMAIL_FROM,
		maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES) || 3
	});
	
	// Initialize Vonage SMS provider
	const smsProvider = new VonageSmsProvider({
		apiKey: process.env.VONAGE_API_KEY,
		apiSecret: process.env.VONAGE_API_SECRET,
		from: process.env.VONAGE_FROM,
		maxRetries: parseInt(process.env.SMS_MAX_RETRIES) || 3
	});
	logger.info('Using Vonage SMS Provider');
	const templateService = new TemplateService();
	const notificationService = new NotificationService({ emailProvider, smsProvider, templateService });
	const eventHandler = new NotificationEventHandler(notificationService);
	
	// Initialize ticket consumer
	const ticketConsumer = new TicketConsumer(notificationService);

	// Initialize transport event consumer
	const transportEventConsumer = new TransportEventConsumer(notificationService);

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
	
	// Start ticket consumer
	await ticketConsumer.start();
	
	// Start transport event consumer
	await transportEventConsumer.start();

	// Graceful shutdown
	const shutdown = async (signal) => {
		logger.info(`Received ${signal}, shutting down...`);
		
		// Stop ticket consumer
		await ticketConsumer.stop().catch(err => 
			logger.error('Error stopping ticket consumer', { error: err.message })
		);
		
		// Stop transport event consumer
		await transportEventConsumer.stop().catch(err => 
			logger.error('Error stopping transport event consumer', { error: err.message })
		);
		
		// Close gRPC clients
		try {
			ticketGrpcClient.close();
			userGrpcClient.close();
			logger.info('gRPC clients closed successfully');
		} catch (error) {
			logger.error('Error closing gRPC clients', { error: error.message });
		}
		
		server.close(() => process.exit(0));
	};
	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) start();

module.exports = { start };


