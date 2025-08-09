"""
Flask app entrypoint for management-service

- Exposes /health and /metrics
- Starts system metrics monitor
- Instruments request count and latency
"""

import os
import time
from flask import Flask, request, g, Response

from app.utils.metrics import (
    system_monitor,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    get_metrics,
)

# Create Flask app for Gunicorn entrypoint "app.main:app"
app = Flask(__name__)

# Start system metrics monitor on import (idempotent for gunicorn workers)
try:
    system_monitor.start()
except RuntimeError:
    # Thread already started in this process
    pass


@app.before_request
def start_timer():
    g._start_time = time.perf_counter()


@app.after_request
def record_metrics(response):
    try:
        latency_seconds = max(
            0.0, time.perf_counter() - getattr(g, "_start_time", time.perf_counter())
        )
        endpoint = request.endpoint or "unknown"
        method = request.method
        status = str(response.status_code)

        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(latency_seconds)
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
    finally:
        return response


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "management-service"}


@app.get("/metrics")
def metrics() -> Response:
    data, content_type = get_metrics()
    return Response(response=data, content_type=content_type)


if __name__ == "__main__":
    # Local/debug run; in containers we use Gunicorn as per Dockerfile
    port = int(os.getenv("PORT", "3001"))
    app.run(host="0.0.0.0", port=port)
