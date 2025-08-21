const { Resend } = require('resend');
const { logger } = require('../../config/logger');

class ResendEmailProvider {
	constructor(apiKey, defaultFromAddress) {
		if (!apiKey) throw new Error('Resend API key is required');
		if (!defaultFromAddress) throw new Error('Default from address is required');
		this.client = new Resend(apiKey);
		this.defaultFrom = defaultFromAddress;
	}

	async sendEmail({ to, subject, html, text, from }) {
		if (!to || !subject || (!html && !text)) {
			throw new Error('Missing required email fields');
		}
		try {
			const response = await this.client.emails.send({
				from: from || this.defaultFrom,
				to: Array.isArray(to) ? to : [to],
				subject,
				html,
				text
			});
			logger.info('Resend email queued', { id: response?.id, to });
			return response;
		} catch (error) {
			logger.error('Resend email failed', { error: error.message, to, subject });
			throw error;
		}
	}
}

module.exports = ResendEmailProvider;


