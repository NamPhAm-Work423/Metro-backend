from kafka import KafkaProducer
from kafka.errors import KafkaError
import json
import asyncio
from typing import Dict, Any, Optional
from ..config.logger import logger

class KafkaEventProducer:
    """
    Generic Kafka producer wrapper for sending messages to topics.
    """
    
    def __init__(self, client_id: str, brokers: list):
        self.client_id = client_id
        self.brokers = brokers
        self.producer = None
        self.retry_count = 0
        self.max_retries = 10
        self.retry_delay = 5
        
        # Kafka producer configuration
        self.producer_config = {
            'bootstrap_servers': brokers,
            'client_id': client_id,
            'key_serializer': lambda k: k.encode('utf-8') if k else None,
            'value_serializer': lambda v: json.dumps(v).encode('utf-8'),
            'acks': 'all',
            'retries': 3,
            'batch_size': 16384,
            'linger_ms': 1,
            'buffer_memory': 33554432,
            'compression_type': 'gzip',
            'max_request_size': 1048576,
            'request_timeout_ms': 30000,
            'delivery_timeout_ms': 120000,
        }
    
    async def start(self):
        """Initialize the Kafka producer."""
        while self.retry_count < self.max_retries:
            try:
                self.producer = KafkaProducer(**self.producer_config)
                
                # Test the connection
                self.producer.metrics()
                
                logger.info("KafkaEventProducer connected successfully")
                self.retry_count = 0  # Reset retry count on success
                break
                
            except Exception as error:
                self.retry_count += 1
                logger.error(
                    "KafkaEventProducer connection failed",
                    error=str(error),
                    retry_count=self.retry_count,
                    max_retries=self.max_retries
                )
                
                if self.retry_count >= self.max_retries:
                    logger.error("Max retries reached for KafkaEventProducer, giving up")
                    raise error
                
                logger.info(
                    "Retrying KafkaEventProducer connection",
                    retry_count=self.retry_count,
                    delay_seconds=self.retry_delay
                )
                await asyncio.sleep(self.retry_delay)
    
    async def send_message(
        self,
        topic: str,
        message: Dict[str, Any],
        key: Optional[str] = None,
        partition: Optional[int] = None
    ):
        """
        Send a message to a Kafka topic.
        
        Args:
            topic: The topic to send the message to
            message: The message to send (will be serialized as JSON)
            key: Optional message key
            partition: Optional partition to send to
        """
        if not self.producer:
            raise RuntimeError("Producer not initialized. Call start() first.")
        
        try:
            # Send the message
            future = self.producer.send(
                topic=topic,
                value=message,
                key=key,
                partition=partition
            )
            
            # Wait for the send to complete
            record_metadata = future.get(timeout=30)
            
            logger.info(
                "Message sent successfully",
                topic=topic,
                partition=record_metadata.partition,
                offset=record_metadata.offset,
                key=key
            )
            
            return {
                'topic': record_metadata.topic,
                'partition': record_metadata.partition,
                'offset': record_metadata.offset,
                'timestamp': record_metadata.timestamp
            }
            
        except Exception as e:
            logger.error(
                "Failed to send message",
                error=str(e),
                topic=topic,
                key=key
            )
            raise
    
    async def send_batch(
        self,
        topic: str,
        messages: list,
        key: Optional[str] = None
    ):
        """
        Send multiple messages to a Kafka topic.
        
        Args:
            topic: The topic to send messages to
            messages: List of messages to send
            key: Optional key for all messages
        """
        if not self.producer:
            raise RuntimeError("Producer not initialized. Call start() first.")
        
        results = []
        
        try:
            for message in messages:
                future = self.producer.send(
                    topic=topic,
                    value=message,
                    key=key
                )
                results.append(future)
            
            # Wait for all sends to complete
            for future in results:
                record_metadata = future.get(timeout=30)
                logger.debug(
                    "Batch message sent",
                    topic=record_metadata.topic,
                    partition=record_metadata.partition,
                    offset=record_metadata.offset
                )
            
            logger.info(
                "Batch messages sent successfully",
                topic=topic,
                message_count=len(messages)
            )
            
        except Exception as e:
            logger.error(
                "Failed to send batch messages",
                error=str(e),
                topic=topic,
                message_count=len(messages)
            )
            raise
    
    async def stop(self):
        """Gracefully stop the producer."""
        if self.producer:
            # Flush any pending messages
            self.producer.flush()
            self.producer.close()
            logger.info("KafkaEventProducer stopped successfully")
    
    def get_metrics(self):
        """Get producer metrics for monitoring."""
        if not self.producer:
            return {}
        
        try:
            return self.producer.metrics()
        except Exception as e:
            logger.error("Error getting producer metrics", error=str(e))
            return {} 