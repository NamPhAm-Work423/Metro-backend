const paypal = require('@paypal/checkout-server-sdk');
const { logger } = require('./logger');

/**
 * PayPal Configuration
 * Handles PayPal client setup with proper error handling and validation
 */
class PayPalConfig {
  constructor() {
    this.client = null;
    this.environment = null;
    this.isConfigured = false;
    this.init();
  }

  /**
   * Initialize PayPal configuration
   * @private
   */
  init() {
    try {
      // Check if credentials are provided
      const hasCredentials = this._validateCredentials();
      
      if (!hasCredentials) {
        this._logConfigurationWarning();
        return;
      }

      // Always use sandbox environment for academic project
      this.environment = new paypal.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_SECRET
      );

      this.client = new paypal.core.PayPalHttpClient(this.environment);
      this.isConfigured = true;

      logger.info('PayPal client configured successfully', {
        environment: 'sandbox',
        hasCredentials: true,
        clientIdLength: process.env.PAYPAL_CLIENT_ID?.length || 0,
        secretLength: process.env.PAYPAL_SECRET?.length || 0
      });

    } catch (error) {
      logger.error('Failed to configure PayPal client', {
        error: error.message,
        stack: error.stack
      });
      this.isConfigured = false;
    }
  }

  /**
   * Validate PayPal credentials
   * @returns {boolean} True if credentials are valid
   * @private
   */
  _validateCredentials() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const secret = process.env.PAYPAL_SECRET;

    // Check if credentials exist
    if (!clientId || !secret) {
      return false;
    }

    // Check if credentials are not default values
    if (clientId === 'your-client-id' || secret === 'your-secret-id') {
      return false;
    }

    // Check if credentials have reasonable length
    if (clientId.length < 10 || secret.length < 10) {
      return false;
    }

    return true;
  }

  /**
   * Log configuration warning
   * @private
   */
  _logConfigurationWarning() {
    logger.warn('PayPal credentials not configured, PayPal payments will fail', {
      hasClientId: !!process.env.PAYPAL_CLIENT_ID,
      hasSecret: !!process.env.PAYPAL_SECRET,
      clientIdValue: process.env.PAYPAL_CLIENT_ID === 'your-client-id' ? 'default' : 'custom',
      secretValue: process.env.PAYPAL_SECRET === 'your-secret-id' ? 'default' : 'custom',
      clientIdLength: process.env.PAYPAL_CLIENT_ID ? process.env.PAYPAL_CLIENT_ID.length : 0,
      secretLength: process.env.PAYPAL_SECRET ? process.env.PAYPAL_SECRET.length : 0,
      nodeEnv: process.env.NODE_ENV
    });
  }

  /**
   * Get PayPal client
   * @returns {Object|null} PayPal client or null if not configured
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if PayPal is configured
   * @returns {boolean} True if configured
   */
  getIsConfigured() {
    return this.isConfigured;
  }

  /**
   * Get configuration status
   * @returns {Object} Configuration status
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      hasClient: !!this.client,
      hasEnvironment: !!this.environment,
      environment: 'sandbox'
    };
  }
}

// Create and export configuration instance
const paypalConfig = new PayPalConfig();

module.exports = {
  client: paypalConfig.getClient(),
  paypal,
  isConfigured: paypalConfig.getIsConfigured(),
  getStatus: () => paypalConfig.getStatus()
};
