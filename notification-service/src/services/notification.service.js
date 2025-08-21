const { logger } = require('../config/logger');
const { notificationsSent } = require('../config/metrics');
const { Email, SMS } = require('../models');

class NotificationService {
	constructor({ emailProvider, smsProvider, templateService }) {
		this.emailProvider = emailProvider;
		this.smsProvider = smsProvider;
		this.templateService = templateService;
	}

	async sendEmail({ to, subject, template, variables, html, text, from, attachments, userId, category = 'general' }) {
		const recipients = Array.isArray(to) ? to.join(', ') : to;
		
		logger.info('Email notification requested', {
			to: recipients,
			subject,
			template,
			variableKeys: variables ? Object.keys(variables) : [],
			hasAttachments: Boolean(attachments?.length),
			category
		});

		let renderedHtml = html;
		let renderedText = text;

		// Template rendering with enhanced error handling
		if (template) {
			try {
				logger.info('Rendering email HTML template', { template });
				renderedHtml = this.templateService.render(`email/${template}.hbs`, variables);
				
				try {
					logger.info('Rendering email TEXT template', { template });
					renderedText = this.templateService.render(`email/${template}.txt.hbs`, variables);
				} catch (textErr) {
					logger.warn('Text template not found or failed to render; continuing with HTML only', {
						error: textErr.message,
						template
					});
				}
			} catch (htmlErr) {
				logger.error('HTML template rendering failed', { 
					error: htmlErr.message, 
					template 
				});
				
				// Log failed notification to database
				await this.logNotification({
					channel: 'email',
					provider: 'resend',
					recipient: recipients,
					subject,
					template,
					variables,
					status: 'failed',
					errorMessage: `Template rendering failed: ${htmlErr.message}`,
					sentFrom: from,
					userId,
					category
				});
				
				throw new Error(`Template rendering failed: ${htmlErr.message}`);
			}
		}

		// Validate content before sending
		if (!renderedHtml && !renderedText) {
			const errorMsg = 'Email requires either HTML or text content';
			
			// Log failed notification to database
			await this.logNotification({
				channel: 'email',
				provider: 'resend',
				recipient: recipients,
				subject,
				template,
				variables,
				status: 'failed',
				errorMessage: errorMsg,
				sentFrom: from,
				userId,
				category
			});
			
			throw new Error(errorMsg);
		}

		logger.info('Sending email via provider', {
			to: recipients,
			subject,
			from,
			hasHtml: Boolean(renderedHtml),
			hasText: Boolean(renderedText)
		});

		try {
			const result = await this.emailProvider.sendEmail({ 
				to, 
				subject, 
				html: renderedHtml, 
				text: renderedText, 
				from, 
				attachments 
			});
			
			// Log successful notification to database
			await this.logNotification({
				channel: 'email',
				provider: 'resend',
				recipient: recipients,
				subject,
				template,
				variables,
				content: renderedHtml || renderedText,
				status: result?.success ? 'sent' : 'failed',
				providerResponse: result,
				providerMessageId: result?.id,
				sentFrom: from,
				userId,
				category
			});
			
			notificationsSent.inc({ channel: 'email', status: 'success' });
			logger.info('Email notification sent successfully', { 
				to: recipients, 
				subject,
				id: result?.id
			});
			
			return result;
		} catch (error) {
			// Log failed notification to database
			await this.logNotification({
				channel: 'email',
				provider: 'resend',
				recipient: recipients,
				subject,
				template,
				variables,
				content: renderedHtml || renderedText,
				status: 'failed',
				errorMessage: error.message,
				sentFrom: from,
				userId,
				category
			});
			
			notificationsSent.inc({ channel: 'email', status: 'failure' });
			logger.error('Email notification failed', { 
				error: error.message, 
				to: recipients, 
				subject,
				stack: error.stack
			});
			throw error;
		}
	}

