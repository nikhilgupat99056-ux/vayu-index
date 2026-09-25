"""
Database Connection and Session Management for VAYU-Index.
Supports PostgreSQL (production) with automatic fallback to SQLite (zero-config local dev).
"""

import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
from backend.utils.logger import get_logger

logger = get_logger("DBConnection")

# Search multiple locations for .env
env_locations = [
    Path.cwd() / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
]
for loc in env_locations:
    if loc.exists():
        load_dotenv(dotenv_path=loc)
        logger.info(f"Loaded environment variables from: {loc}")
        break

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vayu_index.db")

# If using PostgreSQL with 'postgres://', fix for SQLAlchemy 1.4+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = None

try:
    if DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database initialized successfully with SQLite engine.")
    else:
        # Production PostgreSQL pool settings
        engine = create_engine(
            DATABASE_URL,
            pool_size=15,
            max_overflow=25,
            pool_recycle=1800,
            pool_pre_ping=True
        )
        # Test PostgreSQL connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to PostgreSQL database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'Postgres'}")
except Exception as e:
    logger.warning(f"Could not connect using {DATABASE_URL} ({e}). Falling back to local SQLite: sqlite:///./vayu_index.db")
    DATABASE_URL = "sqlite:///./vayu_index.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Fallback SQLite database initialized successfully.")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency injection helper for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
