// Standardized OpenTelemetry Tracing Configuration for Node.js Services with Tempo
// This file provides a consistent, production-ready tracing setup for all Node.js services
// Import this FIRST: require('./tracing');

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } = require('@opentelemetry/semantic-conventions');
const { trace } = require('@opentelemetry/api');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');

function initializeTracing(serviceName, options = {}) {
  // Configuration with defaults
  const config = {
    serviceName: serviceName || process.env.SERVICE_NAME || 'nodejs-service',
    serviceVersion: options.serviceVersion || process.env.SERVICE_VERSION || '1.0.0',
    otlpEndpoint: options.otlpEndpoint || process.env.OTLP_ENDPOINT || 'http://tempo:4318/v1/traces',
    environment: options.environment || process.env.NODE_ENV || 'development',
    enableDebugLogs: options.enableDebugLogs !== false, // Default: true
    enableTestSpan: options.enableTestSpan !== false, // Default: true
  };

  console.log(`🔧 Initializing OpenTelemetry for ${config.serviceName}`);
  console.log(`📡 OTLP Endpoint: ${config.otlpEndpoint}`);
  console.log(`🌍 Environment: ${config.environment}`);

  // Create trace exporter with robust configuration
  const traceExporter = new OTLPTraceExporter({
    url: config.otlpEndpoint,
    headers: {
      'Content-Type': 'application/json',
    },
    // Add timeout and retry settings for better reliability
    timeoutMillis: 10000, // 10 seconds timeout
    // Enable compression for better performance
    compression: 'gzip',
  });

  // Add comprehensive debugging for exporter if enabled
  if (config.enableDebugLogs) {
    const originalExport = traceExporter.export.bind(traceExporter);
    traceExporter.export = function(spans, resultCallback) {
      const timestamp = new Date().toISOString();
      console.log(`📤 [${timestamp}] Attempting to export ${spans.length} spans to ${config.otlpEndpoint}`);
      
      // Add timeout for the export operation
      const exportTimeout = setTimeout(() => {
        console.error(`⏰ [${timestamp}] Export timeout (10s) reached for ${spans.length} spans`);
        resultCallback({ code: 2, error: new Error('Export timeout') });
      }, 10000);

      return originalExport(spans, (result) => {
        clearTimeout(exportTimeout);
        const completedTimestamp = new Date().toISOString();
        
        if (result.code === 0) {
          console.log(`✅ [${completedTimestamp}] Successfully exported ${spans.length} spans`);
        } else {
          console.error(`❌ [${completedTimestamp}] Failed to export ${spans.length} spans:`, {
            code: result.code,
            error: result.error?.message || result.error,
          });
        }
        resultCallback(result);
      });
    };
  }

  // Create batch span processor with optimized settings
  const spanProcessor = new BatchSpanProcessor(traceExporter, {
    // More frequent exports for development
    scheduledDelayMillis: 2000,    // Export every 2 seconds
    maxExportBatchSize: 100,       // Smaller batches for faster processing
    maxQueueSize: 1000,           // Reasonable queue size
    exportTimeoutMillis: 10000,   // 10 seconds timeout
  });

  // Create NodeSDK with comprehensive configuration
  const sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment,
      // Add additional resource attributes
      'service.instance.id': `${config.serviceName}-${process.pid}`,
      'deployment.environment': config.environment,
    }),
    spanProcessor: spanProcessor,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable noisy instrumentations
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        
        // Configure HTTP instrumentation with better filtering
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (req) => {
            const url = req.url || '';
            return url.includes('/health') || 
                   url.includes('/metrics') || 
                   url.includes('/favicon.ico') ||
                   url.includes('/_health') ||
                   url.includes('/_metrics');
          },
          ignoreOutgoingRequestHook: (req) => {
            const url = req.path || req.url || '';
            return url.includes('/health') || 
                   url.includes('/metrics') ||
                   url.includes('/_health') ||
                   url.includes('/_metrics');
          },
        },
        
        // Enable Express instrumentation
        '@opentelemetry/instrumentation-express': { enabled: true },
        
        // Enable database instrumentations
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
        
        // Enable gRPC instrumentation for services that use it
        '@opentelemetry/instrumentation-grpc': { enabled: true },
      }),
    ],
  });

  // Initialize SDK with error handling
  try {
    sdk.start();
    console.log(`✅ OpenTelemetry SDK initialized successfully for ${config.serviceName}`);
    
    // Create test span if enabled
    if (config.enableTestSpan) {
      setTimeout(() => {
        const tracer = trace.getTracer(config.serviceName);
        const testSpan = tracer.startSpan('initialization-test');
        testSpan.setAttributes({
          'test': true,
          'service.name': config.serviceName,
          'initialization.timestamp': new Date().toISOString(),
          'test.type': 'startup_verification',
        });
        testSpan.end();
        console.log(`📊 Test span created for ${config.serviceName} - should appear in Tempo`);
      }, 1500); // Wait a bit longer for full initialization
    }
    
  } catch (error) {
    console.error(`❌ Failed to initialize OpenTelemetry SDK for ${config.serviceName}:`, error);
    throw error;
  }

  // Handle graceful shutdown
  const shutdownHandler = () => {
    console.log(`🛑 Shutting down OpenTelemetry SDK for ${config.serviceName}...`);
    try {
      sdk.shutdown();
      console.log(`✅ OpenTelemetry SDK shut down successfully for ${config.serviceName}`);
    } catch (error) {
      console.error(`❌ Error shutting down OpenTelemetry SDK for ${config.serviceName}:`, error);
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdownHandler);
  process.on('SIGINT', shutdownHandler);

  return { sdk, traceExporter, spanProcessor };
}

// Utility functions for custom spans
function addCustomSpan(serviceName, operationName, fn, attributes = {}) {
  const tracer = trace.getTracer(serviceName);
  
  return tracer.startActiveSpan(operationName, async (span) => {
    try {
      // Add custom attributes
      span.setAttributes({
        ...attributes,
        'operation.name': operationName,
        'service.name': serviceName,
        'timestamp': new Date().toISOString(),
      });
      
      const result = await fn(span);
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ 
        code: 2, 
        message: error.message || 'Unknown error' 
      }); // ERROR
      
      // Add error attributes
      span.setAttributes({
        'error': true,
        'error.name': error.name,
        'error.message': error.message,
      });
      
      throw error;
    } finally {
      span.end();
    }
  });
}

// Utility to add attributes to current active span
function addSpanAttributes(attributes) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes(attributes);
  }
}

// Utility to add events to current active span
function addSpanEvent(name, attributes = {}) {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(name, {
      ...attributes,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  initializeTracing,
  addCustomSpan,
  addSpanAttributes,
  addSpanEvent,
};
