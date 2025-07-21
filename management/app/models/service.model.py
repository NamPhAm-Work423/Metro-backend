from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.mysql import VARCHAR
import uuid
from management.app.configs.database import Base
from .service_instance.model import ServiceInstance

class Service(Base):
    __tablename__ = 'services'

    id = Column(VARCHAR(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False, unique=True)

    service_instances = relationship('ServiceInstance', back_populates='service')

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f"<Service(id={self.id}, name={self.name})>"

    def add_service_instance(self, session, host, port, endpoint):
        service_instance = ServiceInstance(host=host, port=port, endpoint=endpoint, service_id=self.id)
        session.add(service_instance)
        session.commit()
        return service_instance