const request = require('supertest');
const app = require('../../src/app');

describe('Webhook Integration Tests', () => {
  describe('Complete Webhook Flow', () => {
    it('should process a complete PayPal payment webhook flow', async () => {
      const webhookData = {
        id: 'WH-123456789',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-123456789',
          status: 'COMPLETED',
          amount: {
            currency_code: 'USD',
            value: '25.50'
          },
          custom_id: 'ORDER-12345',
          seller_protection: {
            status: 'ELIGIBLE',
            dispute_categories: ['ITEM_NOT_RECEIVED', 'UNAUTHORIZED_TRANSACTION']
          },
          final_capture: true,
          seller_receivable_breakdown: {
            gross_amount: {
              currency_code: 'USD',
              value: '25.50'
            },
            paypal_fee: {
              currency_code: 'USD',
              value: '1.25'
            },
            net_amount: {
              currency_code: 'USD',
              value: '24.25'
            }
          }
        },
        create_time: '2024-01-01T12:00:00.000Z',
        resource_type: 'capture'
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'PayPal-Webhook/1.0')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'processed',
        webhookId: 'WH-123456789',
        eventsPublished: 1,
        signatureVerified: true
      });
    });

    it('should handle webhook with different event types', async () => {
      const eventTypes = [
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'PAYMENT.CAPTURE.REFUNDED',
        'CHECKOUT.ORDER.APPROVED',
        'CHECKOUT.ORDER.COMPLETED'
      ];

      for (const eventType of eventTypes) {
        const webhookData = {
          id: `WH-${eventType.replace(/\./g, '-')}`,
          event_type: eventType,
          resource: {
            id: `RESOURCE-${Date.now()}`,
            status: 'COMPLETED'
          },
          create_time: new Date().toISOString()
        };

        const response = await request(app)
          .post('/webhook/paypal')
          .send(webhookData)
          .set('Content-Type', 'application/json')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.status).toBe('processed');
      }
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed webhook data gracefully', async () => {
      const malformedData = {
        id: 'WH-123456789',
        // Missing required fields
        create_time: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(malformedData)
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'INVALID_WEBHOOK_PAYLOAD',
        message: 'Invalid webhook payload structure'
      });
    });

    it('should handle duplicate webhook IDs', async () => {
      const webhookData = {
        id: 'WH-DUPLICATE-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-123', status: 'COMPLETED' },
        create_time: '2024-01-01T00:00:00.000Z'
      };

      // Send the same webhook twice
      const response1 = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .expect(200);

      const response2 = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .expect(200);

      expect(response1.body.success).toBe(true);
      expect(response2.body.success).toBe(true);
      // Both should be processed successfully due to idempotency handling
    });

    it('should handle network timeouts gracefully', async () => {
      // This test simulates a slow response scenario
      const webhookData = {
        id: 'WH-TIMEOUT-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-123', status: 'COMPLETED' },
        create_time: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .timeout(5000) // 5 second timeout
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Health and Monitoring Integration', () => {
    it('should provide comprehensive health information', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        service: 'webhook-service',
        status: 'healthy',
        providers: {
          paypal: 'active'
        }
      });
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    it('should provide metrics endpoint', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe('test_metrics');
    });

    it('should provide statistics with proper date handling', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/statistics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          period: {
            startDate,
            endDate
          },
          providers: {
            paypal: 'Use /webhook/paypal/statistics for detailed PayPal stats'
          },
          total: {
            webhooksReceived: expect.any(Number),
            webhooksProcessed: expect.any(Number),
            webhooksFailed: expect.any(Number),
            duplicates: expect.any(Number)
          }
        }
      });
    });
  });

  describe('Security Integration', () => {
    it('should handle requests with proper headers', async () => {
      const webhookData = {
        id: 'WH-SECURITY-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-123', status: 'COMPLETED' },
        create_time: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'PayPal-Webhook/1.0')
        .set('X-Forwarded-For', '173.0.81.1')
        .set('X-Real-IP', '173.0.81.1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle requests with suspicious headers', async () => {
      const webhookData = {
        id: 'WH-SUSPICIOUS-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: { id: 'CAPTURE-123', status: 'COMPLETED' },
        create_time: '2024-01-01T00:00:00.000Z'
      };

      const response = await request(app)
        .post('/webhook/paypal')
        .send(webhookData)
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'Malicious-Bot/1.0')
        .set('X-Forwarded-For', '192.168.1.1')
        .expect(200); // Should still process but log suspicious activity

      expect(response.body.success).toBe(true);
    });
  });
});
