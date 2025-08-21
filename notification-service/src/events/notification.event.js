const { logger } = require('../config/logger');

class NotificationEventHandler {
	constructor(notificationService) {
		this.notificationService = notificationService;
	}

	/**
	 * Handle a generic notification event
	 * Expected message structure:
	 * {
	 *   channel: 'email'|'sms',
	 *   to: string|string[],
	 *   subject?: string,         // for email
	 *   template?: string,        // template key without extension
	 *   variables?: object,       // template variables
	 *   html?: string,
	 *   text?: string,
	 *   from?: string
	 * }
	 */
	async handle(message) {
		const { channel } = message;
		if (!channel) throw new Error('Notification channel is required');
		switch (channel) {
			case 'email':
				return this.notificationService.sendEmail(message);
			case 'sms':
				return this.notificationService.sendSms(message);
			default:
				logger.warn('Unknown notification channel', { channel });
		}
	}
}

module.exports = NotificationEventHandler;


