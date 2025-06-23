from confluent_kafka import Producer
import json
from abc import ABC, abstractmethod
from .event import Event

class AbstractProducer(ABC):
    @abstractmethod
    def send_event(self, topic: str, key: str, message: str):
        pass

class KafkaProducerService(AbstractProducer):
    def __init__(self, config: dict):
        self.producer = Producer(config)

    def send_event(self, topic: str, event: Event):
        """Send event to Kafka topic"""
        try:
            event.validate()
            
            event_dict = event.to_dict()
            
            key = str(event.id)
            
            self.producer.produce(
                topic,
                key=key.encode("utf-8"),
                value=json.dumps(event_dict).encode("utf-8"),
                callback=self.delivery_report
            )
            
        except Exception as e:
            print(f"[ERROR] Failed to send event: {e}")
            raise e

import os
from dotenv import load_dotenv
load_dotenv()

producer = KafkaProducerService({
    'bootstrap.servers': os.getenv("KAFKA_BROKERS_INTERNAL"),
    'client.id': "management_service",
    'acks': 'all',
    'retries': 3,
    'retry.backoff.ms': 100,
})