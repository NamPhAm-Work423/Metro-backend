from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from pathlib import Path

from ..config.database import get_db
from ..config.logger import logger
from ..models.report_model import Report, ReportItem, ReportTemplate, ReportSchedule
from ..services.report_service import ReportService
from ..schemas.report_schema import (
    ReportCreate, ReportResponse, ReportListResponse,
    ReportTemplateCreate, ReportScheduleCreate
)

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/", response_model=ReportResponse)
async def create_report(
    report_data: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new report"""
    try:
        report_service = ReportService(db)
        report = await report_service.create_report(report_data)
        
        # Add background task to generate report
        background_tasks.add_task(report_service.generate_report, report.id)
        
        logger.info("Report created successfully", report_id=report.id)
        return report
        
    except Exception as e:
        logger.error("Failed to create report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create report")

@router.get("/", response_model=ReportListResponse)
async def get_reports(
    skip: int = 0,
    limit: int = 10,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get list of reports with optional filtering"""
    try:
        report_service = ReportService(db)
        reports = await report_service.get_reports(skip, limit, report_type, status)
        return {"reports": reports, "total": len(reports)}
        
    except Exception as e:
        logger.error("Failed to get reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get reports")

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db: Session = Depends(get_db)):
    """Get a specific report by ID"""
    try:
        report_service = ReportService(db)
        report = await report_service.get_report(report_id)
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
            
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to get report", error=str(e), report_id=report_id)
        raise HTTPException(status_code=500, detail="Failed to get report")

@router.delete("/{report_id}")
async def delete_report(report_id: str, db: Session = Depends(get_db)):
    """Delete a report"""
    try:
        report_service = ReportService(db)
        success = await report_service.delete_report(report_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Report not found")
            
        logger.info("Report deleted successfully", report_id=report_id)
        return {"message": "Report deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to delete report", error=str(e), report_id=report_id)
        raise HTTPException(status_code=500, detail="Failed to delete report")

@router.post("/templates", response_model=ReportTemplate)
async def create_template(
    template_data: ReportTemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new report template"""
    try:
        report_service = ReportService(db)
        template = await report_service.create_template(template_data)
        
        logger.info("Report template created successfully", template_id=template.id)
        return template
        
    except Exception as e:
        logger.error("Failed to create template", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create template")

@router.get("/templates", response_model=List[ReportTemplate])
async def get_templates(db: Session = Depends(get_db)):
    """Get all report templates"""
    try:
        report_service = ReportService(db)
        templates = await report_service.get_templates()
        return templates
        
    except Exception as e:
        logger.error("Failed to get templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get templates")

@router.post("/schedules", response_model=ReportSchedule)
async def create_schedule(
    schedule_data: ReportScheduleCreate,
    db: Session = Depends(get_db)
):
    """Create a new report schedule"""
    try:
        report_service = ReportService(db)
        schedule = await report_service.create_schedule(schedule_data)
        
        logger.info("Report schedule created successfully", schedule_id=schedule.id)
        return schedule
        
    except Exception as e:
        logger.error("Failed to create schedule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create schedule")

@router.get("/analytics/daily")
async def get_daily_analytics(db: Session = Depends(get_db)):
    """Get daily analytics data"""
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_daily_analytics()
        return analytics
        
    except Exception as e:
        logger.error("Failed to get daily analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get daily analytics")

@router.get("/analytics/weekly")
async def get_weekly_analytics(db: Session = Depends(get_db)):
    """Get weekly analytics data"""
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_weekly_analytics()
        return analytics
        
    except Exception as e:
        logger.error("Failed to get weekly analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get weekly analytics")

@router.get("/analytics/monthly")
async def get_monthly_analytics(db: Session = Depends(get_db)):
    """Get monthly analytics data"""
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_monthly_analytics()
        return analytics
        
    except Exception as e:
        logger.error("Failed to get monthly analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get monthly analytics") 