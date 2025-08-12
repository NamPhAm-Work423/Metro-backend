from concurrent import futures
import grpc
from dotenv import load_dotenv
from datetime import datetime
import threading
import http.server
import socketserver
import os

from ai_scheduler.config.settings import settings
from ai_scheduler.grpc.servicer import ControlGrpcService
from ai_scheduler.proto import control_pb2, control_pb2_grpc


def main() -> None:
    load_dotenv()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    control_pb2_grpc.add_ControlServiceServicer_to_server(ControlGrpcService(), server)
    server.add_insecure_port(f'{settings.control_grpc_host}:{settings.control_grpc_port}')
    server.start()
    print(f'Control gRPC server running on {settings.control_grpc_host}:{settings.control_grpc_port}')

    # Simple daily cron (server-side) at 03:00 local time
    def daily_job():
        stub = control_pb2_grpc.ControlServiceStub(grpc.insecure_channel(f"localhost:{settings.control_grpc_port}"))
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
    class HealthHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):  # type: ignore
            if self.path == '/health':
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
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


