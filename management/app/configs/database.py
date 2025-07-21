import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
class Database:
    def __init__(self, db_url, pool_size=5, max_overflow=10, pool_timeout=30, pool_recycle=3600):
        self.db_url = db_url
        self.engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=pool_timeout,
            pool_recycle=pool_recycle
        )
        self.Session = sessionmaker(bind=self.engine, autocommit= False)

    def create_session(self):
        return self.Session()

    def create_all(self):
        Base.metadata.create_all(self.engine)

DB_USERNAME = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DATABASE_URL = f"postgresql+psycopg2://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SKELETON_PROCESSOR_PATH = os.path.join("skeleton", "modules", "processor", "process.py")
ENV_PATH = os.path.join("skeleton", ".env")

db = Database(DATABASE_URL)

