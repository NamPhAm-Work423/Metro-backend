from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..config.database import Base
import uuid

# ================================
# CORE REPORT MODELS
# ================================

class Report(Base):
    """Generated reports with metadata and status tracking"""
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    report_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    file_path = Column(String(500))  # Path to generated report file
    report_metadata = Column(JSON)  # Report-specific metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True))
    
    # Relationships
    items = relationship("ReportItem", back_populates="report", cascade="all, delete-orphan")


class ReportItem(Base):
    """Individual components within a report (charts, tables, metrics)"""
    __tablename__ = "report_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey("reports.id"), nullable=False)
    item_type = Column(String(50), nullable=False)  # chart, table, metric, text, image
    title = Column(String(255))
    content = Column(JSON)  # Structured content data
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    report = relationship("Report", back_populates="items")


class ReportTemplate(Base):
    """Reusable templates for report generation"""
    __tablename__ = "report_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_type = Column(String(50), nullable=False)  # daily, weekly, monthly, custom
    config = Column(JSON)  # Template configuration and layout
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    schedules = relationship("ReportSchedule", back_populates="template")


class ReportSchedule(Base):
    """Automated report generation schedules"""
    __tablename__ = "report_schedules"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    template_id = Column(String(36), ForeignKey("report_templates.id"), nullable=False)
    name = Column(String(255), nullable=False)
    schedule_type = Column(String(20), nullable=False)  # daily, weekly, monthly, cron
    schedule_config = Column(JSON)  # Cron expression or schedule details
    recipients = Column(JSON)  # Email recipients list
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime(timezone=True))
    next_run = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    template = relationship("ReportTemplate", back_populates="schedules")

# ================================
# GENERIC EVENT TRACKING MODELS
# ================================

class EventLog(Base):
    """Universal event tracking for all system events"""
    __tablename__ = "event_logs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Event identification
    event_type = Column(String(100), nullable=False, index=True)  # ticket.used, user.login, etc.
    event_category = Column(String(50), nullable=False, index=True)  # ticket, user, payment, transport
    
    # Entity information
    entity_id = Column(String(100), nullable=False, index=True)  # ticket_id, user_id, etc.
    entity_type = Column(String(50), nullable=False, index=True)  # ticket, user, payment
    
    # Event data
    event_data = Column(JSON)  # Full event payload
    processed_data = Column(JSON)  # Processed/normalized data for analytics
    
    # Temporal information
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)  # When event occurred
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # When recorded
    
    # Source tracking
    source_service = Column(String(50))  # Which service generated the event
    correlation_id = Column(String(100), index=True)  # For tracing related events


class MetricSnapshot(Base):
    """Time-series metrics for analytics and reporting"""
    __tablename__ = "metric_snapshots"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Metric identification
    metric_name = Column(String(100), nullable=False, index=True)
    metric_category = Column(String(50), nullable=False, index=True)  # usage, revenue, performance
    
    # Metric value
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20))  # count, currency, percentage, etc.
    
    # Dimensions for grouping/filtering
    dimensions = Column(JSON)  # {station_id: "ben-thanh", route_id: "line-1", etc.}
    
    # Temporal information
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    period_type = Column(String(20))  # hourly, daily, weekly, monthly
    
    # Aggregation metadata
    aggregation_type = Column(String(20))  # sum, avg, count, max, min
    sample_count = Column(Integer)  # How many events contributed to this metric
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# ================================
# DOMAIN-SPECIFIC VIEWS (Optional)
# ================================

class TicketEventView(Base):
    """Materialized view for ticket-related events (for performance)"""
    __tablename__ = "ticket_event_views"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Ticket information
    ticket_id = Column(String(100), nullable=False, index=True)
    passenger_id = Column(String(100), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(50), nullable=False, index=True)  # created, activated, used, cancelled
    event_timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # Location context
    station_id = Column(String(100), index=True)
    station_name = Column(String(255))
    route_id = Column(String(100), index=True)
    route_name = Column(String(255))
    
    # Transaction details
    amount = Column(Float)
    usage_type = Column(String(20))  # entry, exit, transfer
    
    # Derived fields for analytics
    date_partition = Column(String(10), index=True)  # YYYY-MM-DD for partitioning
    hour_partition = Column(Integer, index=True)  # 0-23 for hourly analysis
    
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 
