"""
Seed data for Report Service - Metro HCM Passenger Usage Analytics
Generates realistic passenger ticket usage data based on transport service routes and stations
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import uuid

from ..config.database import SessionLocal
from ..models.report_model import Report, ReportItem, ReportTemplate, ReportSchedule, EventLog, MetricSnapshot, TicketEventView
from ..config.logger import logger

# Metro routes data from transport service
ROUTES_DATA = [
    {
        'routeId': 'tuyen-metro-so-1-ben-thanh-suoi-tien',
        'name': 'Tuyến Metro số 1 (Bến Thành - Suối Tiên)',
        'stations': [
            'BX. Miền Đông mới', 'Suối Tiên', 'Công nghệ cao', 'Thủ Đức', 'Bình Thái',
            'Phước Long', 'Rạch Chiếc', 'An Phú', 'Thảo Điền', 'Cầu Sài Gòn',
            'Văn Thánh', 'Ba Son', 'Nhà hát', 'Bến Thành'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-2-bx-an-suong-moi-cat-lai',
        'name': 'Tuyến Metro số 2 (BX. An Sương Mới - Cát Lái)',
        'stations': [
            'BX. An Sương Mới', 'Tân Thới Nhất', 'Tham Lương', 'Phạm Văn Bạch', 'Bà Quẹo',
            'Nguyễn Hồng Đào', 'Đồng Đen', 'Bảy Hiền', 'Phạm Văn Hai', 'Lê Thị Riêng',
            'Hòa Hưng', 'Dân Chủ', 'Tao Đàn', 'Bến Thành', 'Mê Linh',
            'Quảng Trường Thủ Thiêm', 'Trần Não', 'Bình Khánh', 'Ga Thủ Thiêm',
            'Bình Trưng', 'Đồng Văn Cống', 'Cát Lái'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-3a-bx-mien-tay-moi-ben-thanh',
        'name': 'Tuyến Metro số 3a (BX. Miền Tây Mới - Bến Thành)',
        'stations': [
            'BX. Miền Tây Mới', 'Tân Kiên', 'An Lạc', 'Công Viên Phú Lâm', 'Phú Lâm',
            'Cây Gõ', 'Chợ Lớn', 'Thuận Kiều', 'Văn Lang', 'An Đông',
            'Cộng Hòa', '23 Tháng 9', 'Bến Thành'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-3b-cong-hoa-ga-di-an',
        'name': 'Tuyến Metro số 3b (Cộng Hòa - Ga Dĩ An)',
        'stations': [
            'Cộng Hòa', 'Tao Đàn', 'Dinh Độc Lập', 'Hồ Con Rùa', 'Thảo Cầm Viên',
            'Thị Nghè', 'Hàng Xanh', 'Xô Viết Nghệ Tĩnh', 'Bình Triệu',
            'Hiệp Bình Phước', 'Tam Bình – Gò Dưa', 'Sóng Thần', 'Ga Dĩ An'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-4-thuan-an-nha-be',
        'name': 'Tuyến Metro số 4 (Thuận An - Nhà Bè)',
        'stations': [
            'Thuận An', 'Lái Thiêu', 'Phú Long', 'Thạnh Lộc', 'Thạnh Xuân', 'Xóm Mới',
            'Bệnh Viện Gò Vấp', 'Nguyễn Văn Lượng', 'Quang Trung', 'Công Viên Gia Định',
            'Nguyễn Kiệm', 'Phú Nhuận', 'Cầu Kiệu', 'Công Viên Lê Văn Tám',
            'Hồ Con Rùa', 'Bến Thành', 'Khánh Hội', 'Tân Hưng', 'Tân Phong',
            'Nguyễn Văn Linh', 'Hồ Bán Nguyệt', 'Nam Sài Gòn', 'Phú Mỹ', 'Nhà Bè'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-5-bx-can-giuoc-cau-sai-gon',
        'name': 'Tuyến Metro số 5 (BX. Cần Giuộc - Cầu Sài Gòn)',
        'stations': [
            'Bến Xe Cần Giuộc', 'Bình Hưng', 'Tạ Quang Bửu', 'Xóm Củi', 'Thuận Kiều',
            'Phú Thọ', 'Bách Khoa', 'Bắc Hải', 'Chợ Tân Bình', 'Bảy Hiền',
            'Lăng Cha Cả', 'Hoàng Văn Thụ', 'Phú Nhuận', 'Nguyễn Văn Đậu',
            'Bà Chiểu', 'Hàng Xanh', 'Cầu Sài Gòn'
        ]
    },
    {
        'routeId': 'tuyen-metro-so-6-quoc-lo-1a-cong-hoa',
        'name': 'Tuyến Metro số 6 (Quốc Lộ 1A - Cộng Hòa)',
        'stations': [
            'Quốc Lộ 1A', 'Bình Hưng Hòa', 'Sơn Kỳ', 'Nguyễn Sơn', 'Bốn Xã',
            'Hòa Bình', 'Đầm Sen', 'Lãnh Binh Thăng', 'Phú Thọ', 'Thành Thái',
            'Lý Thái Tổ', 'Cộng Hòa'
        ]
    }
]

# Major interchange stations with higher traffic
MAJOR_STATIONS = {
    'Bến Thành': 3.5,  # Main hub
    'Cộng Hòa': 2.8,   # Major interchange
    'Cầu Sài Gòn': 2.2,
    'Tao Đàn': 2.0,
    'Hồ Con Rùa': 1.8,
    'Thuận Kiều': 1.6,
    'Bảy Hiền': 1.5,
    'Phú Nhuận': 1.4,
    'Hàng Xanh': 1.3
}

# Peak hour multipliers (5h-23h)
PEAK_HOURS = {
    5: 0.3,   # Early morning
    6: 1.8,   # Morning rush start
    7: 2.5,   # Peak morning rush
    8: 2.8,   # Peak morning rush
    9: 2.2,   # Morning rush end
    10: 1.2,  # Off-peak
    11: 1.0,  # Off-peak
    12: 1.3,  # Lunch time
    13: 1.1,  # Afternoon
    14: 1.0,  # Off-peak
    15: 1.0,  # Off-peak
    16: 1.2,  # Afternoon
    17: 2.0,  # Evening rush start
    18: 2.6,  # Peak evening rush
    19: 2.3,  # Evening rush end
    20: 1.5,  # Evening
    21: 1.2,  # Evening
    22: 0.8,  # Late evening
    23: 0.4   # Late night
}

def generate_station_id(station_name: str) -> str:
    """Generate station ID consistent with transport service's seedStations.js createStationId"""
    import re
    import unicodedata

    # Lowercase and decompose Vietnamese characters
    text = station_name.lower()
    text = unicodedata.normalize('NFD', text)

    # Remove diacritics
    text = ''.join(ch for ch in text if unicodedata.category(ch) != 'Mn')

    # Replace đ/Đ with d
    text = text.replace('đ', 'd').replace('Đ'.lower(), 'd')

    # Remove special characters except spaces (keep a-z, 0-9 and space)
    text = re.sub(r'[^a-z0-9\s]', '', text)

    # Replace spaces with hyphens
    text = re.sub(r'\s+', '-', text)

    # Collapse multiple hyphens
    text = re.sub(r'-+', '-', text)

    # Trim leading/trailing hyphens
    text = text.strip('-')

    return text

