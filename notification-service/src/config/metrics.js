const client = require('prom-client');
const register = new client.Registry();

// Collect default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});
register.registerMetric(httpRequestDuration);

const errorCount = new client.Counter({
  name: 'app_errors_total',
  help: 'Total number of app-level errors',
  labelNames: ['type', 'route']
});
register.registerMetric(errorCount);

// Export
module.exports = { register, httpRequestDuration, errorCount };