const { client: paypalClient, paypal } = require('../config/paypal');
const logger = require('../config/logger');
module.exports = {
  async createOrder(data) {
    try {
      if (!data.intent) {
        logger.error('Intent is required (CAPTURE or AUTHORIZE)');
        throw new Error('Intent is required (CAPTURE or AUTHORIZE)');
      }

      if (!data.purchase_units || !Array.isArray(data.purchase_units) || data.purchase_units.length === 0) {
        logger.error('Purchase units array is required');
        throw new Error('Purchase units array is required');
      }

      // Validate each purchase unit
      for (const unit of data.purchase_units) {
        if (!unit.amount || !unit.amount.currency_code || !unit.amount.value) {
          logger.error('Each purchase unit must have amount with currency_code and value');
          throw new Error('Each purchase unit must have amount with currency_code and value');
        }

        // Validate items if present
        if (unit.items && Array.isArray(unit.items)) {
          for (const item of unit.items) {
            if (!item.name || !item.quantity || !item.unit_amount) {
              logger.error('Each item must have name, quantity, and unit_amount');
              throw new Error('Each item must have name, quantity, and unit_amount');
            }
          }
        }
      }

      const request = new paypal.orders.OrdersCreateRequest();
      request.requestBody(data);

      const response = await paypalClient.execute(request);
      return response.result;
    } catch (error) {
      logger.error('PayPal create order error:', error);
      throw error;
    }
  },

  async captureOrder(orderId) {
    try {
      if (!orderId) {
        logger.error('Order ID is required');
        throw new Error('Order ID is required');
      }

      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const response = await paypalClient.execute(request);
      return response.result;
    } catch (error) {
      logger.error('PayPal capture order error:', error);
      
      if (error.statusCode) {
        error.statusCode = error.statusCode;
      }
      
      throw error;
    }
  },

  async getOrder(orderId) {
    try {
      if (!orderId) {
        logger.error('Order ID is required');
        throw new Error('Order ID is required');
      }

      const request = new paypal.orders.OrdersGetRequest(orderId);
      const response = await paypalClient.execute(request);
      return response.result;
    } catch (error) {
      logger.error('PayPal get order error:', error);
      
      // Add status code to error for better handling
      if (error.statusCode) {
        error.statusCode = error.statusCode;
      }
      
      throw error;
    }
  },

  async authorizeOrder(orderId) {
    try {
      if (!orderId) {
        logger.error('Order ID is required');
        throw new Error('Order ID is required');
      }

      const request = new paypal.orders.OrdersAuthorizeRequest(orderId);
      const response = await paypalClient.execute(request);
      return response.result;
    } catch (error) {
      logger.error('PayPal authorize order error:', error);
      throw error;
    }
  },

  async voidOrder(authorizationId) {
    try {
      if (!authorizationId) {
        throw new Error('Authorization ID is required');
      }

      const request = new paypal.authorizations.AuthorizationsVoidRequest(authorizationId);
      const response = await paypalClient.execute(request);
      return response.result;
    } catch (error) {
      logger.error('PayPal void order error:', error);
      throw error;
    }
  }
};
