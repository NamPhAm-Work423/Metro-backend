import os
import time
import threading
from uuid import uuid4

from flask import Flask, request, render_template, Response
from datetime import datetime
from flask_mail import Mail, Message
import smtplib
from flask_apscheduler import APScheduler
from dotenv import load_dotenv
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from werkzeug.middleware.proxy_fix import ProxyFix
from urllib.parse import urljoin

load_dotenv()

app = Flask(__name__)
scheduler = APScheduler()
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

# Flask-Mail config
app.config['MAIL_SERVER'] = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('EMAIL_PORT', '587'))

# EMAIL_SECURE options: 'ssl', 'starttls'/'tls', 'false'
email_secure = os.getenv('EMAIL_SECURE', 'false').lower().strip()
app.config['MAIL_USE_SSL'] = email_secure == 'ssl'
app.config['MAIL_USE_TLS'] = email_secure in ('true', 'starttls', 'tls')

# Only set credentials if provided (avoid AUTH on servers that don't support it)
mail_username = os.getenv('EMAIL_USER', '').strip()
mail_password = os.getenv('EMAIL_PASS', '').strip()
app.config['MAIL_USERNAME'] = mail_username or None
app.config['MAIL_PASSWORD'] = mail_password or None

app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_FROM', 'metrosystem365@gmail.com')

mail = Mail(app)
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', os.getenv('EMAIL_FROM', 'metrosystem365@gmail.com'))

def build_base_url() -> str:
    """Build external base URL for links using proxy headers when available.
    Priority: HOST_URL env → X-Forwarded-* → request.host_url
    """
    host_url_env = os.getenv("HOST_URL")
    if host_url_env:
        return host_url_env.rstrip('/')

    # Prefer proxy-provided external scheme/host/prefix
    proto = request.headers.get('X-Forwarded-Proto') or request.scheme
    host = request.headers.get('X-Forwarded-Host') or request.host
    prefix = request.headers.get('X-Forwarded-Prefix', '')
    if prefix and not prefix.startswith('/'):
        prefix = '/' + prefix

    base = f"{proto}://{host}{prefix}"
    return base.rstrip('/')

# Global alert state and confirmation map
state = {}
confirm_map = {}
state_lock = threading.Lock()  # Thread-safe access

def send_email_alert(job, instance, summary, link):
    msg = Message(
        subject=f"[ALERT] {job} is DOWN",
        recipients=[ADMIN_EMAIL]
    )
    msg.html = render_template(
        "service_instance_down.html",
        job=job,
        instance=instance,
        summary=summary,
        link=link,
        time=datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
    )
    try:
        mail.send(msg)
    except smtplib.SMTPNotSupportedError:
        # Fallback: retry without AUTH if server doesn't support it
        app.config['MAIL_USERNAME'] = None
        app.config['MAIL_PASSWORD'] = None
        Mail(app).send(msg)

@app.route('/')
def index():
    return "✅ Confirm Service Running"

REQUEST_COUNT = Counter('healthcheck_request_total', 'Total number of requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('healthcheck_request_latency_seconds', 'Request latency in seconds', ['method', 'endpoint'])
ALERTS_ACTIVE = Gauge('healthcheck_active_alerts', 'Number of active (unconfirmed) alerts')


@app.before_request
def _start_timer():
    request._start_time = time.perf_counter()


@app.after_request
def _record_metrics(response):
    try:
        latency = max(0.0, time.perf_counter() - getattr(request, '_start_time', time.perf_counter()))
        endpoint = request.endpoint or 'unknown'
        REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(latency)
        REQUEST_COUNT.labels(method=request.method, endpoint=endpoint, status=str(response.status_code)).inc()
        with state_lock:
            ALERTS_ACTIVE.set(len(state))
    finally:
        return response


@app.route('/health')
def health():
    return {
        "status": "healthy",
        "service": "healthcheck-service",
        "timestamp": time.time()
    }

@app.route('/alert', methods=['POST'])
def receive_alert():
    data = request.json
    print("Received alert data:", data)
    for alert in data.get('alerts', []):
        job = alert['labels'].get('job')
        instance = alert['labels'].get('instance')
        status = alert.get('status')  # "firing" or "resolved"
        summary = alert['annotations'].get('summary', 'No summary')

        if not job or not instance:
            continue  # skip if missing required labels

        key = f"{job}@{instance}"

        with state_lock:
            if status == "resolved":
                # Remove alert from state if resolved
                if key in state:
                    del state[key]
                    print(f"[RESOLVED] Alert for {key} resolved and removed.")

                # Clean up confirm_map entries pointing to this key
                confirm_keys = [fid for fid, val in confirm_map.items() if val == key]
                for fid in confirm_keys:
                    del confirm_map[fid]
                continue  # Skip to next alert

            # Skip if already confirmed
            if key in state and state[key]['confirmed']:
                print(f"[SKIPPED] Alert {key} already confirmed.")
                continue

            # Update or create alert state
            state[key] = {
                "confirmed": False,
                "timestamp": time.time()
            }

            # Create unique confirmation link
            fid = uuid4().hex
            confirm_map[fid] = key

        base_url = build_base_url()
        confirm_link = f"{base_url}/confirm/{fid}"
        # print("DEBUG: ", confirm_link)
        with app.app_context():
            send_email_alert(job, instance, summary, confirm_link)

    return "OK"

@app.route('/confirm/<fid>')
def confirm(fid):
    with state_lock:
        key = confirm_map.get(fid)
        if key and key in state:
            state[key]['confirmed'] = True
            print(f"[CONFIRMED] Alert {key} confirmed via {fid}")
            return f"✅ Confirmed alert for {key}"
    return "Invalid or expired link", 404


@app.get('/metrics')
def metrics():
    data = generate_latest()
    return Response(response=data, content_type=CONTENT_TYPE_LATEST)

def cleanup():
    now = time.time()
    with state_lock:
        for key in list(state.keys()):
            data = state[key]
            if not data['confirmed'] and now - data['timestamp'] > 300:
                print(f"[RE-ALERT] {key} has not been confirmed after 5 minutes.")
                fid = uuid4().hex
                confirm_map[fid] = key
                state[key]['timestamp'] = now
                job, instance = key.split("@")
                base_url = build_base_url()
                confirm_link = f"{base_url}/confirm/{fid}"
                with app.app_context():
                    send_email_alert(job, instance, "Service is still down", confirm_link)
            elif data['confirmed'] or now - data['timestamp'] > 900:
                print(f"[CLEANUP] Cleaning up {key}. Confirmed: {data['confirmed']} | Age: {now - data['timestamp']:.1f}s")
                del state[key]

def _start_scheduler_once():
    if not getattr(app, "_scheduler_started", False):
        scheduler.init_app(app)
        scheduler.start()
        scheduler.add_job(id='cleanup_job', func=cleanup, trigger='interval', seconds=30)
        app._scheduler_started = True

_start_scheduler_once()

if __name__ == '__main__':
    port = int(os.getenv('PORT', '3000'))
    app.run(host='0.0.0.0', port=port, debug=False)
