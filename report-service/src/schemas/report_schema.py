from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class ReportType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

class ReportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ItemType(str, Enum):
    CHART = "chart"
    TABLE = "table"
    METRIC = "metric"
    TEXT = "text"

# Base schemas
class ReportBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    report_type: ReportType
    metadata: Optional[Dict[str, Any]] = None

class ReportItemBase(BaseModel):
    item_type: ItemType
    title: Optional[str] = None
    content: Dict[str, Any]
    order_index: int = 0

class ReportTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    template_type: ReportType
    config: Dict[str, Any]
    is_active: bool = True

class ReportScheduleBase(BaseModel):
    template_id: str
    name: str = Field(..., min_length=1, max_length=255)
    schedule_type: str = Field(..., pattern="^(daily|weekly|monthly)$")
    schedule_config: Dict[str, Any]
    recipients: List[str]
    is_active: bool = True

# Create schemas
class ReportCreate(ReportBase):
    pass

class ReportItemCreate(ReportItemBase):
    pass

class ReportTemplateCreate(ReportTemplateBase):
    pass

class ReportScheduleCreate(ReportScheduleBase):
    pass

# Response schemas
class ReportItemResponse(ReportItemBase):
    id: str
    report_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReportResponse(ReportBase):
    id: str
    status: ReportStatus
    file_path: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    report_items: List[ReportItemResponse] = []
    
    class Config:
        from_attributes = True

class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int

class ReportTemplateResponse(ReportTemplateBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ReportScheduleResponse(ReportScheduleBase):
    id: str
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Analytics schemas
class AnalyticsData(BaseModel):
    period: str
    value: float
    change_percentage: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class DailyAnalytics(BaseModel):
    date: str
    total_reports: int
    completed_reports: int
    failed_reports: int
    average_generation_time: float
    popular_report_types: List[Dict[str, Any]]

class WeeklyAnalytics(BaseModel):
    week_start: str
    week_end: str
    total_reports: int
    completed_reports: int
    failed_reports: int
    average_generation_time: float
    daily_breakdown: List[DailyAnalytics]

class MonthlyAnalytics(BaseModel):
    month: str
    year: int
    total_reports: int
    completed_reports: int
    failed_reports: int
    average_generation_time: float
    weekly_breakdown: List[WeeklyAnalytics]
    top_report_types: List[Dict[str, Any]] 