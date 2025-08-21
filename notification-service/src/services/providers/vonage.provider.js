const { Vonage } = require('@vonage/server-sdk');
const { logger } = require('../../config/logger');

class VonageSmsProvider {
	constructor({ apiKey, apiSecret, from }) {
		if (!apiKey || !apiSecret) throw new Error('Vonage credentials are required');
		if (!from) throw new Error('Vonage default from (sender) is required');
		this.from = from;
		this.client = new Vonage({ apiKey, apiSecret });
	}

	async sendSms({ to, text, from }) {
		if (!to || !text) throw new Error('Missing required sms fields');
		try {
			const response = await this.client.sms.send({
				to,
				from: from || this.from,
				text
			});
			logger.info('Vonage SMS sent', { to, status: response?.messages?.[0]?.status });
			return response;
		} catch (error) {
			logger.error('Vonage SMS failed', { error: error.message, to });
			throw error;
		}
	}
}

module.exports = VonageSmsProvider;


