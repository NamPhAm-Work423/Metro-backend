from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
from pathlib import Path
import asyncio
import json

from ..config.logger import logger
from ..models.report_model import Report, ReportItem, ReportTemplate, ReportSchedule, ReportMetric
from ..schemas.report_schema import (
    ReportCreate, ReportTemplateCreate, ReportScheduleCreate,
    ReportStatus, ItemType
)

class ReportService:
    def __init__(self, db: Session):
        self.db = db
        self.reports_dir = Path("reports")
        self.reports_dir.mkdir(exist_ok=True)
    
    async def create_report(self, report_data: ReportCreate) -> Report:
        """Create a new report"""
        try:
            report = Report(
                title=report_data.title,
                description=report_data.description,
                report_type=report_data.report_type.value,
                metadata_json=report_data.metadata or {},
                status=ReportStatus.PENDING.value
            )
            
            self.db.add(report)
            self.db.commit()
            self.db.refresh(report)
            
            logger.info("Report created", report_id=report.id, title=report.title)
            return report
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to create report", error=str(e))
            raise
    
    async def get_reports(
        self, 
        skip: int = 0, 
        limit: int = 10,
        report_type: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Report]:
        """Get reports with optional filtering"""
        try:
            query = self.db.query(Report)
            
            if report_type:
                query = query.filter(Report.report_type == report_type)
            
            if status:
                query = query.filter(Report.status == status)
            
            reports = query.offset(skip).limit(limit).order_by(desc(Report.created_at)).all()
            return reports
            
        except Exception as e:
            logger.error("Failed to get reports", error=str(e))
            raise
    
    async def get_report(self, report_id: str) -> Optional[Report]:
        """Get a specific report by ID"""
        try:
            report = self.db.query(Report).filter(Report.id == report_id).first()
            return report
            
        except Exception as e:
            logger.error("Failed to get report", error=str(e), report_id=report_id)
            raise
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete a report"""
        try:
            report = self.db.query(Report).filter(Report.id == report_id).first()
            if not report:
                return False
            
            # Delete associated file if it exists
            if report.file_path:
                try:
                    Path(report.file_path).unlink(missing_ok=True)
                except Exception as e:
                    logger.warning("Failed to delete report file", error=str(e))
            
            self.db.delete(report)
            self.db.commit()
            
            logger.info("Report deleted", report_id=report_id)
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to delete report", error=str(e), report_id=report_id)
            raise
    
    async def generate_report(self, report_id: str):
        """Generate report content and save to file"""
        try:
            report = await self.get_report(report_id)
            if not report:
                logger.error("Report not found", report_id=report_id)
                return
            
            # Update status to processing
            report.status = ReportStatus.PROCESSING.value
            self.db.commit()
            
            logger.info("Starting report generation", report_id=report_id)
            
            # Generate report content based on type
            if report.report_type == "daily":
                await self._generate_daily_report(report)
            elif report.report_type == "weekly":
                await self._generate_weekly_report(report)
            elif report.report_type == "monthly":
                await self._generate_monthly_report(report)
            else:
                await self._generate_custom_report(report)
            
            # Update status to completed
            report.status = ReportStatus.COMPLETED.value
            report.completed_at = datetime.utcnow()
            self.db.commit()
            
            logger.info("Report generation completed", report_id=report_id)
            
        except Exception as e:
            # Update status to failed
            report.status = ReportStatus.FAILED.value
            self.db.commit()
            
            logger.error("Report generation failed", error=str(e), report_id=report_id)
            raise
    
    async def _generate_daily_report(self, report: Report):
        """Generate daily report"""
        # Simulate data collection
        data = {
            'date': datetime.now().strftime('%Y-%m-%d'),
            'total_tickets': 1250,
            'revenue': 45000,
            'passengers': 8900,
            'routes': 15
        }
        
        # Create report items
        await self._create_report_items(report, data)
        
        # Generate PDF/HTML report
        file_path = await self._generate_report_file(report, data)
        report.file_path = str(file_path)
    
    async def _generate_weekly_report(self, report: Report):
        """Generate weekly report"""
        # Simulate weekly data
        data = {
            'week_start': (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'),
            'week_end': datetime.now().strftime('%Y-%m-%d'),
            'total_tickets': 8750,
            'revenue': 315000,
            'passengers': 62300,
            'routes': 15,
            'daily_breakdown': [
                {'date': '2024-01-01', 'tickets': 1200, 'revenue': 43200},
                {'date': '2024-01-02', 'tickets': 1180, 'revenue': 42480},
                # ... more days
            ]
        }
        
        await self._create_report_items(report, data)
        file_path = await self._generate_report_file(report, data)
        report.file_path = str(file_path)
    
    async def _generate_monthly_report(self, report: Report):
        """Generate monthly report"""
        # Simulate monthly data
        data = {
            'month': datetime.now().strftime('%B %Y'),
            'total_tickets': 37500,
            'revenue': 1350000,
            'passengers': 267000,
            'routes': 15,
            'top_routes': [
                {'route': 'A-B', 'tickets': 5200, 'revenue': 187200},
                {'route': 'C-D', 'tickets': 4800, 'revenue': 172800},
                # ... more routes
            ]
        }
        
        await self._create_report_items(report, data)
        file_path = await self._generate_report_file(report, data)
        report.file_path = str(file_path)
    
    async def _generate_custom_report(self, report: Report):
        """Generate custom report based on metadata"""
        # Use metadata to determine report content
        metadata = report.metadata_json or {}
        data = {
            'custom_data': metadata.get('data', {}),
            'filters': metadata.get('filters', {}),
            'generated_at': datetime.now().isoformat()
        }
        
        await self._create_report_items(report, data)
        file_path = await self._generate_report_file(report, data)
        report.file_path = str(file_path)
    
    async def _create_report_items(self, report: Report, data: Dict[str, Any]):
        """Create report items for the report"""
        items = []
        
        # Create summary metrics
        summary_item = ReportItem(
            report_id=report.id,
            item_type=ItemType.METRIC.value,
            title="Summary",
            content={
                'metrics': [
                    {'name': 'Total Tickets', 'value': data.get('total_tickets', 0)},
                    {'name': 'Revenue', 'value': f"${data.get('revenue', 0):,}"},
                    {'name': 'Passengers', 'value': f"{data.get('passengers', 0):,}"},
                ]
            },
            order_index=0
        )
        items.append(summary_item)
        
        # Create chart if applicable
        if 'daily_breakdown' in data:
            chart_item = ReportItem(
                report_id=report.id,
                item_type=ItemType.CHART.value,
                title="Daily Breakdown",
                content={
                    'chart_type': 'line',
                    'data': data['daily_breakdown'],
                    'x_axis': 'date',
                    'y_axis': 'tickets'
                },
                order_index=1
            )
            items.append(chart_item)
        
        # Add items to database
        for item in items:
            self.db.add(item)
        
        self.db.commit()
    
    async def _generate_report_file(self, report: Report, data: Dict[str, Any]) -> Path:
        """Generate PDF/HTML report file"""
        # Create simple HTML report
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{report.title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .metric {{ margin: 20px 0; padding: 15px; background: #f5f5f5; }}
                .chart {{ margin: 20px 0; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>{report.title}</h1>
                <p>{report.description or ''}</p>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Type: {report.report_type}</p>
            </div>
            
            <div class="metric">
                <h2>Summary</h2>
                <p>Total Tickets: {data.get('total_tickets', 0):,}</p>
                <p>Revenue: ${data.get('revenue', 0):,}</p>
                <p>Passengers: {data.get('passengers', 0):,}</p>
            </div>
        </body>
        </html>
        """
        
        # Save to file
        filename = f"report_{report.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        file_path = self.reports_dir / filename
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return file_path
    
    async def create_template(self, template_data: ReportTemplateCreate) -> ReportTemplate:
        """Create a new report template"""
        try:
            template = ReportTemplate(
                name=template_data.name,
                description=template_data.description,
                template_type=template_data.template_type.value,
                config=template_data.config,
                is_active=1 if template_data.is_active else 0
            )
            
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)
            
            logger.info("Template created", template_id=template.id, name=template.name)
            return template
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to create template", error=str(e))
            raise
    
    async def get_templates(self) -> List[ReportTemplate]:
        """Get all report templates"""
        try:
            templates = self.db.query(ReportTemplate).filter(ReportTemplate.is_active == 1).all()
            return templates
            
        except Exception as e:
            logger.error("Failed to get templates", error=str(e))
            raise
    
    async def create_schedule(self, schedule_data: ReportScheduleCreate) -> ReportSchedule:
        """Create a new report schedule"""
        try:
            schedule = ReportSchedule(
                template_id=schedule_data.template_id,
                name=schedule_data.name,
                schedule_type=schedule_data.schedule_type,
                schedule_config=schedule_data.schedule_config,
                recipients=schedule_data.recipients,
                is_active=1 if schedule_data.is_active else 0
            )
            
            self.db.add(schedule)
            self.db.commit()
            self.db.refresh(schedule)
            
            logger.info("Schedule created", schedule_id=schedule.id, name=schedule.name)
            return schedule
            
        except Exception as e:
            self.db.rollback()
            logger.error("Failed to create schedule", error=str(e))
            raise
    
    async def get_daily_analytics(self) -> Dict[str, Any]:
        """Get daily analytics data"""
        try:
            today = datetime.now().date()

            # Core KPIs from metrics
            total_logins = self.db.query(func.count(ReportMetric.id)).filter(
                ReportMetric.metric_name == 'user_login',
                func.date(ReportMetric.timestamp) == today
            ).scalar() or 0

            total_registrations = self.db.query(func.count(ReportMetric.id)).filter(
                ReportMetric.metric_name == 'user_registered',
                func.date(ReportMetric.timestamp) == today
            ).scalar() or 0

            tickets_activated = self.db.query(func.count(ReportMetric.id)).filter(
                ReportMetric.metric_name == 'ticket_activated',
                func.date(ReportMetric.timestamp) == today
            ).scalar() or 0

            tickets_used = self.db.query(func.count(ReportMetric.id)).filter(
                ReportMetric.metric_name == 'ticket_used',
                func.date(ReportMetric.timestamp) == today
            ).scalar() or 0

            # Top stations by usage today
            top_stations = (
                self.db.query(
                    (ReportMetric.metadata_json['station_id'].astext).label('station_id'),
                    func.count(ReportMetric.id).label('uses')
                )
                .filter(
                    ReportMetric.metric_name == 'ticket_used',
                    func.date(ReportMetric.timestamp) == today
                )
                .group_by(ReportMetric.metadata_json['station_id'].astext)
                .order_by(desc('uses'))
                .limit(5)
                .all()
            )

            return {
                'date': today.strftime('%Y-%m-%d'),
                'auth': {
                    'logins': total_logins,
                    'registrations': total_registrations,
                },
                'tickets': {
                    'activated': tickets_activated,
                    'used': tickets_used,
                    'topStations': [
                        {'stationId': s.station_id, 'uses': int(s.uses)} for s in top_stations if s.station_id is not None
                    ],
                },
            }
            
        except Exception as e:
            logger.error("Failed to get daily analytics", error=str(e))
            raise
    
    async def get_weekly_analytics(self) -> Dict[str, Any]:
        """Get weekly analytics data"""
        try:
            # Get last 7 days
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=6)

            # Daily series for logins and ticket activations
            daily_series = []
            for i in range(7):
                day = start_date + timedelta(days=i)
                logins = self.db.query(func.count(ReportMetric.id)).filter(
                    ReportMetric.metric_name == 'user_login',
                    func.date(ReportMetric.timestamp) == day
                ).scalar() or 0
                activations = self.db.query(func.count(ReportMetric.id)).filter(
                    ReportMetric.metric_name == 'ticket_activated',
                    func.date(ReportMetric.timestamp) == day
                ).scalar() or 0
                purchases = self.db.query(func.count(ReportMetric.id)).filter(
                    ReportMetric.metric_name == 'ticket_created',
                    func.date(ReportMetric.timestamp) == day
                ).scalar() or 0
                daily_series.append({
                    'date': day.strftime('%Y-%m-%d'),
                    'logins': logins,
                    'ticketPurchases': purchases,
                    'ticketActivations': activations,
                })

            return {
                'week_start': start_date.strftime('%Y-%m-%d'),
                'week_end': end_date.strftime('%Y-%m-%d'),
                'daily': daily_series,
            }
            
        except Exception as e:
            logger.error("Failed to get weekly analytics", error=str(e))
            raise
    
    async def get_monthly_analytics(self) -> Dict[str, Any]:
        """Get monthly analytics data"""
        try:
            # Get current month
            now = datetime.now()
            current_month = now.month
            current_year = now.year

            # Top routes by purchases this month (from ticket_created)
            top_routes = (
                self.db.query(
                    (ReportMetric.metadata_json['route_id'].astext).label('route_id'),
                    func.count(ReportMetric.id).label('tickets')
                )
                .filter(
                    ReportMetric.metric_name == 'ticket_created',
                    func.extract('month', ReportMetric.timestamp) == current_month,
                    func.extract('year', ReportMetric.timestamp) == current_year
                )
                .group_by(ReportMetric.metadata_json['route_id'].astext)
                .order_by(desc('tickets'))
                .limit(10)
                .all()
            )

            total_purchases = self.db.query(func.count(ReportMetric.id)).filter(
                ReportMetric.metric_name == 'ticket_created',
                func.extract('month', ReportMetric.timestamp) == current_month,
                func.extract('year', ReportMetric.timestamp) == current_year
            ).scalar() or 0

            return {
                'month': now.strftime('%Y-%m'),
                'tickets': {
                    'purchases': total_purchases,
                    'topRoutes': [
                        {'routeId': r.route_id, 'tickets': int(r.tickets)} for r in top_routes if r.route_id is not None
                    ]
                }
            }
            
        except Exception as e:
            logger.error("Failed to get monthly analytics", error=str(e))
            raise 