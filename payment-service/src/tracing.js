// OpenTelemetry Tracing Configuration for Payment Service
// This file must be imported FIRST before any other imports

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Initialize OpenTelemetry SDK
const serviceName = process.env.SERVICE_NAME || 'payment-service';
const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';

const jaegerExporter = new JaegerExporter({
  endpoint: jaegerEndpoint,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: jaegerExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable file system instrumentation (can be noisy)
      '@opentelemetry/instrumentation-fs': {
        enabled: false,
      },
      // Configure HTTP instrumentation
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // Ignore health check endpoints
          return req.url?.includes('/health') || req.url?.includes('/metrics');
        },
      },
      // Configure Express instrumentation
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      // Configure database instrumentations
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
sdk.start();

console.log(`✅ OpenTelemetry tracing initialized for ${serviceName}`);

// Export utilities for custom spans
const { trace } = require('@opentelemetry/api');

function addCustomSpan(operationName, fn) {
  const tracer = trace.getTracer(serviceName);
  
  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}

module.exports = {
  addCustomSpan,
};




