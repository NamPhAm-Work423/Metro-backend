const { Resend } = require('resend');
const { logger } = require('../../config/logger');
const { BaseProvider, IEmailProvider } = require('./base.provider');

/**
 * Resend Email Provider - implements email sending via Resend API
 * Follows SOLID principles with single responsibility and dependency injection
 * Extends BaseProvider for common functionality and implements IEmailProvider interface
 */
class ResendEmailProvider extends BaseProvider {
	constructor(config) {
		super(config);
		this.validateConfig(config, ['apiKey', 'defaultFromAddress']);
		this.client = new Resend(config.apiKey);
		this.defaultFrom = config.defaultFromAddress;
	}

	async sendEmail({ to, subject, html, text, from, attachments }) {
		this.validateEmailInput({ to, subject, html, text });
		
		const emailData = {
			from: from || this.defaultFrom,
			to: Array.isArray(to) ? to : [to],
			subject,
			html,
			text
		};

		if (attachments?.length) {
			emailData.attachments = attachments;
		}

		// Debug logging BEFORE sending
		logger.info('Resend email attempt', {
			apiKeyExists: !!this.client.apiKey,
			apiKeyPrefix: this.client.apiKey ? this.client.apiKey.substring(0, 8) + '...' : 'NOT_SET',
			fromAddress: emailData.from,
			toAddress: Array.isArray(to) ? to.join(', ') : to,
			subject: emailData.subject,
			hasHtml: !!emailData.html,
			hasText: !!emailData.text,
			htmlLength: emailData.html?.length || 0,
			textLength: emailData.text?.length || 0
		});

		try {
			const response = await this.executeWithRetry(() => 
				this.client.emails.send(emailData)
			);
			
			// Enhanced success logging with full response
			logger.info('Resend API response received', { 
				responseId: response?.id,
				responseData: response,
				to: Array.isArray(to) ? to.join(', ') : to,
				subject,
				fromAddress: emailData.from
			});

			// Check if response indicates success
			if (!response?.id) {
				logger.warn('Resend response missing ID - email may not have been queued', {
					response,
					to: Array.isArray(to) ? to.join(', ') : to,
					subject
				});
			}
			
			return this.createResponse(true, response?.id, 'resend', {
				originalResponse: response
			});
		} catch (error) {
			// Enhanced error logging
			logger.error('Resend email API error', { 
				error: error.message, 
				errorCode: error.code,
				errorStatus: error.status,
				errorResponse: error.response?.data || error.response,
				to: Array.isArray(to) ? to.join(', ') : to,
				subject,
				fromAddress: emailData.from,
				stack: error.stack
			});

			// Check for specific Resend errors
			if (error.message.includes('API key')) {
				throw new Error(`Resend API key invalid or missing: ${error.message}`);
			} else if (error.message.includes('from')) {
				throw new Error(`Resend from address not verified: ${error.message}`);
			} else if (error.message.includes('quota') || error.message.includes('limit')) {
				throw new Error(`Resend quota exceeded: ${error.message}`);
			}

			throw new Error(`Email delivery failed: ${error.message}`);
		}
	}

	validateEmailInput({ to, subject, html, text }) {
		if (!to) throw new Error('Email recipient is required');
		if (!subject) throw new Error('Email subject is required');
		if (!html && !text) throw new Error('Email content (html or text) is required');
	}

	/**
	 * Test Resend API connection and configuration
	 * @returns {Promise<Object>} Test result with details
	 */
	async testConnection() {
		try {
			// Test API key by attempting to get domains (this doesn't send email)
			const testResponse = await this.client.domains.list();
			
			logger.info('Resend API connection test successful', {
				apiKeyValid: true,
				domainsCount: testResponse?.data?.length || 0,
				domains: testResponse?.data?.map(d => d.name) || []
			});

			return {
				success: true,
				apiKeyValid: true,
				domains: testResponse?.data || [],
				message: 'Resend API connection successful'
			};
		} catch (error) {
			logger.error('Resend API connection test failed', {
				error: error.message,
				errorCode: error.code,
				errorStatus: error.status,
				apiKeyPrefix: this.client.apiKey ? this.client.apiKey.substring(0, 8) + '...' : 'NOT_SET'
			});

			return {
				success: false,
				apiKeyValid: false,
				error: error.message,
				message: 'Resend API connection failed'
			};
		}
	}

	/**
	 * Send a simple test email
	 * @param {string} to - Test recipient 
	 * @returns {Promise<Object>} Test result
	 */
	async sendTestEmail(to) {
		const testData = {
			to,
			subject: `🧪 Resend Test - ${new Date().toISOString()}`,
			html: `
				<h2>🚇 Resend Email Test</h2>
				<p>This is a test email to verify Resend configuration.</p>
				<p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
				<p><strong>From:</strong> ${this.defaultFrom}</p>
				<p><strong>API Key:</strong> ${this.client.apiKey ? '✅ Present' : '❌ Missing'}</p>
				<hr>
				<p><em>If you received this email, Resend is working correctly!</em></p>
			`,
			text: `Resend Email Test\n\nTimestamp: ${new Date().toISOString()}\nFrom: ${this.defaultFrom}\n\nIf you received this email, Resend is working correctly!`
		};

		try {
			const result = await this.sendEmail(testData);
			return {
				success: true,
				result,
				message: 'Test email sent successfully'
			};
		} catch (error) {
			return {
				success: false,
				error: error.message,
				message: 'Test email failed'
			};
		}
	}
}

module.exports = ResendEmailProvider;