def get_base_usage_for_station(station_name: str) -> int:
    """Get base usage multiplier for station based on importance"""
    return MAJOR_STATIONS.get(station_name, 1.0)

def calculate_hourly_usage(hour: int, station_name: str, route_id: str) -> int:
    """Calculate realistic hourly usage based on time and station"""
    base_usage = get_base_usage_for_station(station_name)
    peak_multiplier = PEAK_HOURS.get(hour, 1.0)
    
    # Route-specific adjustments
    route_multiplier = 1.0
    if 'so-1' in route_id:  # Main line
        route_multiplier = 1.3
    elif 'so-2' in route_id:  # Longest line
        route_multiplier = 1.2
    elif 'so-6' in route_id:  # Shortest line
        route_multiplier = 0.8
    
    # Random variation (±20%)
    variation = random.uniform(0.8, 1.2)
    
    # Base passengers per hour (reduced for faster seeding)
    base_passengers = 5  # Reduced from 50 to 5
    
    return int(base_passengers * base_usage * peak_multiplier * route_multiplier * variation)

def generate_event_logs(start_date: datetime, days: int = 7) -> List[Dict[str, Any]]:
    """Generate universal event logs for all system events"""
    events = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        for route in ROUTES_DATA:
            for station_name in route['stations']:
                station_id = generate_station_id(station_name)
                
                for hour in range(5, 24):  # 5h to 23h
                    usage_count = calculate_hourly_usage(hour, station_name, route['routeId'])
                    
                    # Generate individual ticket usage events
                    for _ in range(usage_count):
                        # Random minute within the hour
                        minute = random.randint(0, 59)
                        event_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        
                        # Generate random passenger and ticket IDs
                        passenger_id = f"passenger_{uuid.uuid4().hex[:8]}"
                        ticket_id = f"ticket_{uuid.uuid4().hex[:8]}"
                        usage_type = 'entry' if random.random() > 0.3 else 'exit'
                        
                        event_data = {
                            'id': str(uuid.uuid4()),
                            'event_type': 'ticket.used',
                            'event_category': 'ticket',
                            'entity_id': ticket_id,
                            'entity_type': 'ticket',
                            'event_data': {
                                'ticketId': ticket_id,
                                'passengerId': passenger_id,
                                'usageData': {
                                    'stationId': station_id,
                                    'stationName': station_name,
                                    'routeId': route['routeId'],
                                    'routeName': route['name'],
                                    'usageType': usage_type
                                },
                                'usedAt': event_time.isoformat()
                            },
                            'processed_data': {
                                'passenger_id': passenger_id,
                                'station_id': station_id,
                                'station_name': station_name,
                                'route_id': route['routeId'],
                                'route_name': route['name'],
                                'usage_type': usage_type
                            },
                            'event_timestamp': event_time,
                            'source_service': 'ticket-service',
                            'correlation_id': f"corr_{uuid.uuid4().hex[:12]}"
                        }
                        events.append(event_data)
    
    return events

