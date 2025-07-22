"""
producer.py - Kafka Producer Service for event-driven system

- Use confluent_kafka.Producer
- Ensure clear topic names, easy to manage
"""
from confluent_kafka import Producer
import json
from abc import ABC, abstractmethod
from .event import Event
import os
from dotenv import load_dotenv
load_dotenv()

# Set clear topic names, consistent
MANAGEMENT_EVENTS_TOPIC = os.getenv("MANAGEMENT_EVENTS_TOPIC") or "management.events" # default value
USER_EVENTS_TOPIC = os.getenv("USER_EVENTS_TOPIC") or "user.events" # default value
# Can add more topics if needed

class AbstractProducer(ABC):
    @abstractmethod
    def send_event(self, topic: str, event: Event):
        pass

class KafkaProducerService(AbstractProducer):
    def __init__(self, config: dict):
        self.producer = Producer(config)

    def send_event(self, topic: str, event: Event):
        try:
            event.validate()
            event_dict = event.to_dict()
            key = str(event.id)
            self.producer.produce(
                topic,
                key=key.encode("utf-8"),
                value=json.dumps(event_dict).encode("utf-8"),
            )
        except Exception as e:
            print(f"[ERROR] Failed to send event: {e}")
            raise e


producer = KafkaProducerService({
    'bootstrap.servers': os.getenv("KAFKA_BROKERS_INTERNAL"),
    'client.id': "management_service",
    'acks': 'all',
    'retries': 3,
    'retry.backoff.ms': 100,
})

# Example usage:
# from .event import Event, EventType   
# event = Event(source="management", op=EventType.CREATE, payload={"foo": "bar"}) 