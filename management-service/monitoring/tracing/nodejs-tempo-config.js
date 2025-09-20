// OpenTelemetry Tracing Configuration for Node.js Services with Tempo
// Import this FIRST in your main application file: require('./tracing');

const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT } = require('@opentelemetry/semantic-conventions');
const { trace } = require('@opentelemetry/api');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// Environment configuration
const serviceName = process.env.SERVICE_NAME || 'nodejs-service';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const otlpEndpoint = process.env.OTLP_ENDPOINT || 'http://tempo:4318/v1/traces';

// Initialize TracerProvider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SERVICE_NAME]: serviceName,
    [SERVICE_VERSION]: serviceVersion,
    [DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
});

// Create OTLP trace exporter
const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
});

// Add batch span processor with optimized settings
provider.addSpanProcessor(new BatchSpanProcessor(traceExporter, {
  maxExportBatchSize: 10,        // Small batch size for faster export
  scheduledDelayMillis: 1000,    // Export every 1 second  
  maxQueueSize: 100,
  exportTimeoutMillis: 30000
}));

// Register the provider globally
provider.register();

// Enable auto-instrumentations
const instrumentations = getNodeAutoInstrumentations({
  // Disable file system instrumentation (reduces noise)
  '@opentelemetry/instrumentation-fs': {
    enabled: false,
  },
  // Configure HTTP instrumentation
  '@opentelemetry/instrumentation-http': {
    enabled: true,
    ignoreIncomingRequestHook: (req) => {
      // Only ignore metrics endpoints, not health checks
      return req.url?.includes('/metrics');
    },
  },
  // Enable Express instrumentation
  '@opentelemetry/instrumentation-express': {
    enabled: true,
  },
  // Enable database instrumentations
  '@opentelemetry/instrumentation-pg': {
    enabled: true,
  },
  '@opentelemetry/instrumentation-redis': {
    enabled: true,
  },
});

// Start instrumentations
instrumentations.forEach(instrumentation => {
  if (instrumentation.enable) {
    instrumentation.enable();
  }
});

console.log(`✅ OpenTelemetry tracing initialized for ${serviceName} with OTLP endpoint: ${otlpEndpoint}`);

// Export utilities for creating custom spans
function createCustomSpan(operationName, fn) {
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
  createCustomSpan,
  provider,
  traceExporter
};