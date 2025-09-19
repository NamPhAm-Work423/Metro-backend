from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from ..config.database import get_db
from ..config.logger import logger
from ..models.report_model import Report, ReportTemplate, ReportSchedule, EventLog, MetricSnapshot, TicketEventView
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


@router.get("/event-logs", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_event_logs(
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
    event_category: Optional[str] = None,
    entity_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get universal event logs from all system events"""
    try:
        from datetime import datetime
        from sqlalchemy import desc, and_
        
        query = db.query(EventLog)
        
        # Apply filters
        filters = []
        if event_type:
            filters.append(EventLog.event_type == event_type)
        if event_category:
            filters.append(EventLog.event_category == event_category)
        if entity_id:
            filters.append(EventLog.entity_id == entity_id)
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                filters.append(EventLog.event_timestamp >= start_dt)
            except ValueError:
                pass
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                filters.append(EventLog.event_timestamp <= end_dt)
            except ValueError:
                pass
                
        if filters:
            query = query.filter(and_(*filters))
        
        # Get events
        events = query.order_by(desc(EventLog.event_timestamp)).offset(offset).limit(limit).all()
        
        # Get total count
        total = query.count()
        
        return {
            "events": [
                {
                    "id": event.id,
                    "event_type": event.event_type,
                    "event_category": event.event_category,
                    "entity_id": event.entity_id,
                    "entity_type": event.entity_type,
                    "processed_data": event.processed_data,
                    "event_timestamp": event.event_timestamp.isoformat() if event.event_timestamp else None,
                    "source_service": event.source_service,
                    "correlation_id": event.correlation_id,
                    "created_at": event.created_at.isoformat() if event.created_at else None
                }
                for event in events
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error("Failed to get event logs", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get event logs")


@router.get("/ticket-events", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_ticket_events(
    limit: int = 100,
    offset: int = 0,
    event_type: Optional[str] = None,
    station_id: Optional[str] = None,
    route_id: Optional[str] = None,
    date_partition: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get optimized ticket event views for analytics"""
    try:
        from sqlalchemy import desc, and_
        
        query = db.query(TicketEventView)
        
        # Apply filters
        filters = []
        if event_type:
            filters.append(TicketEventView.event_type == event_type)
        if station_id:
            filters.append(TicketEventView.station_id == station_id)
        if route_id:
            filters.append(TicketEventView.route_id == route_id)
        if date_partition:
            filters.append(TicketEventView.date_partition == date_partition)
                
        if filters:
            query = query.filter(and_(*filters))
        
        # Get events
        events = query.order_by(desc(TicketEventView.event_timestamp)).offset(offset).limit(limit).all()
        
        # Get total count
        total = query.count()
        
        return {
            "events": [
                {
                    "id": event.id,
                    "ticket_id": event.ticket_id,
                    "passenger_id": event.passenger_id,
                    "event_type": event.event_type,
                    "station_id": event.station_id,
                    "station_name": event.station_name,
                    "route_id": event.route_id,
                    "route_name": event.route_name,
                    "usage_type": event.usage_type,
                    "event_timestamp": event.event_timestamp.isoformat() if event.event_timestamp else None,
                    "date_partition": event.date_partition,
                    "hour_partition": event.hour_partition
                }
                for event in events
            ],
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error("Failed to get ticket events", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get ticket events")


@router.get("/ticket-usage-stats", dependencies=[Depends(authorize_roles(["admin"]))])
async def get_ticket_usage_stats(
    period: str = "today",  # today, week, month
    db: Session = Depends(get_db)
):
    """Get aggregated ticket usage statistics"""
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func, and_, desc
        
        now = datetime.now()
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == "week":
            start_date = now - timedelta(days=7)
            end_date = now
        elif period == "month":
            start_date = now - timedelta(days=30)
            end_date = now
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Total events by type from ticket event views
        event_counts = db.query(
            TicketEventView.event_type,
            func.count(TicketEventView.id).label('count')
        ).filter(
            and_(
                TicketEventView.event_timestamp >= start_date,
                TicketEventView.event_timestamp <= end_date
            )
        ).group_by(TicketEventView.event_type).all()
        
        # Top stations by usage
        top_stations = db.query(
            TicketEventView.station_id,
            TicketEventView.station_name,
            func.count(TicketEventView.id).label('usage_count')
        ).filter(
            and_(
                TicketEventView.event_timestamp >= start_date,
                TicketEventView.event_timestamp <= end_date,
                TicketEventView.event_type == 'used'
            )
        ).group_by(
            TicketEventView.station_id,
            TicketEventView.station_name
        ).order_by(desc('usage_count')).limit(10).all()
        
        # Top routes by usage
        top_routes = db.query(
            TicketEventView.route_id,
            TicketEventView.route_name,
            func.count(TicketEventView.id).label('ticket_count')
        ).filter(
            and_(
                TicketEventView.event_timestamp >= start_date,
                TicketEventView.event_timestamp <= end_date,
                TicketEventView.event_type.in_(['created', 'used'])
            )
        ).group_by(
            TicketEventView.route_id,
            TicketEventView.route_name
        ).order_by(desc('ticket_count')).limit(10).all()
        
        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "event_counts": {event.event_type: event.count for event in event_counts},
            "top_stations": [
                {
                    "station_id": station.station_id,
                    "station_name": station.station_name,
                    "usage_count": station.usage_count
                }
                for station in top_stations
            ],
            "top_routes": [
                {
                    "route_id": route.route_id,
                    "route_name": route.route_name,
                    "ticket_count": route.ticket_count
                }
                for route in top_routes
            ]
        }
        
    except Exception as e:
        logger.error("Failed to get ticket usage stats", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get ticket usage stats")


