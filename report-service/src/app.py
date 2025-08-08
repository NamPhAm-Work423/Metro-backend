from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import signal
import asyncio
from contextlib import asynccontextmanager

from .config.logger import logger, RequestLoggerMiddleware
from .config.database import init_db, close_db
from .config.settings import get_settings
from .config.metrics import metrics_endpoint, get_metrics_content_type
from .routes.report_routes import router as report_router
from .events.report_consumer import ReportEventConsumer

# Global variables for graceful shutdown
report_consumer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Report Service...")
    
    try:
        # Initialize database
        await init_db()
        logger.info("Database initialized successfully")
        
        # Start Kafka consumer
        global report_consumer
        report_consumer = ReportEventConsumer()
        await report_consumer.start()
        logger.info("Kafka consumer started successfully")
        
        logger.info("Report Service started successfully")
        yield
        
    except Exception as e:
        logger.error("Failed to start Report Service", error=str(e))
        raise
    
    finally:
        # Shutdown
        logger.info("Shutting down Report Service...")
        
        try:
            # Stop Kafka consumer
            if report_consumer:
                await report_consumer.stop()
                logger.info("Kafka consumer stopped")
            
            # Close database connections
            await close_db()
            logger.info("Database connections closed")
            
        except Exception as e:
            logger.error("Error during shutdown", error=str(e))

# Create FastAPI app
app = FastAPI(
    title="Report Service",
    description="Metro Report Generation Service",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://api-gateway:8000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
app.add_middleware(RequestLoggerMiddleware)

# Network validation middleware
@app.middleware("http")
async def validate_network_source(request: Request, call_next):
    """Validate that requests come from allowed sources"""
    allowed_hosts = [
        'api-gateway',        # Docker service name
        '172.', '10.', '192.168.', # Private network ranges
        'localhost', '127.0.0.1'   # Local development
    ]
    
    client_host = request.client.host if request.client else None
    forwarded_for = request.headers.get("x-forwarded-for")
    host = request.headers.get("host")
    
    # Check if request is from API Gateway or allowed network
    is_from_allowed_source = any(
        allowed_host in str(client_host) or 
        allowed_host in str(forwarded_for) or
        allowed_host in str(host)
        for allowed_host in allowed_hosts
    )
    
    # Check for service-to-service authentication header
    has_service_auth = request.headers.get("x-service-auth")
    
    if not is_from_allowed_source and not has_service_auth:
        logger.warn(
            "Direct external access blocked",
            source_ip=client_host,
            forwarded_for=forwarded_for,
            host=host,
            user_agent=request.headers.get("user-agent"),
            url=str(request.url)
        )
        
        return JSONResponse(
            status_code=403,
            content={
                "success": False,
                "message": "Direct access to report service is not allowed. Please use API Gateway.",
                "error": "DIRECT_ACCESS_FORBIDDEN"
            }
        )
    
    response = await call_next(request)
    return response

# Include routers
app.include_router(report_router, prefix="/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "OK",
        "service": "report-service",
        "timestamp": asyncio.get_event_loop().time()
    }

# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    metrics_data = await metrics_endpoint()
    return JSONResponse(
        content=metrics_data,
        headers={"Content-Type": get_metrics_content_type()}
    )

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(
        "Unhandled error",
        error=str(exc),
        url=str(request.url),
        method=request.method
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": "INTERNAL_ERROR" if os.getenv("NODE_ENV") != "development" else str(exc)
        }
    )

# 404 handler
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception):
    """404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "message": "Route not found",
            "error": "ROUTE_NOT_FOUND"
        }
    )

# Graceful shutdown signal handlers
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    # The lifespan manager will handle the actual shutdown

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler) 