import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    KAFKA_BROKERS_INTERNAL = os.getenv("KAFKA_BROKERS_INTERNAL")
    KAFKA_BROKERS_EXTERNAL = os.getenv("KAFKA_BROKERS_EXTERNAL")
    
    # SMTP Configuration
    SMTP_SERVER = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("EMAIL_PORT", "587"))
    SMTP_EMAIL = os.getenv("EMAIL_USER", "metrosystem365@gmail.com")
    SMTP_PASSWORD = os.getenv("EMAIL_PASS", "djbmwwzmglbsqjgp")
    EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Metro System")
    EMAIL_FROM = os.getenv("EMAIL_FROM", "metrosystem365@gmail.com")
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "metrosystem365@gmail.com")
    
    # Service Configuration
    HEALTH_CHECK_INTERVAL = int(os.getenv("HEALTH_CHECK_INTERVAL", "30"))
    SERVICE_TIMEOUT = int(os.getenv("SERVICE_TIMEOUT", "10"))