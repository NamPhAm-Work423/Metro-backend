const { client: paypalClient, paypal, isConfigured } = require('../config/paypal');
const { logger } = require('../config/logger');

/**
 * PayPal Service
 * Handles all PayPal payment operations with proper error handling and validation
 */
class PayPalService {
  /**
   * Validate PayPal configuration
   * @private
   */
  _validateConfiguration() {
    if (!isConfigured || !paypalClient) {
      const error = 'PayPal client not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_SECRET environment variables';
      logger.error(error);
      throw new Error(error);
    }
  }

  /**
   * Validate order data structure
   * @param {Object} data - Order data
   * @private
   */
  _validateOrderData(data) {
    if (!data.intent || !data.purchase_units?.[0]?.amount?.currency_code || !data.purchase_units?.[0]?.amount?.value) {
      const error = 'Invalid order data structure';
      logger.error(error);
      throw new Error(error);
    }
  }

  /**
   * Handle PayPal API errors with detailed logging
   * @param {Error} error - The error object
   * @param {string} operation - Operation name for logging
   * @private
   */
  _handlePayPalError(error, operation) {
    const errorDetails = {
      operation,
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    };

    // Log detailed error information
    logger.error(`PayPal ${operation} error:`, errorDetails);

    // Add status code to error for better handling
    if (error.statusCode) {
      error.statusCode = error.statusCode;
    }

    throw error;
  }

  /**
   * Create a PayPal order
   * @param {Object} data - Order data
   * @returns {Promise<Object>} PayPal order result
   */
  async createOrder(data) {
    try {
      logger.info('Creating PayPal order', { 
        intent: data.intent, 
        purchaseUnits: data.purchase_units?.length || 0 
      });

      // Validate configuration and data
      this._validateConfiguration();
      this._validateOrderData(data);

      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody(data);

      const startTime = Date.now();
      
      // Retry mechanism for PayPal requests
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const timeout = attempt === 1 ? 10000 : 5000;
          
          const response = await Promise.race([
            paypalClient.execute(request),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('PayPal request timeout')), timeout)
            )
          ]);
          
          const duration = Date.now() - startTime;
          logger.info('PayPal order creation timing', { duration, attempt });
          
          return response.result;
        } catch (error) {
          lastError = error;
          logger.warn(`PayPal request attempt ${attempt} failed`, { 
            error: error.message,
            attempt,
            willRetry: attempt < 3
          });
          
          if (attempt < 3) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      throw lastError;
      
      // Log detailed response structure
      logger.info('PayPal order created successfully', { 
        orderId: response.result.id,
        status: response.result.status,
        hasLinks: !!response.result.links,
        linksCount: response.result.links?.length || 0,
        links: response.result.links?.map(link => ({
          rel: link.rel,
          href: link.href,
          method: link.method
        })) || []
      });

      return response.result;
    } catch (error) {
      this._handlePayPalError(error, 'create order');
    }
  }

  /**
   * Capture a PayPal payment
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Capture result
   */
  async captureOrder(orderId) {
    try {
      logger.info('Capturing PayPal order', { orderId });

      // Validate configuration and parameters
      this._validateConfiguration();
      
      if (!orderId) {
        const error = 'Order ID is required';
        logger.error(error);
        throw new Error(error);
      }

      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const response = await paypalClient.execute(request);
      
      logger.info('PayPal order captured successfully', { 
        orderId,
        status: response.result.status 
      });

      return response.result;
    } catch (error) {
      this._handlePayPalError(error, 'capture order');
    }
  }

  /**
   * Get PayPal order details
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId) {
    try {
      logger.info('Getting PayPal order details', { orderId });

      // Validate configuration and parameters
      this._validateConfiguration();
      
      if (!orderId) {
        const error = 'Order ID is required';
        logger.error(error);
        throw new Error(error);
      }

      const request = new paypal.orders.OrdersGetRequest(orderId);
      const response = await paypalClient.execute(request);
      
      logger.info('PayPal order details retrieved successfully', { 
        orderId,
        status: response.result.status 
      });

      return response.result;
    } catch (error) {
      this._handlePayPalError(error, 'get order');
    }
  }

  /**
   * Authorize a PayPal order
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Authorization result
   */
  async authorizeOrder(orderId) {
    try {
      logger.info('Authorizing PayPal order', { orderId });

      // Validate configuration and parameters
      this._validateConfiguration();
      
      if (!orderId) {
        const error = 'Order ID is required';
        logger.error(error);
        throw new Error(error);
      }

      const request = new paypal.orders.OrdersAuthorizeRequest(orderId);
      const response = await paypalClient.execute(request);
      
      logger.info('PayPal order authorized successfully', { 
        orderId,
        status: response.result.status 
      });

      return response.result;
    } catch (error) {
      this._handlePayPalError(error, 'authorize order');
    }
  }

  /**
   * Void a PayPal authorization
   * @param {string} authorizationId - PayPal authorization ID
   * @returns {Promise<Object>} Void result
   */
  async voidOrder(authorizationId) {
    try {
      logger.info('Voiding PayPal authorization', { authorizationId });

      // Validate configuration and parameters
      this._validateConfiguration();
      
      if (!authorizationId) {
        const error = 'Authorization ID is required';
        logger.error(error);
        throw new Error(error);
      }

      const request = new paypal.authorizations.AuthorizationsVoidRequest(authorizationId);
      const response = await paypalClient.execute(request);
      
      logger.info('PayPal authorization voided successfully', { authorizationId });

      return response.result;
    } catch (error) {
      this._handlePayPalError(error, 'void order');
    }
  }

  /**
   * Test PayPal connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      logger.info('Testing PayPal connection');

      this._validateConfiguration();

      // Try to get a simple order to test connection
      const request = new paypal.orders.OrdersGetRequest('test-order-id');
      await paypalClient.execute(request);
      
      logger.info('PayPal connection test successful');
      return { success: true, message: 'PayPal connection is working' };
    } catch (error) {
      logger.error('PayPal connection test failed', {
        error: error.message,
        statusCode: error.statusCode
      });
      return { 
        success: false, 
        error: error.message, 
        statusCode: error.statusCode 
      };
    }
  }
}

// Create and export service instance
const paypalService = new PayPalService();

module.exports = paypalService;
