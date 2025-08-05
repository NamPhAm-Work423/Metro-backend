from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import time
from functools import wraps

# Define metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total number of HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

ACTIVE_REQUESTS = Gauge(
    'http_active_requests',
    'Number of active HTTP requests',
    ['method', 'endpoint']
)

# Database metrics
DB_CONNECTION_GAUGE = Gauge(
    'database_connections_active',
    'Number of active database connections'
)

# Kafka metrics
KAFKA_MESSAGES_PROCESSED = Counter(
    'kafka_messages_processed_total',
    'Total number of Kafka messages processed',
    ['topic', 'status']
)

KAFKA_CONSUMER_LAG = Gauge(
    'kafka_consumer_lag',
    'Kafka consumer lag',
    ['topic', 'partition']
)

def metrics_middleware(func):
    """Decorator to add metrics to FastAPI endpoints"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        method = "GET"  # Default, can be overridden
        endpoint = func.__name__
        
        # Start timing
        start_time = time.time()
        ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).inc()
        
        try:
            result = await func(*args, **kwargs)
            status = "success"
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
            return result
        except Exception as e:
            status = "error"
            REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
            raise
        finally:
            # Record duration
            duration = time.time() - start_time
            REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
            ACTIVE_REQUESTS.labels(method=method, endpoint=endpoint).dec()
    
    return wrapper

async def metrics_endpoint():
    """Return Prometheus metrics"""
    return generate_latest()

def get_metrics_content_type():
    """Get the content type for metrics"""
    return CONTENT_TYPE_LATEST 