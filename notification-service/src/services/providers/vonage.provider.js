const { Vonage } = require('@vonage/server-sdk');
const { logger } = require('../../config/logger');
const { BaseProvider, ISmsProvider } = require('./base.provider');

/**
 * Vonage SMS Provider - implements SMS sending via Vonage API
 * Follows SOLID principles with single responsibility and dependency injection
 * Extends BaseProvider for common functionality and implements ISmsProvider interface
 */
class VonageSmsProvider extends BaseProvider {
	constructor(config) {
		super(config);
		this.validateConfig(config, ['apiKey', 'apiSecret', 'from']);
		this.defaultFrom = config.from;
		this.client = new Vonage({ 
			apiKey: config.apiKey, 
			apiSecret: config.apiSecret 
		});
	}

	async sendSms({ to, text, from }) {
		this.validateSmsInput({ to, text });
		
		const smsData = {
			to: this.formatPhoneNumber(to),
			from: from || this.defaultFrom,
			text: text.substring(0, 1600) // Vonage limit
		};

		try {
			const response = await this.executeWithRetry(() => 
				this.client.sms.send(smsData)
			);
			
			const message = response?.messages?.[0];
			const status = message?.status;
			
			if (status === '0') {
				logger.info('Vonage SMS sent successfully', { 
					to: smsData.to,
					messageId: message['message-id'],
					cost: message.cost
				});
				
				return this.createResponse(true, message['message-id'], 'vonage', {
					status: 'sent',
					cost: message.cost
				});
			} else {
				const errorText = message['error-text'] || 'Unknown error';
				throw new Error(`SMS failed with status ${status}: ${errorText}`);
			}
		} catch (error) {
			logger.error('Vonage SMS failed', { 
				error: error.message, 
				to: smsData.to,
				from: smsData.from,
				stack: error.stack
			});
			throw new Error(`SMS delivery failed: ${error.message}`);
		}
	}

	validateSmsInput({ to, text }) {
		if (!to) throw new Error('SMS recipient number is required');
		if (!text) throw new Error('SMS text content is required');
		if (text.length > 1600) {
			logger.warn('SMS text truncated to 1600 characters', { 
				originalLength: text.length 
			});
		}
	}

	formatPhoneNumber(phone) {
		// Remove any non-digit characters and ensure it starts with country code
		const cleaned = phone.replace(/\D/g, '');
		
		// Auto-detect and format Vietnam phone numbers
		if (cleaned.length === 10 && cleaned.startsWith('0')) {
			// Vietnam mobile numbers: 09x, 08x, 07x, 03x, 05x, 06x
			const vietnamMobilePrefixes = ['09', '08', '07', '03', '05', '06'];
			const prefix = cleaned.substring(0, 2);
			
			if (vietnamMobilePrefixes.includes(prefix)) {
				// Convert 0981434704 → 84981434704
				const formattedNumber = '84' + cleaned.substring(1);
				logger.info('Auto-formatted Vietnam phone number', {
					original: phone,
					cleaned: cleaned,
					formatted: formattedNumber
				});
				return formattedNumber;
			}
		}
		
		// If it doesn't start with a country code, warn but return as-is
		if (cleaned.length === 10) {
			logger.warn('Phone number appears to be missing country code', { 
				original: phone, 
				cleaned 
			});
		}
		
		return cleaned;
	}
}

module.exports = VonageSmsProvider;


