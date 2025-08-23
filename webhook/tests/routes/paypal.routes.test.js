const request = require('supertest');
const app = require('../../src/app');

describe('PayPal Routes', () => {
  describe('POST /webhook/paypal', () => {
    it('should handle PayPal webhook with valid data', async () => {
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

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'processed',
        webhookId: 'WH-123456789',
        eventsPublished: 1,
        signatureVerified: true
      });
    });

    it('should handle PayPal webhook with missing data', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .send({})
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_WEBHOOK_PAYLOAD',
        message: 'Invalid webhook payload structure'
      });
    });

    it('should handle PayPal webhook with missing event_type', async () => {
      const webhookData = {
        id: 'WH-123456789',
        resource: { id: 'CAPTURE-123' }
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_WEBHOOK_PAYLOAD'
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/webhook/paypal')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /webhook/health', () => {
    it('should return PayPal health check', async () => {
      const response = await request(app)
        .get('/webhook/health')
        .expect(200);

      expect(response.body).toMatchObject({
        service: 'paypal-webhook',
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
    });
  });

  describe('GET /webhook/statistics', () => {
    it('should return PayPal webhook statistics', async () => {
      const response = await request(app)
        .get('/webhook/statistics')
        .expect(200);

      expect(response.body).toMatchObject({
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
      });
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/webhook/statistics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.data.period.startDate).toBe(startDate);
      expect(response.body.data.period.endDate).toBe(endDate);
    });
  });

  describe('POST /webhook/retry', () => {
    it('should handle retry failed webhooks request', async () => {
      const response = await request(app)
        .post('/webhook/retry')
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toMatchObject({
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
      });
    });

    it('should handle retry request with custom limit', async () => {
      const response = await request(app)
        .post('/webhook/retry?limit=5')
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        summary: expect.objectContaining({
          total: 2,
          successful: 2,
          failed: 0
        })
      });
    });
  });
});