def generate_ticket_event_views(start_date: datetime, days: int = 7) -> List[Dict[str, Any]]:
    """Generate optimized ticket event views for analytics"""
    views = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        for route in ROUTES_DATA:
            for station_name in route['stations']:
                station_id = generate_station_id(station_name)
                
                for hour in range(5, 24):
                    usage_count = calculate_hourly_usage(hour, station_name, route['routeId'])
                    
                    for _ in range(usage_count):
                        minute = random.randint(0, 59)
                        event_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        
                        passenger_id = f"passenger_{uuid.uuid4().hex[:8]}"
                        ticket_id = f"ticket_{uuid.uuid4().hex[:8]}"
                        usage_type = 'entry' if random.random() > 0.3 else 'exit'
                        
                        view_data = {
                            'id': str(uuid.uuid4()),
                            'ticket_id': ticket_id,
                            'passenger_id': passenger_id,
                            'event_type': 'used',
                            'event_timestamp': event_time,
                            'station_id': station_id,
                            'station_name': station_name,
                            'route_id': route['routeId'],
                            'route_name': route['name'],
                            'usage_type': usage_type,
                            'date_partition': event_time.strftime('%Y-%m-%d'),
                            'hour_partition': hour
                        }
                        views.append(view_data)
    
    return views

def generate_metric_snapshots(start_date: datetime, days: int = 7) -> List[Dict[str, Any]]:
    """Generate time-series metric snapshots"""
    snapshots = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        # Hourly snapshots for each station
        for route in ROUTES_DATA:
            for station_name in route['stations']:
                station_id = generate_station_id(station_name)
                
                for hour in range(5, 24):
                    hour_time = current_date.replace(hour=hour, minute=0, second=0, microsecond=0)
                    usage_count = calculate_hourly_usage(hour, station_name, route['routeId'])
                    
                    # Usage count metric
                    usage_snapshot = {
                        'id': str(uuid.uuid4()),
                        'metric_name': 'hourly_station_usage',
                        'metric_category': 'usage',
                        'metric_value': float(usage_count),
                        'metric_unit': 'count',
                        'dimensions': {
                            'station_id': station_id,
                            'station_name': station_name,
                            'route_id': route['routeId'],
                            'route_name': route['name'],
                            'hour': hour
                        },
                        'timestamp': hour_time,
                        'period_type': 'hourly',
                        'aggregation_type': 'sum',
                        'sample_count': usage_count
                    }
                    snapshots.append(usage_snapshot)
        
        # Daily aggregate metrics
        daily_total = sum(calculate_hourly_usage(h, s, r['routeId']) 
                         for r in ROUTES_DATA 
                         for s in r['stations'] 
                         for h in range(5, 24))
        
        daily_snapshot = {
            'id': str(uuid.uuid4()),
            'metric_name': 'daily_total_usage',
            'metric_category': 'usage',
            'metric_value': float(daily_total),
            'metric_unit': 'count',
            'dimensions': {
                'date': current_date.strftime('%Y-%m-%d')
            },
            'timestamp': current_date.replace(hour=23, minute=59, second=0),
            'period_type': 'daily',
            'aggregation_type': 'sum',
            'sample_count': daily_total
        }
        snapshots.append(daily_snapshot)
    
    return snapshots

