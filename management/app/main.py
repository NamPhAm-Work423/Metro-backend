"""
main.py - Entry point for management app
- Initialize metrics monitor
- Create database tables if needed
- Example to send Kafka event
"""
from management.app.utils.metrics import system_monitor
from management.app.kafka.producer import producer, MANAGEMENT_EVENTS_TOPIC
from management.app.kafka.event import Event, EventType
# from management.app.configs.database import db  # If need to create tables

import time

def main():
    # Start system metrics monitor
    system_monitor.start()
    print("System metrics monitor started.")

    # Create database tables if needed (comment out if no db)
    # db.create_all()
    # print("Database tables created.")

    # Example to send Kafka event
    event = Event(source="management", op=EventType.METRICS, payload={"status": "app started"})
    producer.send_event(MANAGEMENT_EVENTS_TOPIC, event)
    print(f"Sent event to topic {MANAGEMENT_EVENTS_TOPIC}: {event.to_dict()}")

    # App run in background (mock)
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        print("Shutting down...")
        system_monitor.stop()

if __name__ == "__main__":
    main()
