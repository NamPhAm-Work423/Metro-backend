from confluent_kafka import Consumer, KafkaException
import json

class KafkaConsumerService:
    def __init__(self, topics, group_id=None, servers=None):
        self.topic = topics
        self.group_id = group_id
        self.servers = servers

        self.config = {
            'bootstrap.servers': self.servers,
            'group.id': self.group_id,
            'auto.offset.reset': 'earliest',
            'enable.auto.commit': False  # Disable auto commit for better control
        }
        
        self.consumer = Consumer(self.config)
        self.consumer.subscribe([self.topic])

    def consume_messages(self, process_function):
        """ Continuously consume messages and apply a processing function """
        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)
                
                if msg is None:
                    continue
                if msg.error():
                    print(f"Consumer error: {msg.error()}")
                    continue
                
                try:
                    # Decode bytes to string and parse JSON
                    message_str = msg.value().decode("utf-8")
                    message_data = json.loads(message_str)
                    print(message_data)
                    # Process the parsed message using the provided function
                    process_function(message_data)
                    self.consumer.commit(msg)
                except json.JSONDecodeError as e:
                    print(f"Error decoding JSON: {e}")
                    continue

        except KeyboardInterrupt:
            print("Stopping consumer...")

        finally:
            self.consumer.close()
            
    def _close(self):
        self.consumer.close()