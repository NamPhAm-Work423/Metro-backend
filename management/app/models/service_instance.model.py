from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, func, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import VARCHAR
import uuid
from management.app.configs.database import Base
from .service.model import Service

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
    metadata = Column(JSON, nullable=True)
    last_heartbeat = Column(DateTime(timezone=True), nullable=True)

    def __init__(self, host, port, endpoint, status=True, service_id=None, skeleton_path= None, version='1.0.0', metadata=None, last_heartbeat=None):
        self.host = host
        self.port = port
        self.endpoint = endpoint
        self.status = status
        self.service_id = service_id
        self.skeleton_path = skeleton_path  
        self.version = version
        self.metadata = metadata
        self.last_heartbeat = last_heartbeat

    def __repr__(self):
        return f"<ServiceInstance(id={self.id}, host={self.host}, port={self.port}, status={self.status})>"
