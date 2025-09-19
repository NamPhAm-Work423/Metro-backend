# OpenTelemetry Tracing Configuration for Report Service
# This file must be imported FIRST before any other imports

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor
from contextlib import contextmanager

def setup_tracing():
    """Initialize OpenTelemetry tracing for the Report Service"""
    
    service_name = os.getenv('SERVICE_NAME', 'report-service')
    service_version = os.getenv('SERVICE_VERSION', '1.0.0')
    jaeger_agent_host = os.getenv('JAEGER_AGENT_HOST', 'jaeger')
    jaeger_agent_port = int(os.getenv('JAEGER_AGENT_PORT', '6831'))
    
    # Create a resource with service information
    resource = Resource(attributes={
        SERVICE_NAME: service_name,
        SERVICE_VERSION: service_version,
        "deployment.environment": os.getenv('ENVIRONMENT', 'development'),
    })
    
    # Set up tracer provider
    trace.set_tracer_provider(TracerProvider(resource=resource))
    tracer = trace.get_tracer(__name__)
    
    # Configure Jaeger exporter
    jaeger_exporter = JaegerExporter(
        agent_host_name=jaeger_agent_host,
        agent_port=jaeger_agent_port,
    )
    
    # Add span processor
    span_processor = BatchSpanProcessor(jaeger_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)
    
    # Auto-instrument common libraries
    RequestsInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    Psycopg2Instrumentor().instrument()
    
    print(f"OpenTelemetry tracing initialized for {service_name}")
    return tracer

def instrument_flask_app(app):
    """Instrument Flask application with OpenTelemetry"""
    setup_tracing()
    try:
        # Import lazily to avoid requiring Flask in FastAPI-only deployments
        from opentelemetry.instrumentation.flask import FlaskInstrumentor
        FlaskInstrumentor().instrument_app(app)
    except Exception as e:
        # Soft-fail if Flask is not installed or instrumentation is unavailable
        print(f"Flask instrumentation not enabled: {e}")
    return app

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




