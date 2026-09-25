"""
VAYU-Index Backend Application Server (FastAPI).
Real-Time Airfare Intelligence Platform for India.
"""

from contextlib import asynccontextmanager
from datetime import datetime
import time
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.database.connection import engine, Base, SessionLocal
from backend.models.models import Airport, Airline, Route, Fare, APIx
from backend.services.seed_data import seed_database
from backend.services.scheduler import start_scheduler, stop_scheduler, scheduler
from backend.api.routes import router as api_router
from backend.utils.logger import get_logger

logger = get_logger("VAYU-Core")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Initializing VAYU-Index Platform...")
    
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas verified.")

    # 2. Seed database
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
    finally:
        db.close()

    # 3. Start background scheduler
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Error starting APScheduler: {e}")

    logger.info("VAYU-Index Backend ready to serve requests.")
    yield

    # Shutdown
    logger.info("Shutting down VAYU-Index Platform...")
    stop_scheduler()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="VAYU-Index API",
    description="India's Real-Time Airfare Intelligence Platform — Bloomberg × FlightRadar24 × Apple styled aviation analytics engine.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration — Explicitly permit frontend development servers
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Error Handling & Performance Logging Middleware
@app.middleware("http")
async def log_and_handle_errors(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000.0
        response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
        if request.url.path not in ["/health", "/api/health"]:
            logger.info(f"{request.method} {request.url.path} -> {response.status_code} ({process_time:.1f}ms)")
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000.0
        logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "timestamp": datetime.now().isoformat(),
                "duration_ms": round(process_time, 2)
            }
        )


# Root endpoint
@app.get("/", tags=["Root"])
def root_info():
    """Root platform info."""
    return {
        "service": "VAYU-Index API",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health",
        "configured_api_prefix": "/api"
    }


# Health Monitoring Endpoints (registered at both /health and /api/health)
@app.api_route("/health", methods=["GET", "HEAD"], tags=["Monitoring"])
@app.api_route("/api/health", methods=["GET", "HEAD"], tags=["Monitoring"])
def health_check():
    """
    Standardized System Health Check Endpoint.
    Returns:
    {
      "status": "healthy",
      "database": "connected",
      "api": "online"
    }
    """
    db_connected = False
    try:
        db = SessionLocal()
        db.query(Airport).count()
        db.close()
        db_connected = True
    except Exception as e:
        logger.error(f"Database health check probe failed: {e}")

    return {
        "status": "healthy" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected",
        "api": "online",
        # Backward compatibility fields
        "database_connected": db_connected,
        "api_healthy": True,
        "scheduler_running": scheduler.running if scheduler else False,
        "providers_ready": True,
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


# Include VAYU-Index API endpoints
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
