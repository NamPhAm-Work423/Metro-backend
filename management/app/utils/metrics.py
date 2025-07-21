"""
metrics.py - Collect metrics Prometheus and monitor system resources (CPU, RAM)

- Use prometheus_client to create metrics (Counter, Histogram, Gauge)
- Use psutil to get system information
- Use threading to update metrics periodically
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
import psutil
import threading
import time

# Counter: Count total number of requests by method, endpoint, status
REQUEST_COUNT = Counter('request_total', 'Total number of requests', ['method', 'endpoint', 'status'])
# Histogram: Measure request latency by method, endpoint
REQUEST_LATENCY = Histogram('request_latency_seconds', 'Request latency in seconds', ['method', 'endpoint'])

# Gauge: Measure system resources
SYSTEM_MEMORY = Gauge('memory_usage_bytes', 'Memory usage in bytes')
SYSTEM_CPU = Gauge('cpu_usage_percent', 'CPU usage percentage')

def get_metrics():
    """
    Return metrics in Prometheus format to expose via HTTP endpoint
    Returns:
        - metrics data (bytes)
        - content type (str)
    """
    return generate_latest(), CONTENT_TYPE_LATEST

class SystemMetricsMonitor:
    """
    Class to run a thread to update system metrics periodically
    """
    def __init__(self, interval=5):
        self.interval = interval
        self.process = psutil.Process()
        self._stop_event = threading.Event()
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)

    def start(self):
        """Start monitor thread"""
        self.monitor_thread.start()

    def stop(self):
        """Stop monitor thread"""
        self._stop_event.set()
        self.monitor_thread.join()

    def _monitor_loop(self):
        """Loop to update system metrics"""
        while not self._stop_event.is_set():
            try:
                # Get RAM usage (resident set size)
                memory_info = self.process.memory_info()
                SYSTEM_MEMORY.set(memory_info.rss)

                # Get % CPU process usage
                cpu_percent = self.process.cpu_percent()
                SYSTEM_CPU.set(cpu_percent)

            except Exception as e:
                print(f"Error updating system metrics: {e}")

            time.sleep(self.interval)

# Initialize system monitor (just call system_monitor.start() at the beginning of app)
system_monitor = SystemMetricsMonitor() 