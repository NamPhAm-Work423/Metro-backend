const { client: paypalClient, paypal, isConfigured } = require('../config/paypal');
const { logger } = require('../config/logger');
const { Payment, PaymentLog, Transaction } = require('../models/index.model');
const { Op } = require('sequelize');
const { publish } = require('../kafka/kafkaProducer');

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

  /**
   * Create a complete PayPal payment (DB record + PayPal order)
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment result with PayPal order
   */
  async createPaymentOrder(paymentData) {
    try {
      const { ticketId, passengerId, amount, currency = 'USD', orderInfo } = paymentData;

      // Create payment record (PENDING)
      const payment = await Payment.create({
        ticketId,
        passengerId,
        paymentAmount: amount,
        paymentMethod: 'paypal',
        paymentStatus: 'PENDING',
        paymentDate: new Date(),
        paymentGatewayResponse: null
      });

      // Prepare PayPal order data
      const paypalOrderData = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description: orderInfo || `Ticket payment for ticket ${ticketId}`,
          custom_id: payment.paymentId.toString()
        }]
      };

      // Create PayPal order
      const paypalOrder = await this.createOrder(paypalOrderData);

      // Update payment with PayPal order ID
      payment.paymentGatewayResponse = {
        paypalOrderId: paypalOrder.id,
        paypalOrderData: paypalOrder
      };
      await payment.save();

      // Log payment initiation
      await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'PAYMENT',
        paymentLogDate: new Date(),
        paymentLogStatus: 'PENDING',
      });

      // Publish event to Kafka
      try {
        await publish('payment.initiated', payment.paymentId, {
          paymentId: payment.paymentId,
          ticketId,
          passengerId,
          amount,
          orderInfo,
          paymentMethod: 'paypal',
          status: 'PENDING',
          paypalOrderId: paypalOrder.id,
          createdAt: payment.paymentDate
        });
      } catch (kafkaError) {
        logger.warn('Failed to publish payment.initiated event:', kafkaError.message);
      }

      return {
        payment,
        paypalOrder,
        approvalUrl: paypalOrder.links.find(link => link.rel === 'approve')?.href,
        captureUrl: paypalOrder.links.find(link => link.rel === 'capture')?.href
      };
    } catch (error) {
      logger.error('Error creating PayPal payment order:', error);
      throw error;
    }
  }

  /**
   * Capture PayPal payment and update database
   * @param {string} orderId - PayPal order ID
   * @returns {Promise<Object>} Capture result
   */
  async capturePayment(orderId) {
    try {
      // First, check order status to ensure it's approved
      const orderDetails = await this.getOrder(orderId);
      
      if (orderDetails.status !== 'APPROVED') {
        throw new Error(`ORDER_NOT_APPROVED:${orderDetails.status}`);
      }

      // Capture the payment
      const captureResult = await this.captureOrder(orderId);

      // Find the payment record by PayPal order ID
      let payment;
      try {
        payment = await Payment.findOne({
          where: {
            paymentMethod: 'paypal',
            paymentStatus: 'PENDING',
            [Op.and]: [
              { 'paymentGatewayResponse.paypalOrderId': orderId }
            ]
          }
        });
      } catch (jsonQueryError) {
        logger.warn('JSON query failed, using fallback method:', jsonQueryError.message);
        
        const allPayments = await Payment.findAll({
          where: {
            paymentMethod: 'paypal',
            paymentStatus: 'PENDING'
          }
        });
        
        payment = allPayments.find(p => 
          p.paymentGatewayResponse?.paypalOrderId === orderId
        );
      }

      if (!payment) {
        throw new Error(`PAYMENT_NOT_FOUND:${orderId}`);
      }

      // Update payment status based on capture result
      if (captureResult.status === 'COMPLETED') {
        payment.paymentStatus = 'APPROVED';
      } else {
        payment.paymentStatus = 'FAILED';
      }

      payment.paymentGatewayResponse = {
        ...payment.paymentGatewayResponse,
        captureResult
      };
      await payment.save();

      // Log payment result
      await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'CAPTURE',
        paymentLogDate: new Date(),
        paymentLogStatus: payment.paymentStatus,
      });

      return {
        payment,
        captureResult,
        orderDetails
      };
    } catch (error) {
      logger.error('Error capturing PayPal payment:', error);
      throw error;
    }
  }

  /**
   * Handle PayPal webhook events
   * @param {Object} event - Webhook event data
   * @returns {Promise<void>}
   */
  async handleWebhookEvent(event) {
    try {
      logger.info('PayPal webhook received:', { eventType: event.event_type });

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this._handlePaymentCaptureCompleted(event);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this._handlePaymentCaptureDenied(event);
          break;
        case 'PAYMENT.CAPTURE.PENDING':
          await this._handlePaymentCapturePending(event);
          break;
        default:
          logger.info('Unhandled PayPal webhook event:', { eventType: event.event_type });
      }
    } catch (error) {
      logger.error('Error handling PayPal webhook:', error);
      throw error;
    }
  }

  /**
   * Handle PAYMENT.CAPTURE.COMPLETED webhook
   * @private
   */
  async _handlePaymentCaptureCompleted(event) {
    try {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;

      // Find payment by PayPal order ID that has been approved
      let payment;
      try {
        payment = await Payment.findOne({
          where: {
            paymentMethod: 'paypal',
            paymentStatus: 'APPROVED',
            [Op.and]: [
              { 'paymentGatewayResponse.paypalOrderId': orderId }
            ]
          }
        });
      } catch (jsonQueryError) {
        logger.warn('JSON query failed in webhook, using fallback:', jsonQueryError.message);
        
        const allPayments = await Payment.findAll({
          where: {
            paymentMethod: 'paypal',
            paymentStatus: 'APPROVED'
          }
        });
        
        payment = allPayments.find(p => 
          p.paymentGatewayResponse?.paypalOrderId === orderId
        );
      }

      if (!payment) {
        logger.warn('Approved payment not found for PayPal order:', { orderId });
        return;
      }

      // Update payment status from APPROVED to COMPLETED
      payment.paymentStatus = 'COMPLETED';
      payment.paymentGatewayResponse = {
        ...payment.paymentGatewayResponse,
        webhookEvent: event,
        capture
      };
      await payment.save();

      // Log payment result
      await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'WEBHOOK',
        paymentLogDate: new Date(),
        paymentLogStatus: 'COMPLETED',
      });

      // Create transaction
      await Transaction.create({
        paymentId: payment.paymentId,
        transactionAmount: payment.paymentAmount,
        transactionStatus: 'COMPLETED',
      });

      // Publish event to Kafka
      try {
        await publish('payment.completed', payment.paymentId, {
          paymentId: payment.paymentId,
          status: 'COMPLETED',
          paypalOrderId: orderId,
          capture
        });
      } catch (kafkaError) {
        logger.warn('Failed to publish payment.completed event:', kafkaError.message);
      }

      logger.info('Payment completed via PayPal webhook:', { paymentId: payment.paymentId });
    } catch (error) {
      logger.error('Error handling PAYMENT.CAPTURE.COMPLETED:', error);
      throw error;
    }
  }

  /**
   * Handle PAYMENT.CAPTURE.DENIED webhook
   * @private
   */
  async _handlePaymentCaptureDenied(event) {  
    try {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;

      // Find payment by PayPal order ID that has been approved
      const allPayments = await Payment.findAll({
        where: {
          paymentMethod: 'paypal',
          paymentStatus: 'APPROVED'
        }
      });
      
      const payment = allPayments.find(p => 
        p.paymentGatewayResponse?.paypalOrderId === orderId
      );

      if (!payment) {
        logger.warn('Approved payment not found for PayPal order:', { orderId });
        return;
      }

      // Update payment status
      payment.paymentStatus = 'FAILED';
      payment.paymentGatewayResponse = {
        ...payment.paymentGatewayResponse,
        webhookEvent: event,
        capture
      };
      await payment.save();

      // Log payment result
      await PaymentLog.create({
        paymentId: payment.paymentId,
        paymentLogType: 'WEBHOOK',
        paymentLogDate: new Date(),
        paymentLogStatus: 'FAILED',
      });

      // Publish event to Kafka
      try {
        await publish('payment.failed', payment.paymentId, {
          paymentId: payment.paymentId,
          status: 'FAILED',
          paypalOrderId: orderId,
          capture
        });
      } catch (kafkaError) {
        logger.warn('Failed to publish payment.failed event:', kafkaError.message);
      }

      logger.info('Payment failed via PayPal webhook:', { paymentId: payment.paymentId });
    } catch (error) {
      logger.error('Error handling PAYMENT.CAPTURE.DENIED:', error);
      throw error;
    }
  }

  /**
   * Handle PAYMENT.CAPTURE.PENDING webhook
   * @private
   */
  async _handlePaymentCapturePending(event) {
    try {
      const capture = event.resource;
      const orderId = capture.supplementary_data?.related_ids?.order_id;

      logger.info('PayPal payment capture pending:', { orderId });
    } catch (error) {
      logger.error('Error handling PAYMENT.CAPTURE.PENDING:', error);
      throw error;
    }
  }
}

// Create and export service instance
const paypalService = new PayPalService();

module.exports = paypalService;
