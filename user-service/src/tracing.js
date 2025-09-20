// tracing.js - Node.js + Tempo (OTLP/HTTP 4318) with helpers (kept) & fixes
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { Resource } = require('@opentelemetry/resources');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const {
  trace,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
  SpanStatusCode,
} = require('@opentelemetry/api');
// ✅ Dùng đúng constants cho Resource (không phải ATTR_SERVICE_*)
const {
  SEMRESATTR_SERVICE_NAME,
  SEMRESATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');

diag.setLogger(new DiagConsoleLogger(), (process.env.DIAG_LEVEL?.toUpperCase() === 'DEBUG')
  ? DiagLogLevel.DEBUG
  : DiagLogLevel.INFO);

// ✅ Set environment variables FIRST để auto-instrumentations nhận đúng service name
process.env.OTEL_SERVICE_NAME = process.env.SERVICE_NAME || 'user-service';
process.env.OTEL_SERVICE_VERSION = process.env.SERVICE_VERSION || '1.0.0';
process.env.OTEL_RESOURCE_ATTRIBUTES = `service.name=${process.env.OTEL_SERVICE_NAME},service.version=${process.env.OTEL_SERVICE_VERSION},deployment.environment=${process.env.NODE_ENV || 'development'}`;

const serviceName = process.env.OTEL_SERVICE_NAME;
const serviceVersion = process.env.OTEL_SERVICE_VERSION;
const otlpEndpoint = process.env.OTLP_ENDPOINT || 'http://tempo:4318/v1/traces';

console.log('🚀 Starting OpenTelemetry setup...');
console.log('📊 Service:', serviceName);
console.log('🔗 Endpoint:', otlpEndpoint);

// --- OTLP HTTP exporter
const traceExporter = new OTLPTraceExporter({
  url: otlpEndpoint,
  timeoutMillis: 10000,
});

// ⚠️ Wrapper export: giữ nhưng có thể tắt bằng env (OTEL_WRAP_EXPORT=false)
if (String(process.env.OTEL_WRAP_EXPORT || 'true').toLowerCase() !== 'false') {
  const originalExport = traceExporter.export.bind(traceExporter);
  traceExporter.export = function (spans, resultCallback) {
    console.log(`\n📤 [EXPORT] Sending ${spans.length} spans to Tempo: ${otlpEndpoint}`);
    const startTime = Date.now();

    const wrappedCallback = (result) => {
      const duration = Date.now() - startTime;
      if (result.code === 0) {
        console.log(`✅ [EXPORT] SUCCESS: ${spans.length} spans sent in ${duration}ms`);
      } else {
        console.error(`❌ [EXPORT] FAILED:`, result.error?.message || result.error);
        console.error(`🕐 [EXPORT] Failed after ${duration}ms`);
        if (result.error?.code) console.error(`🔍 [EXPORT] Error code: ${result.error.code}`);
      }
      resultCallback(result);
    };

    originalExport(spans, wrappedCallback);
  };
}

// --- Batch processor
const spanProcessor = new BatchSpanProcessor(traceExporter, {
  scheduledDelayMillis: 2000,
  maxExportBatchSize: 10,
  maxQueueSize: 1000,
  exportTimeoutMillis: 15000, // >= exporter timeout
});

// --- SDK (resource keys fixed)
const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTR_SERVICE_NAME]: serviceName,
    [SEMRESATTR_SERVICE_VERSION]: serviceVersion,
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  spanProcessor,
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) =>
          req.url?.includes('/health') || req.url?.includes('/metrics'),
      },
      '@opentelemetry/instrumentation-express': { enabled: true },
    }),
  ],
});

// --- Start (await) + test span + connectivity check
console.log('🔧 Initializing OpenTelemetry SDK...');
(async () => {
  try {
    // ✅ BẮT BUỘC await
    await sdk.start();
    console.log('✅ OpenTelemetry SDK started successfully');

    // Gửi 1 test span để chắc chắn có dữ liệu
    setTimeout(() => {
      console.log('\n🧪 Creating test span...');
      const tracer = trace.getTracer(serviceName);
      const span = tracer.startSpan('startup-test', {
        attributes: {
          'test.service': serviceName,
          'test.timestamp': new Date().toISOString(),
        },
      });
      setTimeout(() => {
        span.setAttributes({ 'test.completed': true, startup: true });
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        console.log('📊 Startup test span completed');
      }, 500);
    }, 1000);

    // Check TCP 4318 thay vì gọi /status/buildinfo (không tồn tại trên OTLP)
    setTimeout(checkTempoConnectivity, 1500);
  } catch (error) {
    console.error('❌ Failed to start OpenTelemetry SDK:', error);
    process.exit(1);
  }
})();

// --- Graceful shutdown (giữ nguyên API bạn đang gọi)
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down, forcing span export...');
  try {
    await spanProcessor.forceFlush();
    console.log('✅ All spans flushed');
    await sdk.shutdown();
    console.log('✅ SDK shutdown complete');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
  process.exit(0);
});
process.on('SIGTERM', () => process.emit('SIGINT'));

// ========================
// Utility functions (KEPT)
// ========================
function createCustomSpan(name, fn, attributes = {}) {
  const tracer = trace.getTracer(serviceName);
  return tracer.startActiveSpan(name, async (span) => {
    try {
      span.setAttributes({
        ...attributes,
        'custom.span': true,
        'service.name': serviceName,
      });
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}

// ✅ Sửa connectivity check: test TCP đến cổng 4318
function checkTempoConnectivity() {
  const net = require('net');
  const parsed = new URL(otlpEndpoint); // e.g. http://tempo:4318/v1/traces
  const host = parsed.hostname;
  const port = Number(parsed.port) || 4318;

  console.log(`\n🔍 Checking Tempo OTLP TCP: ${host}:${port}`);
  const sock = net.createConnection({ host, port }, () => {
    console.log('✅ Tempo OTLP 4318 reachable');
    sock.end();
  });
  sock.on('error', (err) => {
    console.error(`❌ Cannot reach Tempo OTLP: ${err.message}`);
  });
  sock.setTimeout(3000, () => {
    console.error('❌ Tempo OTLP connection timeout');
    sock.destroy();
  });
}

module.exports = {
  addCustomSpan: createCustomSpan, // giữ alias cũ
  createCustomSpan,
  sdk,
};