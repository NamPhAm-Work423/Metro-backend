from concurrent import futures
import grpc
from dotenv import load_dotenv
from datetime import datetime, timedelta
import threading
import http.server
import socketserver
import os

from ai_scheduler.config.settings import settings
from ai_scheduler.grpc.servicer import ControlGrpcService
from ai_scheduler.proto import control_pb2, control_pb2_grpc


def _make_internal_stub() -> control_pb2_grpc.ControlServiceStub:
    target_host = '127.0.0.1' if settings.control_grpc_host in ('0.0.0.0', '::') else settings.control_grpc_host
    channel = grpc.insecure_channel(f"{target_host}:{settings.control_grpc_port}")
    try:
        grpc.channel_ready_future(channel).result(timeout=5)
    except Exception:
        pass
    return control_pb2_grpc.ControlServiceStub(channel)


def main() -> None:
    load_dotenv()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    control_pb2_grpc.add_ControlServiceServicer_to_server(ControlGrpcService(), server)
    server.add_insecure_port(f'{settings.control_grpc_host}:{settings.control_grpc_port}')
    server.start()
    print(f'Control gRPC server running on {settings.control_grpc_host}:{settings.control_grpc_port}')

    # One-time yearly initialization using MTA Prophet model
    if settings.init_seed_on_start:
        try:
            # Prevent duplicate runs for the same year
            marker_dir = '/tmp'
            os.makedirs(marker_dir, exist_ok=True)
            stub = _make_internal_stub()
            current_year = datetime.now().year
            
            # Check if yearly schedule already generated for current year
            yearly_marker = os.path.join(marker_dir, f'control-yearly-seed-{current_year}.done')
            if not os.path.exists(yearly_marker):
                print(f"🚀 InitSeed: Generating yearly schedules for {current_year} using MTA Prophet model...")
                
                # Import and use yearly planning service directly
                from ai_scheduler.services.yearly_planning_service import YearlyPlanningService
                from ai_scheduler.grpc.servicer import _make_transport_channel
                from ai_scheduler.proto import transport_pb2_grpc
                
                # Create transport connection and yearly planner
                transport_channel = _make_transport_channel()
                transport_stub = transport_pb2_grpc.TransportServiceStub(transport_channel)
                yearly_planner = YearlyPlanningService(transport_stub)
                
                # Generate yearly schedule (this will take some time but generates everything at once)
                total_trips = yearly_planner.generate_yearly_schedule_simple(current_year)
                
                print(f"✅ InitSeed: Generated {total_trips} trips for year {current_year}")
                
                # Mark as done
                try:
                    with open(yearly_marker, 'w', encoding='utf-8') as _f:
                        _f.write(f'Generated {total_trips} trips for {current_year}')
                except Exception:
                    pass
                    
                # Close transport connection
                transport_channel.close()
            else:
                print(f"✅ Yearly schedule for {current_year} already exists, skipping generation")
                
        except Exception as e:
            print(f"❌ InitSeed: Failed to generate yearly schedules: {e}")
            print("   Falling back to daily schedule generation...")
            # Fallback to original daily generation
            try:
                stub = _make_internal_stub()
                today = datetime.now()
                for d in range(settings.init_seed_days):
                    day = today + timedelta(days=d)
                    target = day.strftime('%Y-%m-%d')
                    dow = day.strftime('%A')
                    print(f"Fallback: generating daily schedule for {target} ({dow})")
                    stub.GenerateDailySchedules(control_pb2.GenerateDailyRequest(date=target, dayOfWeek=dow))
            except Exception as fallback_e:
                print(f"❌ Fallback also failed: {fallback_e}")

    # Yearly schedule maintenance job - runs on January 1st at 03:00
    def yearly_maintenance_job():
        stub = _make_internal_stub()
        while True:
            now = datetime.now()
            
            # Calculate next January 1st at 03:00
            next_year = now.year + 1
            next_run = datetime(next_year, 1, 1, 3, 0, 0)  # January 1st, 3:00 AM
            
            # If we're already past January 1st this year, wait until next year
            if now.month == 1 and now.day == 1 and now.hour < 3:
                # It's January 1st but before 3 AM, run today
                next_run = now.replace(hour=3, minute=0, second=0, microsecond=0)
            
            wait_seconds = (next_run - now).total_seconds()
            print(f"📅 Next yearly schedule generation: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({wait_seconds/3600:.1f} hours)")
            
            try:
                threading.Event().wait(wait_seconds)
                
                # Generate yearly schedule for the new year
                target_year = datetime.now().year
                print(f"🗓️ Auto-generating yearly schedule for {target_year} using MTA Prophet model...")
                
                # Use yearly planning service directly
                from ai_scheduler.services.yearly_planning_service import YearlyPlanningService
                from ai_scheduler.grpc.servicer import _make_transport_channel
                from ai_scheduler.proto import transport_pb2_grpc
                
                transport_channel = _make_transport_channel()
                transport_stub = transport_pb2_grpc.TransportServiceStub(transport_channel)
                yearly_planner = YearlyPlanningService(transport_stub)
                
                total_trips = yearly_planner.generate_yearly_schedule_simple(target_year)
                
                print(f"✅ Auto-generated {total_trips} trips for year {target_year}")
                transport_channel.close()
                
            except Exception as e:
                print(f"❌ Yearly maintenance job failed: {e}")
                # Continue the loop to try again next year

    threading.Thread(target=yearly_maintenance_job, daemon=True).start()

    # Optional: Quarterly update job for schedule adjustments
    def quarterly_update_job():
        stub = _make_internal_stub()
        while True:
            now = datetime.now()
            
            # Find next quarter start (Jan 1, Apr 1, Jul 1, Oct 1)
            quarter_months = [1, 4, 7, 10]
            current_quarter_month = None
            
            for month in quarter_months:
                if now.month <= month:
                    current_quarter_month = month
                    break
            
            if current_quarter_month is None:
                # We're past October, next quarter is January next year
                next_quarter = datetime(now.year + 1, 1, 1, 2, 0, 0)
            else:
                next_quarter = datetime(now.year, current_quarter_month, 1, 2, 0, 0)
                if next_quarter <= now:
                    # Find next quarter
                    next_month_idx = quarter_months.index(current_quarter_month) + 1
                    if next_month_idx >= len(quarter_months):
                        next_quarter = datetime(now.year + 1, 1, 1, 2, 0, 0)
                    else:
                        next_quarter = datetime(now.year, quarter_months[next_month_idx], 1, 2, 0, 0)
            
            wait_seconds = (next_quarter - now).total_seconds()
            
            try:
                threading.Event().wait(wait_seconds)
                
                # Generate quarterly updates (lighter than full yearly)
                quarter = ((next_quarter.month - 1) // 3) + 1
                print(f"📊 Auto-updating Q{quarter} {next_quarter.year} schedules...")
                
                response = stub.GenerateQuarterlySchedules(control_pb2.GenerateQuarterlyRequest(
                    year=next_quarter.year,
                    quarter=quarter,
                    routeIds=[],
                    serviceStart="05:00:00",
                    serviceEnd="23:00:00"
                ))
                
                print(f"✅ Updated Q{quarter} with {response.trips} trips")
                
            except Exception as e:
                print(f"⚠️ Quarterly update job failed: {e}")

    # Enable quarterly updates (optional - can be disabled if not needed)
    threading.Thread(target=quarterly_update_job, daemon=True).start()

    # Minimal HTTP health server on PORT
    from prometheus_client import CollectorRegistry, generate_latest, CONTENT_TYPE_LATEST
    registry = CollectorRegistry()  # default registry is fine for now

    class HealthHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):  # type: ignore
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            elif self.path == '/metrics':
                try:
                    output = generate_latest()  # use default registry
                    self.send_response(200)
                    self.send_header('Content-Type', CONTENT_TYPE_LATEST)
                    self.end_headers()
                    self.wfile.write(output)
                except Exception:
                    self.send_response(500)
                    self.end_headers()
            else:
                self.send_response(404)
                self.end_headers()

    def start_http():
        http_port = int(settings.http_port)
        with socketserver.TCPServer(("0.0.0.0", http_port), HealthHandler) as httpd:
            print(f"HTTP health server on 0.0.0.0:{http_port}")
            httpd.serve_forever()

    threading.Thread(target=start_http, daemon=True).start()
    server.wait_for_termination()


