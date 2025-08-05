from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..config.database import Base
import uuid

class Report(Base):
    """Report model for storing generated reports"""
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    report_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    file_path = Column(String(500))  # Path to generated report file
    metadata = Column(JSON)  # Additional report metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    report_items = relationship("ReportItem", back_populates="report", cascade="all, delete-orphan")

class ReportItem(Base):
    """Individual items within a report"""
    __tablename__ = "report_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    item_type = Column(String(50), nullable=False)  # chart, table, metric, text
    title = Column(String(255))
    content = Column(JSON)  # Chart data, table data, etc.
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    report = relationship("Report", back_populates="report_items")

class ReportTemplate(Base):
    """Templates for generating reports"""
    __tablename__ = "report_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    config = Column(JSON)  # Template configuration
    is_active = Column(Integer, default=1)  # 1 for active, 0 for inactive
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ReportSchedule(Base):
    """Scheduled report generation"""
    __tablename__ = "report_schedules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("report_templates.id"))
    name = Column(String(255), nullable=False)
    schedule_type = Column(String(20), nullable=False)  # daily, weekly, monthly
    schedule_config = Column(JSON)  # Cron expression or schedule details
    recipients = Column(JSON)  # List of email recipients
    is_active = Column(Integer, default=1)
    last_run = Column(DateTime(timezone=True))
    next_run = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate")

class ReportMetric(Base):
    """Metrics for monitoring report generation"""
    __tablename__ = "report_metrics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float)
    metric_unit = Column(String(20))
    report_id = Column(String(36), ForeignKey("reports.id"))
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    metadata = Column(JSON)
    
    # Relationships
    report = relationship("Report") 