const { logger } = require('../config/logger');
const { notificationsSent } = require('../config/metrics');

class NotificationService {
	constructor({ emailProvider, smsProvider, templateService }) {
		this.emailProvider = emailProvider;
		this.smsProvider = smsProvider;
		this.templateService = templateService;
	}

	async sendEmail({ to, subject, template, variables, html, text, from }) {
		let renderedHtml = html;
		let renderedText = text;
		if (template) {
			renderedHtml = this.templateService.render(`email/${template}.hbs`, variables);
			try {
				renderedText = this.templateService.render(`email/${template}.txt.hbs`, variables);
			} catch (_) {}
		}
		const result = await this.emailProvider.sendEmail({ to, subject, html: renderedHtml, text: renderedText, from });
		notificationsSent.inc({ channel: 'email', status: 'success' });
		logger.info('Email notification sent', { to, subject });
		return result;
	}

	async sendSms({ to, template, variables, text, from }) {
		let renderedText = text;
		if (template) {
			renderedText = this.templateService.render(`sms/${template}.hbs`, variables);
		}
		const result = await this.smsProvider.sendSms({ to, text: renderedText, from });
		notificationsSent.inc({ channel: 'sms', status: 'success' });
		logger.info('SMS notification sent', { to });
		return result;
	}
}

module.exports = NotificationService;


