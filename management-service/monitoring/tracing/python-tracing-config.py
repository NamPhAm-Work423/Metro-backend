# OpenTelemetry Tracing Configuration for Python Services
# Add this to the beginning of your main application file

import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import SERVICE_NAME, SERVICE_VERSION, Resource
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
from opentelemetry.instrumentation.psycopg2 import Psycopg2Instrumentor

def setup_tracing():
    """Initialize OpenTelemetry tracing for the service"""
    
    service_name = os.getenv('SERVICE_NAME', 'metro-python-service')
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
    RedisInstrumentor().instrument()
    PymongoInstrumentor().instrument()
    Psycopg2Instrumentor().instrument()
    
    return tracer

def instrument_flask_app(app):
    """Instrument Flask application with OpenTelemetry"""
    setup_tracing()
    FlaskInstrumentor().instrument_app(app)
    return app

def instrument_fastapi_app(app):
    """Instrument FastAPI application with OpenTelemetry"""
    setup_tracing()
    FastAPIInstrumentor.instrument_app(app)
    return app

# Custom span context manager
from contextlib import contextmanager

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

"""
USAGE EXAMPLES:

# For Flask applications:
from flask import Flask
from tracing_config import instrument_flask_app

app = Flask(__name__)
app = instrument_flask_app(app)

# For FastAPI applications:
from fastapi import FastAPI
from tracing_config import instrument_fastapi_app

app = FastAPI()
app = instrument_fastapi_app(app)

# Using custom spans:
from tracing_config import custom_span

def some_business_logic():
    with custom_span("process-payment", 
                     user_id="123", 
                     amount=100.50) as span:
        # Your business logic here
        result = process_payment_logic()
        span.set_attribute("payment.status", result.status)
        return result

# Using the decorator:
from tracing_config import trace_function

@trace_function("database-query")
def get_user_data(user_id):
    # This function will be automatically traced
    return db.query(User).filter(User.id == user_id).first()

REQUIRED PACKAGES (requirements.txt):
opentelemetry-api
opentelemetry-sdk
opentelemetry-exporter-jaeger-thrift
opentelemetry-instrumentation-flask
opentelemetry-instrumentation-fastapi
opentelemetry-instrumentation-requests
opentelemetry-instrumentation-sqlalchemy
opentelemetry-instrumentation-redis
opentelemetry-instrumentation-pymongo
opentelemetry-instrumentation-psycopg2

ENVIRONMENT VARIABLES (add to your .env files):
SERVICE_NAME=your-service-name (e.g., report-service, control-service, etc.)
SERVICE_VERSION=1.0.0
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6831
ENVIRONMENT=development
"""
