"""
event.py - Define EventType and Event for Kafka event-driven system
"""
from datetime import datetime, timezone
import random
from typing import Dict, Any
from dataclasses import dataclass, field
from enum import Enum

class EventType(Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    FEEDBACK = "FEEDBACK"
    METRICS = "METRICS"
    ERROR = "ERROR"

def generate_event_id() -> int:
    """Generate unique id for event based on timestamp and random number"""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    random_part = random.randint(1000, 9999)
    return int(f"{timestamp}{random_part}")

@dataclass
class Event:
    source: str
    op: EventType
    payload: Dict[str, Any]
    id: int = field(default_factory=generate_event_id)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    version: str = field(default="1.0")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "op": self.op.value,
            "payload": self.payload,
            "timestamp": self.timestamp,
            "version": self.version
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        return cls(
            id=data.get('id', generate_event_id()),
            source=data['source'],
            op=EventType(data['op']),
            payload=data['payload'],
            timestamp=data.get('timestamp', datetime.utcnow().isoformat()),
            version=data.get('version', "1.0")
        )

    def validate(self) -> bool:
        try:
            assert self.source, "Source is required"
            assert isinstance(self.payload, dict), "Payload must be a dictionary"
            assert self.op in EventType, f"Invalid operation type: {self.op}"
            return True
        except AssertionError as e:
            raise ValueError(f"Event validation failed: {str(e)}") 