def generate_additional_metrics(start_date: datetime, days: int = 7) -> List[Dict[str, Any]]:
    """Generate additional metrics for comprehensive reporting"""
    metrics = []
    
    for day in range(days):
        current_date = start_date + timedelta(days=day)
        
        # Daily summary metrics
        daily_metrics = [
            {
                'id': str(uuid.uuid4()),
                'metric_name': 'daily_total_passengers',
                'metric_value': random.randint(45000, 65000),
                'metric_unit': 'count',
                'report_id': None,
                'timestamp': current_date.replace(hour=23, minute=59, second=0),
                'metadata_json': {
                    'date': current_date.date().isoformat(),
                    'total_routes': len(ROUTES_DATA),
                    'total_stations': sum(len(route['stations']) for route in ROUTES_DATA)
                }
            },
            {
                'id': str(uuid.uuid4()),
                'metric_name': 'daily_revenue',
                'metric_value': random.uniform(850000000, 1200000000),  # VND
                'metric_unit': 'currency',
                'report_id': None,
                'timestamp': current_date.replace(hour=23, minute=59, second=0),
                'metadata_json': {
                    'date': current_date.date().isoformat(),
                    'currency': 'VND',
                    'average_fare': random.uniform(8000, 15000)
                }
            },
            {
                'id': str(uuid.uuid4()),
                'metric_name': 'peak_hour_passengers',
                'metric_value': random.randint(8000, 12000),
                'metric_unit': 'count',
                'report_id': None,
                'timestamp': current_date.replace(hour=18, minute=0, second=0),
                'metadata_json': {
                    'date': current_date.date().isoformat(),
                    'peak_hour': '18:00',
                    'busiest_station': 'Bến Thành'
                }
            }
        ]
        metrics.extend(daily_metrics)
    
    return metrics

def create_sample_reports() -> List[Dict[str, Any]]:
    """Create sample reports for demonstration"""
    reports = []
    
    # Daily report
    daily_report = {
        'id': str(uuid.uuid4()),
        'title': 'Báo cáo hàng ngày - Metro HCM',
        'description': 'Báo cáo tổng hợp hoạt động Metro HCM hàng ngày',
        'report_type': 'daily',
        'status': 'completed',
        'file_path': '/reports/daily_2024_01_15.html',
        'report_metadata': {
            'generated_at': datetime.now().isoformat(),
            'period': '2024-01-15',
            'total_passengers': 52000,
            'total_revenue': 950000000,
            'peak_hour': '18:00'
        },
        'created_at': datetime.now(),
        'updated_at': datetime.now(),
        'completed_at': datetime.now()
    }
    reports.append(daily_report)
    
    # Weekly report
    weekly_report = {
        'id': str(uuid.uuid4()),
        'title': 'Báo cáo tuần - Metro HCM',
        'description': 'Báo cáo tổng hợp hoạt động Metro HCM tuần từ 15/01/2024 - 21/01/2024',
        'report_type': 'weekly',
        'status': 'completed',
        'file_path': '/reports/weekly_2024_week_03.html',
        'report_metadata': {
            'generated_at': datetime.now().isoformat(),
            'period': '2024-W03',
            'total_passengers': 365000,
            'total_revenue': 6650000000,
            'average_daily': 52000
        },
        'created_at': datetime.now(),
        'updated_at': datetime.now(),
        'completed_at': datetime.now()
    }
    reports.append(weekly_report)
    
    return reports

