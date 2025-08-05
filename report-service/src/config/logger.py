import structlog
import logging
import sys
from datetime import datetime
from pathlib import Path
import os

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# Create logs directory if it doesn't exist
logs_dir = Path(__file__).parent.parent / "logs"
logs_dir.mkdir(exist_ok=True)

# Configure standard logging
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO if os.getenv("NODE_ENV") != "development" else logging.DEBUG,
)

# Create file handler for error logs
error_handler = logging.FileHandler(logs_dir / "error.log")
error_handler.setLevel(logging.ERROR)

# Create file handler for all logs
all_handler = logging.FileHandler(logs_dir / "application.log")
all_handler.setLevel(logging.INFO)

# Get the root logger and add handlers
root_logger = logging.getLogger()
root_logger.addHandler(error_handler)
root_logger.addHandler(all_handler)

# Create the main logger
logger = structlog.get_logger()

def request_logger(request, response_time=None):
    """Log request information"""
    logger.info(
        "Request completed",
        method=request.method,
        url=str(request.url),
        status_code=getattr(response_time, 'status_code', None),
        response_time=f"{response_time}ms" if response_time else None,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

class RequestLoggerMiddleware:
    """FastAPI middleware for request logging"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = datetime.now()
            
            # Create a custom send function to capture response
            async def custom_send(message):
                if message["type"] == "http.response.start":
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    # We can't easily access the request object here, so we'll log in the route handlers
                await send(message)
            
            await self.app(scope, receive, custom_send)
        else:
            await self.app(scope, receive, send) 