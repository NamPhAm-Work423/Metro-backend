from .models import *

# Avoid initializing Kafka producer at package import time.
# Import producer directly from `app.kafka.producer` only where needed.
