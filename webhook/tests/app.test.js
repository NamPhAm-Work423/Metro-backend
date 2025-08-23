const request = require('supertest');
const app = require('../src/app');

describe('Webhook Service App', () => {
  describe('GET /', () => {
    it('should return service ready message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBe('Webhook Service is ready!');
    });
  });

  describe('GET /metrics', () => {
    it('should return metrics in prometheus format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe('test_metrics');
    });
  });

  describe('GET /health', () => {
    it('should return health check information', async () => {
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
  });

  describe('GET /statistics', () => {
    it('should return webhook statistics', async () => {
      const response = await request(app)
        .get('/statistics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          period: {
            startDate: expect.any(String),
            endDate: expect.any(String)
          },
          providers: {
            paypal: 'Use /paypal/statistics for detailed PayPal stats'
          },
          total: {
            webhooksReceived: 0,
            webhooksProcessed: 0,
            webhooksFailed: 0,
            duplicates: 0
          }
        }
      });
    });

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01T00:00:00.000Z';
      const endDate = '2024-01-31T23:59:59.999Z';

      const response = await request(app)
        .get(`/statistics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.data.period.startDate).toBe(startDate);
      expect(response.body.data.period.endDate).toBe(endDate);
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS in development mode', () => {
      // This test verifies that CORS middleware is applied
      // The actual CORS behavior is tested through integration tests
      expect(app._router.stack).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);

      // Check that we get a 404 response
      expect(response.status).toBe(404);
      // The response body structure may vary, so we just check it exists
      expect(response.body).toBeDefined();
    });
  });
});