	async sendSms({ to, template, variables, text, from, userId, category = 'general' }) {
		logger.info('SMS notification requested', {
			to,
			template,
			variableKeys: variables ? Object.keys(variables) : [],
			category
		});

		let renderedText = text;

		// Template rendering with enhanced error handling
		if (template) {
			try {
				logger.info('Rendering SMS template', { template });
				renderedText = this.templateService.render(`sms/${template}.hbs`, variables);
			} catch (templateErr) {
				logger.error('SMS template rendering failed', { 
					error: templateErr.message, 
					template 
				});
				
				// Log failed notification to database
				await this.logNotification({
					channel: 'sms',
					provider: 'vonage',
					recipient: to,
					template,
					variables,
					status: 'failed',
					errorMessage: `SMS template rendering failed: ${templateErr.message}`,
					sentFrom: from,
					userId,
					category
				});
				
				throw new Error(`SMS template rendering failed: ${templateErr.message}`);
			}
		}

		// Validate content before sending
		if (!renderedText) {
			const errorMsg = 'SMS requires text content';
			
			// Log failed notification to database
			await this.logNotification({
				channel: 'sms',
				provider: 'vonage',
				recipient: to,
				template,
				variables,
				status: 'failed',
				errorMessage: errorMsg,
				sentFrom: from,
				userId,
				category
			});
			
			throw new Error(errorMsg);
		}

		logger.info('Sending SMS via provider', { 
			to, 
			from, 
			textLength: renderedText.length 
		});

		try {
			const result = await this.smsProvider.sendSms({ 
				to, 
				text: renderedText, 
				from 
			});
			
			// Log successful notification to database
			await this.logNotification({
				channel: 'sms',
				provider: 'vonage',
				recipient: to,
				template,
				variables,
				content: renderedText,
				status: result?.success ? 'sent' : 'failed',
				providerResponse: result,
				providerMessageId: result?.id,
				sentFrom: from,
				userId,
				category
			});
			
			notificationsSent.inc({ channel: 'sms', status: 'success' });
			logger.info('SMS notification sent successfully', { 
				to,
				id: result?.id
			});
			
			return result;
		} catch (error) {
			// Log failed notification to database
			await this.logNotification({
				channel: 'sms',
				provider: 'vonage',
				recipient: to,
				template,
				variables,
				content: renderedText,
				status: 'failed',
				errorMessage: error.message,
				sentFrom: from,
				userId,
				category
			});
			
			notificationsSent.inc({ channel: 'sms', status: 'failure' });
			logger.error('SMS notification failed', { 
				error: error.message, 
				to,
				stack: error.stack
			});
			throw error;
		}
	}

	/**
	 * Log notification to database for audit and admin tracking
	 * @private
	 */
	async logNotification(notificationData) {
		try {
			const { channel } = notificationData;
			
			if (channel === 'email') {
				// Map data to Email model schema
				const emailData = {
					provider: notificationData.provider || 'resend',
					providerMessageId: notificationData.providerMessageId,
					toEmail: notificationData.recipient,
					fromEmail: notificationData.sentFrom,
					subject: notificationData.subject,
					htmlContent: notificationData.content,
					textContent: notificationData.textContent,
					template: notificationData.template,
					variables: notificationData.variables,
					status: notificationData.status,
					errorMessage: notificationData.errorMessage,
					providerResponse: notificationData.providerResponse,
					userId: notificationData.userId,
					category: notificationData.category || 'general',
					priority: notificationData.priority || 'normal',
					hasAttachments: Boolean(notificationData.attachments?.length),
					attachmentCount: notificationData.attachments?.length || 0,
					sentAt: new Date()
				};
				
				await Email.create(emailData);
				
			} else if (channel === 'sms') {
				// Map data to SMS model schema
				const smsData = {
					provider: notificationData.provider || 'vonage',
					providerMessageId: notificationData.providerMessageId,
					toPhoneNumber: notificationData.recipient,
					fromSenderId: notificationData.sentFrom,
					textContent: notificationData.content,
					messageLength: notificationData.content?.length || 0,
					segmentCount: Math.ceil((notificationData.content?.length || 0) / 160),
					template: notificationData.template,
					variables: notificationData.variables,
					status: notificationData.status,
					errorMessage: notificationData.errorMessage,
					providerResponse: notificationData.providerResponse,
					userId: notificationData.userId,
					category: notificationData.category || 'general',
					priority: notificationData.priority || 'normal',
					cost: notificationData.cost,
					currency: notificationData.currency || 'USD',
					countryCode: this.extractCountryCode(notificationData.recipient),
					sentAt: new Date()
				};
				
				await SMS.create(smsData);
			}
			
			logger.debug('Notification logged to database', {
				channel,
				recipient: notificationData.recipient,
				status: notificationData.status
			});
		} catch (error) {
			logger.error('Failed to log notification to database', {
				error: error.message,
				stack: error.stack,
				notificationData: {
					channel: notificationData.channel,
					recipient: notificationData.recipient,
					status: notificationData.status
				}
			});
			// Don't throw error - logging failure shouldn't break notification flow
		}
	}

	/**
	 * Extract country code from phone number
	 * @private
	 */
	extractCountryCode(phoneNumber) {
		if (!phoneNumber || typeof phoneNumber !== 'string') return null;
		
		// Simple country code extraction - can be enhanced
		if (phoneNumber.startsWith('+84')) return 'VN';
		if (phoneNumber.startsWith('+1')) return 'US';
		if (phoneNumber.startsWith('+44')) return 'GB';
		if (phoneNumber.startsWith('+86')) return 'CN';
		if (phoneNumber.startsWith('+91')) return 'IN';
		
		// Try to extract first 1-3 digits after +
		const match = phoneNumber.match(/^\+(\d{1,3})/);
		return match ? match[1] : null;
	}
}

module.exports = NotificationService;


