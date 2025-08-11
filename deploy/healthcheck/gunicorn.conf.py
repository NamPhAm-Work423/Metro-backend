import os
import multiprocessing

bind = f"0.0.0.0:{int(os.getenv('PORT', '3000'))}"

# Allow configuring workers/threads via env; keep low defaults for lightweight service
workers = int(os.getenv("WEB_CONCURRENCY", os.getenv("GUNICORN_WORKERS", "2")))
if workers <= 0:
    workers = 2

threads = int(os.getenv("GUNICORN_THREADS", "2"))
if threads <= 0:
    threads = 2

worker_class = "gthread"
timeout = int(os.getenv("GUNICORN_TIMEOUT", "30"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
loglevel = os.getenv("GUNICORN_LOGLEVEL", "info")


