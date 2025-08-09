from kafka import KafkaConsumer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import KafkaError
import json
import asyncio
import os
from typing import List, Callable, Dict, Any
from ..config.logger import logger
from ..config.metrics import KAFKA_MESSAGES_PROCESSED, KAFKA_CONSUMER_LAG

class KafkaEventConsumer:
    """
    Generic Kafka consumer wrapper that supports automatic topic subscription
    and simple start/stop helpers.
    """
    
    def __init__(
        self,
        client_id: str,
        brokers: List[str],
        group_id: str,
        topics: List[str],
        message_handler: Callable[[Dict[str, Any]], None]
    ):
        if not brokers:
            raise ValueError("KafkaEventConsumer requires at least one broker")
        if not topics:
            raise ValueError("KafkaEventConsumer requires at least one topic")
            
        self.topics = topics
        self.message_handler = message_handler
        self.running = False
        self.retry_count = 0
        self.max_retries = 10
        self.retry_delay = 5
        
        # Kafka configuration
        self.kafka_config = {
            'bootstrap_servers': brokers,
            'client_id': client_id,
            'group_id': group_id,
            'auto_offset_reset': 'latest',
            'enable_auto_commit': True,
            'auto_commit_interval_ms': 1000,
            'session_timeout_ms': 30000,
            'heartbeat_interval_ms': 3000,
            'max_poll_records': 500,
            'max_poll_interval_ms': 300000,
            'value_deserializer': lambda m: json.loads(m.decode('utf-8')),
            'key_deserializer': lambda m: m.decode('utf-8') if m else None,
        }
        
        self.consumer = None
        self.consume_task: asyncio.Task | None = None
        self.loop: asyncio.AbstractEventLoop | None = None
        
    async def start(self):
        """Start the consumer and begin listening for messages.

        IMPORTANT: This method configures the consumer and then offloads the
        blocking consume loop to a background thread so it does not block the
        FastAPI event loop. This allows the service to respond to health checks
        immediately while the consumer runs in the background.
        """
        while self.retry_count < self.max_retries:
            try:
                # Ensure topics exist before subscribing
                try:
                    admin = KafkaAdminClient(
                        bootstrap_servers=self.kafka_config['bootstrap_servers'],
                        client_id=self.kafka_config['client_id']
                    )
                    existing_topics = set(admin.list_topics() or [])
                    to_create = [t for t in self.topics if t not in existing_topics]
                    if to_create:
                        new_topics = [NewTopic(name=t, num_partitions=1, replication_factor=1) for t in to_create]
                        try:
                            admin.create_topics(new_topics=new_topics, validate_only=False)
                        except Exception:
                            # Ignore if topics already being created by others
                            pass
                    admin.close()
                except Exception as ensure_err:
                    logger.warn("Failed to ensure topics exist (continuing)", error=str(ensure_err))

                self.consumer = KafkaConsumer(**self.kafka_config)

                # Subscribe to topics
                self.consumer.subscribe(self.topics)
                logger.info("KafkaEventConsumer connected successfully")
                logger.info(f"Subscribed to topics: {self.topics}")

                self.running = True
                self.retry_count = 0  # Reset retry count on success

                # Capture the running loop so we can dispatch coroutines from the thread
                self.loop = asyncio.get_running_loop()

                # Offload the blocking consume loop to a background thread
                self.consume_task = asyncio.create_task(asyncio.to_thread(self._consume_messages_sync))
                return  # Do not block the event loop

            except Exception as error:
                self.retry_count += 1
                logger.error(
                    "KafkaEventConsumer connection failed",
                    error=str(error),
                    retry_count=self.retry_count,
                    max_retries=self.max_retries
                )

                if self.retry_count >= self.max_retries:
                    logger.error("Max retries reached for KafkaEventConsumer, giving up")
                    raise error

                logger.info(
                    "Retrying KafkaEventConsumer connection",
                    retry_count=self.retry_count,
                    delay_seconds=self.retry_delay
                )
                await asyncio.sleep(self.retry_delay)
    
    def _consume_messages_sync(self):
        """Consume messages from Kafka topics in a blocking loop (runs in a thread)."""
        try:
            for message in self.consumer:
                if not self.running:
                    break

                try:
                    # Build a rich payload to include topic and key
                    payload = {
                        "topic": message.topic,
                        "key": message.key.decode("utf-8") if message.key else None,
                        "timestamp": getattr(message, "timestamp", None),
                        "value": message.value,
                    }

                    # Dispatch handler appropriately
                    if asyncio.iscoroutinefunction(self.message_handler):
                        # Schedule coroutine on the main loop without blocking this thread
                        if self.loop is not None:
                            asyncio.run_coroutine_threadsafe(self.message_handler(payload), self.loop)
                        else:
                            # Fallback: run synchronously (last resort)
                            asyncio.run(self.message_handler(payload))
                    else:
                        self.message_handler(payload)

                    # Update metrics
                    KAFKA_MESSAGES_PROCESSED.labels(
                        topic=message.topic,
                        status="success"
                    ).inc()

                except Exception as e:
                    logger.error(
                        "Error processing Kafka message",
                        error=str(e),
                        topic=message.topic,
                        partition=message.partition,
                        offset=message.offset
                    )

                    # Update metrics for failed messages
                    KAFKA_MESSAGES_PROCESSED.labels(
                        topic=message.topic,
                        status="error"
                    ).inc()

        except Exception as e:
            logger.error("Error in Kafka consumer loop", error=str(e))
            self.running = False
            # Do not re-raise here; background thread should exit quietly
    
    async def _process_message(self, message):
        """Process a single Kafka message."""
        try:
            # Build a rich payload to include topic and key
            payload = {
                "topic": message.topic,
                "key": message.key.decode("utf-8") if message.key else None,
                "timestamp": getattr(message, "timestamp", None),
                "value": message.value,
            }

            # Call the message handler
            if asyncio.iscoroutinefunction(self.message_handler):
                await self.message_handler(payload)
            else:
                self.message_handler(payload)

            logger.debug(
                "Message processed successfully",
                topic=message.topic,
                partition=message.partition,
                offset=message.offset
            )

        except Exception as e:
            logger.error(
                "Error in message handler",
                error=str(e),
                topic=message.topic,
                partition=message.partition,
                offset=message.offset
            )
            raise
    
    async def stop(self):
        """Gracefully stop the consumer."""
        if self.running and self.consumer:
            self.running = False
            try:
                self.consumer.close()
            finally:
                # Cancel background task if any
                if self.consume_task:
                    self.consume_task.cancel()
            logger.info("KafkaEventConsumer stopped successfully")
    
    def get_consumer_lag(self):
        """Get consumer lag for monitoring."""
        if not self.consumer:
            return {}
            
        lag_info = {}
        for topic in self.topics:
            partitions = self.consumer.partitions_for_topic(topic)
            if partitions:
                for partition in partitions:
                    tp = (topic, partition)
                    try:
                        # Get lag information
                        committed = self.consumer.committed([tp])
                        end_offsets = self.consumer.end_offsets([tp])
                        
                        if tp in committed and tp in end_offsets:
                            lag = end_offsets[tp] - committed[tp]
                            KAFKA_CONSUMER_LAG.labels(
                                topic=topic,
                                partition=partition
                            ).set(lag)
                            lag_info[f"{topic}:{partition}"] = lag
                    except Exception as e:
                        logger.error(
                            "Error getting consumer lag",
                            error=str(e),
                            topic=topic,
                            partition=partition
                        )
        
        return lag_info 