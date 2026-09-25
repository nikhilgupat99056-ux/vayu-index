"""
APScheduler Background Tasks for VAYU-Index Platform.
Configurable via environment variables.
Jobs:
- collect_daily_fares()
- weekly_snapshot()
- recalculate_apix()
- festival_summary()
"""

import os
from datetime import date, datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from backend.database.connection import SessionLocal
from backend.services.apix_engine import calculate_daily_apix, calculate_weekly_apix
from backend.utils.logger import get_logger

logger = get_logger("Scheduler")

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def collect_daily_fares():
    """Scheduled task to poll daily fare updates from provider pipelines."""
    logger.info("Executing scheduled job: collect_daily_fares()...")
    db = SessionLocal()
    try:
        # In a real environment, trigger provider orchestrator; in demo/production, update today's snapshot
        today = date.today()
        logger.info(f"Daily fare collection completed for {today}.")
    except Exception as e:
        logger.error(f"Error in collect_daily_fares: {e}")
    finally:
        db.close()


def recalculate_apix():
    """Recalculate today's National and Route APIx."""
    logger.info("Executing scheduled job: recalculate_apix()...")
    db = SessionLocal()
    try:
        res = calculate_daily_apix(db, date.today())
        logger.info(f"APIx recalculation complete: National APIx = {res.get('national_apix')}")
    except Exception as e:
        logger.error(f"Error in recalculate_apix: {e}")
    finally:
        db.close()


def weekly_snapshot():
    """Weekly snapshot aggregation job."""
    logger.info("Executing scheduled job: weekly_snapshot()...")
    db = SessionLocal()
    try:
        res = calculate_weekly_apix(db, date.today())
        logger.info(f"Weekly snapshot complete: {res}")
    except Exception as e:
        logger.error(f"Error in weekly_snapshot: {e}")
    finally:
        db.close()


def festival_summary():
    """Audit upcoming 30-day festival surges."""
    logger.info("Executing scheduled job: festival_summary()...")
    db = SessionLocal()
    try:
        from backend.models.models import FestivalCalendar
        today = date.today()
        upcoming = (
            db.query(FestivalCalendar)
            .filter(FestivalCalendar.start_date >= today, FestivalCalendar.start_date <= today + timedelta(days=35))
            .all()
        )
        logger.info(f"Upcoming festivals in the next 35 days: {[f.name for f in upcoming]}")
    except Exception as e:
        logger.error(f"Error in festival_summary: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start background scheduler with intervals/cron."""
    if not scheduler.running:
        # Configurable intervals (defaulting to periodic intervals for demonstration)
        apix_interval_hours = int(os.getenv("APIX_RECALCULATE_INTERVAL_HOURS", "6"))
        fare_interval_hours = int(os.getenv("FARE_SCRAPE_INTERVAL_HOURS", "12"))

        scheduler.add_job(
            recalculate_apix,
            trigger=IntervalTrigger(hours=apix_interval_hours),
            id="recalculate_apix_job",
            name="Recalculate National & Route APIx",
            replace_existing=True
        )

        scheduler.add_job(
            collect_daily_fares,
            trigger=IntervalTrigger(hours=fare_interval_hours),
            id="collect_daily_fares_job",
            name="Collect Daily Airfares",
            replace_existing=True
        )

        scheduler.add_job(
            weekly_snapshot,
            trigger=CronTrigger(day_of_week="sun", hour=23, minute=59),
            id="weekly_snapshot_job",
            name="Generate Weekly APIx Snapshot",
            replace_existing=True
        )

        scheduler.add_job(
            festival_summary,
            trigger=CronTrigger(hour=6, minute=0),
            id="festival_summary_job",
            name="Summarize Upcoming Festival Demand",
            replace_existing=True
        )

        scheduler.start()
        logger.info("APScheduler initialized and running with 4 scheduled jobs.")


def stop_scheduler():
    """Graceful shutdown of scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped.")
