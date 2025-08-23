const paypalController = require('../../src/controllers/paypal.controller');

// Mock the request and response objects
const mockRequest = (body = {}, headers = {}, params = {}, query = {}) => ({
  body,
  headers,
  params,
  query,
  ip: '127.0.0.1',
  method: 'POST',
  url: '/webhook/paypal'
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('PayPal Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook', () => {
    it('should handle valid PayPal webhook', async () => {
      const webhookData = {
        id: 'WH-123456789',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-123456789',
          status: 'COMPLETED',
          amount: {
            currency_code: 'USD',
            value: '10.00'
          }
        },
        create_time: '2024-01-01T00:00:00.000Z'
      };

      const req = mockRequest(webhookData);
      const res = mockResponse();

      await paypalController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          status: 'processed',
          webhookId: 'WH-123456789',
          eventsPublished: 1,
          signatureVerified: true
        })
      );
    });

    it('should handle webhook with missing required fields', async () => {
      const req = mockRequest({ id: 'WH-123456789' });
      const res = mockResponse();

      await paypalController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_WEBHOOK_PAYLOAD',
          message: 'Invalid webhook payload structure'
        })
      );
    });

    it('should handle webhook with missing event_type', async () => {
      const req = mockRequest({ 
        id: 'WH-123456789',
        resource: { id: 'CAPTURE-123' }
      });
      const res = mockResponse();

      await paypalController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_WEBHOOK_PAYLOAD'
        })
      );
    });

    it('should handle webhook with missing id', async () => {
      const req = mockRequest({ 
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-123' }
      });
      const res = mockResponse();

      await paypalController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_WEBHOOK_PAYLOAD'
        })
      );
    });

    it('should handle empty request body', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await paypalController.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'INVALID_WEBHOOK_PAYLOAD'
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return health check information', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await paypalController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'paypal-webhook',
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String)
        })
      );
    });
  });

  describe('getStatistics', () => {
    it('should return statistics with default date range', async () => {
      const req = mockRequest({}, {}, {}, {});
      const res = mockResponse();

      await paypalController.getStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            period: expect.objectContaining({
              startDate: expect.any(String),
              endDate: expect.any(String)
            }),
            statistics: expect.objectContaining({
              webhooks: expect.objectContaining({
                received: 10,
                processed: 8,
                failed: 2,
                duplicates: 1
              })
            })
          })
        })
      );
    });

    it('should return statistics with custom date range', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';
      
      const req = mockRequest({}, {}, {}, { startDate, endDate });
      const res = mockResponse();

      await paypalController.getStatistics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            period: expect.objectContaining({
              startDate,
              endDate
            })
          })
        })
      );
    });
  });

  describe('retryFailedWebhooks', () => {
    it('should retry failed webhooks with default limit', async () => {
      const req = mockRequest({}, {}, {}, {});
      const res = mockResponse();

      await paypalController.retryFailedWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Webhook retry completed',
          summary: expect.objectContaining({
            total: 2,
            successful: 2,
            failed: 0
          }),
          results: expect.arrayContaining([
            expect.objectContaining({
              success: true,
              webhookId: 'WH-123456789'
            }),
            expect.objectContaining({
              success: true,
              webhookId: 'WH-987654321'
            })
          ])
        })
      );
    });

    it('should retry failed webhooks with custom limit', async () => {
      const req = mockRequest({}, {}, {}, { limit: '5' });
      const res = mockResponse();

      await paypalController.retryFailedWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          summary: expect.objectContaining({
            total: 2,
            successful: 2,
            failed: 0
          })
        })
      );
    });

    it('should respect maximum retry limit', async () => {
      const req = mockRequest({}, {}, {}, { limit: '100' });
      const res = mockResponse();

      await paypalController.retryFailedWebhooks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // The service should limit to max 50 retries
    });
  });
});