def create_report_templates() -> List[Dict[str, Any]]:
    """Create report templates for different report types"""
    templates = []
    
    templates_data = [
        {
            'id': str(uuid.uuid4()),
            'name': 'Daily Operations Report',
            'description': 'Template for daily Metro operations report',
            'template_type': 'daily',
            'config': {
                'sections': [
                    {'type': 'summary', 'title': 'Tổng quan'},
                    {'type': 'passenger_metrics', 'title': 'Số liệu hành khách'},
                    {'type': 'revenue_metrics', 'title': 'Doanh thu'},
                    {'type': 'station_analysis', 'title': 'Phân tích ga'},
                    {'type': 'route_analysis', 'title': 'Phân tích tuyến'}
                ],
                'charts': ['passenger_flow', 'revenue_trend', 'station_heatmap'],
                'format': 'html'
            },
            'is_active': 1
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Weekly Performance Report',
            'description': 'Template for weekly Metro performance analysis',
            'template_type': 'weekly',
            'config': {
                'sections': [
                    {'type': 'weekly_summary', 'title': 'Tổng quan tuần'},
                    {'type': 'daily_breakdown', 'title': 'Chi tiết theo ngày'},
                    {'type': 'trend_analysis', 'title': 'Phân tích xu hướng'},
                    {'type': 'comparison', 'title': 'So sánh với tuần trước'}
                ],
                'charts': ['weekly_trend', 'daily_comparison', 'performance_metrics'],
                'format': 'pdf'
            },
            'is_active': 1
        },
        {
            'id': str(uuid.uuid4()),
            'name': 'Monthly Analytics Report',
            'description': 'Template for monthly Metro analytics and insights',
            'template_type': 'monthly',
            'config': {
                'sections': [
                    {'type': 'executive_summary', 'title': 'Tóm tắt điều hành'},
                    {'type': 'key_metrics', 'title': 'Chỉ số chính'},
                    {'type': 'detailed_analysis', 'title': 'Phân tích chi tiết'},
                    {'type': 'recommendations', 'title': 'Khuyến nghị'}
                ],
                'charts': ['monthly_trends', 'performance_dashboard', 'forecast'],
                'format': 'pdf'
            },
            'is_active': 1
        }
    ]
    
    for template_data in templates_data:
        template_data.update({
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        })
        templates.append(template_data)
    
    return templates

