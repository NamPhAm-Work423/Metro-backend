/**
 * Base Provider Interface - defines common contract for notification providers
 * Follows Interface Segregation Principle (ISP) from SOLID
 */

/**
 * Email Provider Interface
 * Defines the contract that all email providers must implement
 */
class IEmailProvider {
	/**
	 * Send an email notification
	 * @param {Object} options - Email options
	 * @param {string|string[]} options.to - Recipient email(s)
	 * @param {string} options.subject - Email subject
	 * @param {string} options.html - HTML content
	 * @param {string} options.text - Text content
	 * @param {string} options.from - Sender email (optional, uses default)
	 * @param {Array} options.attachments - Email attachments (optional)
	 * @returns {Promise<Object>} Provider response
	 */
	async sendEmail({ to, subject, html, text, from, attachments }) {
		throw new Error('sendEmail method must be implemented');
	}
}

/**
 * SMS Provider Interface
 * Defines the contract that all SMS providers must implement
 */
class ISmsProvider {
	/**
	 * Send an SMS notification
	 * @param {Object} options - SMS options
	 * @param {string} options.to - Recipient phone number
	 * @param {string} options.text - SMS text content
	 * @param {string} options.from - Sender ID (optional, uses default)
	 * @returns {Promise<Object>} Provider response
	 */
	async sendSms({ to, text, from }) {
		throw new Error('sendSms method must be implemented');
	}
}

/**
 * Base Provider Class with common functionality
 * Implements common patterns for retry logic and validation
 */
class BaseProvider {
	constructor(config = {}) {
		this.maxRetries = config.maxRetries || 3;
		this.retryDelay = config.retryDelay || 1000;
	}

	/**
	 * Execute operation with retry logic
	 * @param {Function} operation - Operation to execute
	 * @param {number} retries - Number of retries remaining
	 * @returns {Promise<any>} Operation result
	 */
	async executeWithRetry(operation, retries = this.maxRetries) {
		try {
			return await operation();
		} catch (error) {
			if (retries > 0 && this.isRetryableError(error)) {
				await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
				return this.executeWithRetry(operation, retries - 1);
			}
			throw error;
		}
	}

	/**
	 * Determine if error is retryable
	 * @param {Error} error - Error to check
	 * @returns {boolean} True if error is retryable
	 */
	isRetryableError(error) {
		return (
			error.code === 'ECONNRESET' ||
			error.code === 'ETIMEDOUT' ||
			error.code === 'ENOTFOUND' ||
			(error.status >= 500 && error.status < 600) ||
			error.message.includes('network') ||
			error.message.includes('timeout')
		);
	}

	/**
	 * Delay execution
	 * @param {number} ms - Milliseconds to delay
	 * @returns {Promise<void>}
	 */
	delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Validate required configuration
	 * @param {Object} config - Configuration object
	 * @param {string[]} requiredFields - Required field names
	 * @throws {Error} If required fields are missing
	 */
	validateConfig(config, requiredFields) {
		const missing = requiredFields.filter(field => !config || !config[field]);
		if (missing.length > 0) {
			throw new Error(`Missing required configuration: ${missing.join(', ')}`);
		}
	}

	/**
	 * Create standardized response object
	 * @param {boolean} success - Success status
	 * @param {string} id - Message/transaction ID
	 * @param {string} provider - Provider name
	 * @param {Object} metadata - Additional metadata
	 * @returns {Object} Standardized response
	 */
	createResponse(success, id, provider, metadata = {}) {
		return {
			success,
			id,
			provider,
			timestamp: new Date().toISOString(),
			...metadata
		};
	}
}

module.exports = {
	IEmailProvider,
	ISmsProvider,
	BaseProvider
};
