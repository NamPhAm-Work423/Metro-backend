from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import VARCHAR
import uuid

from app.configs.database import Base


class ServiceInstance(Base):
    __tablename__ = 'service_instances'

    id = Column(VARCHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    host = Column(String(255), nullable=True)
    port = Column(Integer, nullable=True)
    endpoint = Column(String(255), nullable=True)
    status = Column(Boolean, nullable=False, default=True)
    skeleton_path = Column(String(255), nullable=True)

    service_id = Column(VARCHAR(36), ForeignKey('services.id'))
    service = relationship('Service', back_populates='service_instances')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    version = Column(String(50), nullable=False, default='1.0.0')
    metadata_json = Column(JSON, nullable=True)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)

    def __init__(
        self,
        host: str,
        port: int,
        endpoint: str,
        status: bool = True,
        service_id: str | None = None,
        skeleton_path: str | None = None,
        version: str = '1.0.0',
        metadata_json: dict | None = None,
        last_heartbeat=None,
    ):
        self.host = host
        self.port = port
        self.endpoint = endpoint
        self.status = status
        self.service_id = service_id
        self.skeleton_path = skeleton_path
        self.version = version
        self.metadata_json = metadata_json
        self.last_heartbeat = last_heartbeat

    def __repr__(self) -> str:
        return f"<ServiceInstance(id={self.id}, host={self.host}, port={self.port}, status={self.status})>"


