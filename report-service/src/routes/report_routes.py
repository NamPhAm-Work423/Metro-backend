from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from ..config.database import get_db
from ..config.logger import logger
from ..models.report_model import Report, ReportTemplate, ReportSchedule
from ..services.report_service import ReportService
from ..schemas.report_schema import (
    ReportCreate, ReportResponse, ReportListResponse,
    ReportTemplateCreate, ReportScheduleCreate,
    ReportTemplateResponse, ReportScheduleResponse
)
from ..middlewares.authz_fastapi import authorize_roles

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/create-report", response_model=ReportResponse, dependencies=[Depends(authorize_roles(["admin"]))])
async def create_report(
    report_data: ReportCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        report_service = ReportService(db)
        report = await report_service.create_report(report_data)
        background_tasks.add_task(report_service.generate_report, report.id)
        logger.info("Report created successfully", report_id=report.id)
        return report
    except Exception as e:
        logger.error("Failed to create report", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create report")


@router.get("/get-reports", response_model=ReportListResponse, dependencies=[Depends(authorize_roles(["admin"]))])
async def get_reports(
    skip: int = 0,
    limit: int = 10,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    try:
        report_service = ReportService(db)
        reports = await report_service.get_reports(skip, limit, report_type, status)
        return {"reports": reports, "total": len(reports)}
    except Exception as e:
        logger.error("Failed to get reports", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get reports")


@router.get("/get-report/{report_id}", response_model=ReportResponse, dependencies=[Depends(authorize_roles(["admin"]))])
async def get_report(report_id: str, db: Session = Depends(get_db)):
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


@router.delete("/delete-report/{report_id}", dependencies=[Depends(authorize_roles(["admin"]))])
async def delete_report(report_id: str, db: Session = Depends(get_db)):
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


@router.post("/create-template", response_model=ReportTemplateResponse, dependencies=[Depends(authorize_roles(["admin"]))])
async def create_template(
    template_data: ReportTemplateCreate,
    db: Session = Depends(get_db)
):
    try:
        report_service = ReportService(db)
        template = await report_service.create_template(template_data)
        logger.info("Report template created successfully", template_id=template.id)
        return template
    except Exception as e:
        logger.error("Failed to create template", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create template")


@router.get("/get-templates", response_model=List[ReportTemplateResponse], dependencies=[Depends(authorize_roles(["admin"]))])
async def get_templates(db: Session = Depends(get_db)):
    try:
        report_service = ReportService(db)
        templates = await report_service.get_templates()
        return templates
    except Exception as e:
        logger.error("Failed to get templates", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get templates")


@router.post("/create-schedule", response_model=ReportScheduleResponse, dependencies=[Depends(authorize_roles(["admin"]))])
async def create_schedule(
    schedule_data: ReportScheduleCreate,
    db: Session = Depends(get_db)
):
    try:
        report_service = ReportService(db)
        schedule = await report_service.create_schedule(schedule_data)
        logger.info("Report schedule created successfully", schedule_id=schedule.id)
        return schedule
    except Exception as e:
        logger.error("Failed to create schedule", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to create schedule")


@router.get("/get-daily-analytics", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_daily_analytics(db: Session = Depends(get_db)):
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_daily_analytics()
        return analytics
    except Exception as e:
        logger.error("Failed to get daily analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get daily analytics")


@router.get("/get-weekly-analytics", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_weekly_analytics(db: Session = Depends(get_db)):
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_weekly_analytics()
        return analytics
    except Exception as e:
        logger.error("Failed to get weekly analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get weekly analytics")


@router.get("/get-monthly-analytics", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_monthly_analytics(db: Session = Depends(get_db)):
    try:
        report_service = ReportService(db)
        analytics = await report_service.get_monthly_analytics()
        return analytics
    except Exception as e:
        logger.error("Failed to get monthly analytics", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get monthly analytics")


