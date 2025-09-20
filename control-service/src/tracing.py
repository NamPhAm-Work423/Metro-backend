# OpenTelemetry Tracing Configuration for Control Service
# This file must be imported FIRST before any other imports

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer, GrpcInstrumentorClient
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from contextlib import contextmanager

def setup_tracing():
    """Initialize OpenTelemetry tracing for the Control Service"""
    
    service_name = os.getenv('SERVICE_NAME', 'control-service')
    service_version = os.getenv('SERVICE_VERSION', '1.0.0')
    otlp_endpoint = os.getenv('OTLP_ENDPOINT', 'http://tempo:4318/v1/traces')
    
    # Create a resource with service information
    resource = Resource(attributes={
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": os.getenv('ENVIRONMENT', 'development'),
    })
    
    # Set up tracer provider
    trace.set_tracer_provider(TracerProvider(resource=resource))
    tracer = trace.get_tracer(__name__)
    
    # Configure OTLP exporter for Tempo
    otlp_exporter = OTLPSpanExporter(
        endpoint=otlp_endpoint,
    )
    
    # Add span processor
    span_processor = BatchSpanProcessor(otlp_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    # Auto-instrument common libraries
    RequestsInstrumentor().instrument()
    GrpcInstrumentorServer().instrument()
    # Temporarily disable gRPC client auto-instrumentation due to incompatibility
    # with grpcio>=1.65 where generated stubs pass `_registered_method` which
    # older interceptor wrappers do not accept. Re-enable after upgrading
    # opentelemetry-instrumentation-grpc to a compatible version.
    # GrpcInstrumentorClient().instrument()
    
    print(f"✅ OpenTelemetry tracing initialized for {service_name} with OTLP endpoint: {otlp_endpoint}")
    return tracer

# Custom span context manager
@contextmanager
def custom_span(operation_name, **attributes):
    """Create a custom span with automatic error handling"""
    tracer = trace.get_tracer(__name__)
    
    with tracer.start_as_current_span(operation_name) as span:
        try:
            # Set custom attributes
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
            
            yield span
            
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
        else:
            span.set_status(trace.Status(trace.StatusCode.OK))

# Decorator for automatic tracing
from functools import wraps

def trace_function(operation_name=None):
    """Decorator to automatically trace function calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            span_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            with custom_span(span_name) as span:
                # Add function metadata
                span.set_attribute("function.name", func.__name__)
                span.set_attribute("function.module", func.__module__)
                
                result = func(*args, **kwargs)
                
                # Add result metadata if it's serializable
                if hasattr(result, '__len__') and not isinstance(result, str):
                    span.set_attribute("result.count", len(result))
                
                return result
        
        return wrapper
    return decorator