def seed_report_data():
    """Main function to seed all report data (synchronous for thread execution)"""
    try:
        logger.info("Starting report service seed data generation...")
        
        db = SessionLocal()
        
        # Clear existing data
        logger.info("Clearing existing report data...")
        try:
            db.query(TicketEventView).delete()
            db.query(MetricSnapshot).delete()
            db.query(EventLog).delete()
            db.query(ReportItem).delete()
            db.query(Report).delete()
            db.query(ReportTemplate).delete()
            db.query(ReportSchedule).delete()
            db.commit()
            logger.info("Existing data cleared successfully")
        except Exception as e:
            logger.warning(f"Error clearing data (may be first run): {e}")
            db.rollback()
        
        # Generate date range (last 7 days)
        end_date = datetime.now().replace(hour=23, minute=59, second=0, microsecond=0)
        start_date = end_date - timedelta(days=6)
        
        # Generate structured event logs (reduced for performance)
        logger.info("Generating event logs...")
        event_logs = generate_event_logs(start_date, days=2)  # Reduced from 7 to 2 days
        logger.info(f"Generated {len(event_logs)} event logs")
        
        # Generate ticket event views
        logger.info("Generating ticket event views...")
        ticket_views = generate_ticket_event_views(start_date, days=2)  # Reduced from 7 to 2 days
        logger.info(f"Generated {len(ticket_views)} ticket event views")
        
        # Generate metric snapshots
        logger.info("Generating metric snapshots...")
        metric_snapshots = generate_metric_snapshots(start_date, days=2)  # Reduced from 7 to 2 days
        logger.info(f"Generated {len(metric_snapshots)} metric snapshots")
        
        # Create report templates
        logger.info("Creating report templates...")
        templates = create_report_templates()
        for template_data in templates:
            template = ReportTemplate(**template_data)
            db.add(template)
        db.commit()
        logger.info(f"Created {len(templates)} report templates")
        
        # Create sample reports
        logger.info("Creating sample reports...")
        reports = create_sample_reports()
        for report_data in reports:
            report = Report(**report_data)
            db.add(report)
        db.commit()
        logger.info(f"Created {len(reports)} sample reports")
        
        # Insert event logs in batches
        logger.info("Inserting event logs into database...")
        batch_size = 1000
        for i in range(0, len(event_logs), batch_size):
            batch = event_logs[i:i + batch_size]
            for event_data in batch:
                event = EventLog(**event_data)
                db.add(event)
            try:
                db.commit()
                logger.info(f"Inserted event batch {i//batch_size + 1}/{(len(event_logs) + batch_size - 1)//batch_size}")
            except Exception as e:
                logger.error(f"Error inserting event batch: {e}")
                db.rollback()
        
        # Insert ticket event views
        logger.info("Inserting ticket event views...")
        for i in range(0, len(ticket_views), batch_size):
            batch = ticket_views[i:i + batch_size]
            for view_data in batch:
                view = TicketEventView(**view_data)
                db.add(view)
            try:
                db.commit()
                logger.info(f"Inserted view batch {i//batch_size + 1}/{(len(ticket_views) + batch_size - 1)//batch_size}")
            except Exception as e:
                logger.error(f"Error inserting view batch: {e}")
                db.rollback()
        
        # Insert metric snapshots
        logger.info("Inserting metric snapshots...")
        for i in range(0, len(metric_snapshots), batch_size):
            batch = metric_snapshots[i:i + batch_size]
            for snapshot_data in batch:
                snapshot = MetricSnapshot(**snapshot_data)
                db.add(snapshot)
            try:
                db.commit()
                logger.info(f"Inserted snapshot batch {i//batch_size + 1}/{(len(metric_snapshots) + batch_size - 1)//batch_size}")
            except Exception as e:
                logger.error(f"Error inserting snapshot batch: {e}")
                db.rollback()
        
        # Create sample report items
        logger.info("Creating report items...")
        report_items = []
        for report in reports:
            items_data = [
                {
                    'id': str(uuid.uuid4()),
                    'report_id': report['id'],
                    'item_type': 'metric',
                    'title': 'Tổng số hành khách',
                    'content': {'value': 52000, 'unit': 'người', 'trend': '+5.2%'},
                    'order_index': 1
                },
                {
                    'id': str(uuid.uuid4()),
                    'report_id': report['id'],
                    'item_type': 'chart',
                    'title': 'Biểu đồ lưu lượng theo giờ',
                    'content': {'type': 'line', 'data': 'passenger_flow_data'},
                    'order_index': 2
                },
                {
                    'id': str(uuid.uuid4()),
                    'report_id': report['id'],
                    'item_type': 'table',
                    'title': 'Top 10 ga đông nhất',
                    'content': {'headers': ['Ga', 'Số lượt'], 'data': 'top_stations_data'},
                    'order_index': 3
                }
            ]
            report_items.extend(items_data)
        
        for item_data in report_items:
            item = ReportItem(**item_data)
            db.add(item)
        db.commit()
        logger.info(f"Created {len(report_items)} report items")
        
        db.close()
        
        logger.info("✅ Report service seed data generation completed successfully!")
        logger.info(f"📊 Generated data summary:")
        logger.info(f"   - Event logs: {len(event_logs)}")
        logger.info(f"   - Ticket event views: {len(ticket_views)}")
        logger.info(f"   - Metric snapshots: {len(metric_snapshots)}")
        logger.info(f"   - Report templates: {len(templates)}")
        logger.info(f"   - Sample reports: {len(reports)}")
        logger.info(f"   - Report items: {len(report_items)}")
        
        return {
            'event_logs': len(event_logs),
            'ticket_views': len(ticket_views),
            'metric_snapshots': len(metric_snapshots),
            'templates': len(templates),
            'reports': len(reports),
            'report_items': len(report_items)
        }
        
    except Exception as error:
        logger.error(f"❌ Error generating report seed data: {error}")
        raise error

if __name__ == "__main__":
    seed_report_data()
