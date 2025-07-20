import os
import time
import threading
from uuid import uuid4

from flask import Flask, request, render_template
from flask_mail import Mail, Message
from flask_apscheduler import APScheduler
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
scheduler = APScheduler()

# Flask-Mail config
app.config['MAIL_SERVER'] = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('EMAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.getenv('EMAIL_SECURE', 'False') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('EMAIL_USER', 'metrosystem365@gmail.com')
app.config['MAIL_PASSWORD'] = os.getenv('EMAIL_PASS', 'djbmwwzmglbsqjgp')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('EMAIL_FROM', 'metrosystem365@gmail.com')

mail = Mail(app)
ADMIN_EMAIL = os.getenv('MAIL_DEFAULT_SENDER', 'metrosystem365@gmail.com')
HOST_URL = os.getenv("HOST_URL", "http://localhost:3007")

# Global alert state and confirmation map
state = {}
confirm_map = {}
state_lock = threading.Lock()  # Thread-safe access

def send_email_alert(job, instance, summary, link):
    msg = Message(
        subject=f"[ALERT] {job} is DOWN",
        recipients=[ADMIN_EMAIL]
    )
    msg.html = render_template("service_instance_down.html", job=job, instance=instance, summary=summary, link=link)
    mail.send(msg)

@app.route('/')
def index():
    return "✅ Confirm Service Running"

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

        confirm_link = f"{HOST_URL}/confirm/{fid}"
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
    return "❌ Invalid or expired link", 404

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
                confirm_link = f"{HOST_URL}/confirm/{fid}"
                with app.app_context():
                    send_email_alert(job, instance, "Service is still down", confirm_link)
            elif data['confirmed'] or now - data['timestamp'] > 900:
                print(f"[CLEANUP] Cleaning up {key}. Confirmed: {data['confirmed']} | Age: {now - data['timestamp']:.1f}s")
                del state[key]

# Start the scheduler
scheduler.init_app(app)
scheduler.start()
scheduler.add_job(id='cleanup_job', func=cleanup, trigger='interval', seconds=30)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3007, debug=False)
