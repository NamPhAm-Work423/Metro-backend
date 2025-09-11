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

    # One-time initialization seed (like seeding) on first start
    if settings.init_seed_on_start:
        try:
            # Prevent duplicate runs within the same date across restarts
            marker_dir = '/tmp'
            os.makedirs(marker_dir, exist_ok=True)
            stub = _make_internal_stub()
            today = datetime.now()
            for d in range(settings.init_seed_days):
                day = today + timedelta(days=d)
                target = day.strftime('%Y-%m-%d')
                marker = os.path.join(marker_dir, f'control-init-seed-{target}.done')
                if os.path.exists(marker):
                    continue
                dow = day.strftime('%A')
                print(f"InitSeed: generating schedules for {target} ({dow})")
                stub.GenerateDailySchedules(control_pb2.GenerateDailyRequest(date=target, dayOfWeek=dow))
                # mark as done to avoid duplicates if process restarts
                try:
                    with open(marker, 'w', encoding='utf-8') as _f:
                        _f.write('ok')
                except Exception:
                    pass
        except Exception as e:
            print(f"InitSeed: failed to generate initial schedules: {e}")

    # Simple daily cron (server-side) at 03:00 local time
    def daily_job():
        stub = _make_internal_stub()
        while True:
            now = datetime.now()
            run_time = now.replace(hour=3, minute=0, second=0, microsecond=0)
            if run_time <= now:
                run_time = run_time.replace(day=now.day+1)
            wait_seconds = (run_time - now).total_seconds()
            try:
                threading.Event().wait(wait_seconds)
                # Derive date/dayOfWeek
                target = datetime.now().strftime('%Y-%m-%d')
                dow = datetime.now().strftime('%A')
                stub.GenerateDailySchedules(control_pb2.GenerateDailyRequest(date=target, dayOfWeek=dow))
            except Exception:
                pass

    threading.Thread(target=daily_job, daemon=True).start()

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


