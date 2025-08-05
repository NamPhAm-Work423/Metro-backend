import time
import logging
from functools import wraps
from flask import request, current_app

logger = logging.getLogger(__name__)

def metrics_middleware(f):
    """
    Metrics middleware to track request duration and status
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        # Get route path
        route_path = request.endpoint or request.path
        
        logger.debug('Starting request metrics', {
            'method': request.method,
            'route': route_path,
            'start_time': start_time
        })
        
        try:
            # Execute the route function
            response = f(*args, **kwargs)
            
            # Calculate duration
            duration = time.time() - start_time
            status_code = response[1] if isinstance(response, tuple) else 200
            
            logger.info('Request completed', {
                'method': request.method,
                'route': route_path,
                'status_code': status_code,
                'duration_ms': round(duration * 1000, 2)
            })
            
            return response
            
        except Exception as e:
            # Calculate duration even for errors
            duration = time.time() - start_time
            status_code = 500
            
            logger.error('Request failed', {
                'method': request.method,
                'route': route_path,
                'status_code': status_code,
                'duration_ms': round(duration * 1000, 2),
                'error': str(e)
            })
            
            raise
    
    return decorated_function

def prometheus_metrics_middleware(f):
    """
    Prometheus metrics middleware (if prometheus_client is available)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        
        try:
            # Try to import prometheus_client
            from prometheus_client import Histogram, Counter
            from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
            
            # Define metrics (these should be defined at module level in practice)
            http_request_duration = Histogram(
                'http_request_duration_seconds',
                'HTTP request duration in seconds',
                ['method', 'route', 'status_code']
            )
            
            http_requests_total = Counter(
                'http_requests_total',
                'Total HTTP requests',
                ['method', 'route', 'status_code']
            )
            
            route_path = request.endpoint or request.path
            
            try:
                # Execute the route function
                response = f(*args, **kwargs)
                
                # Calculate duration
                duration = time.time() - start_time
                status_code = response[1] if isinstance(response, tuple) else 200
                
                # Record metrics
                http_request_duration.labels(
                    method=request.method,
                    route=route_path,
                    status_code=status_code
                ).observe(duration)
                
                http_requests_total.labels(
                    method=request.method,
                    route=route_path,
                    status_code=status_code
                ).inc()
                
                return response
                
            except Exception as e:
                # Calculate duration even for errors
                duration = time.time() - start_time
                status_code = 500
                
                # Record error metrics
                http_request_duration.labels(
                    method=request.method,
                    route=route_path,
                    status_code=status_code
                ).observe(duration)
                
                http_requests_total.labels(
                    method=request.method,
                    route=route_path,
                    status_code=status_code
                ).inc()
                
                raise
                
        except ImportError:
            # If prometheus_client is not available, fall back to basic metrics
            logger.warning('Prometheus client not available, using basic metrics')
            return metrics_middleware(f)(*args, **kwargs)
    
    return decorated_function 