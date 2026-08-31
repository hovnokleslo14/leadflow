from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "leadflow",
    broker=settings.redis_url if hasattr(settings, 'redis_url') else "redis://localhost:6379/0",
    backend=settings.redis_url if hasattr(settings, 'redis_url') else "redis://localhost:6379/0",
    include=[
        "app.services.scrapers",
        "app.services.notification_service",
    ],
)

# Configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Prague",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    beat_schedule={
        # Run scrapers every hour
        "run-scrapers-hourly": {
            "task": "app.services.scrapers.run_all_scrapers",
            "schedule": 3600.0,  # Every hour
        },
        # Check notifications every 5 minutes
        "check-notifications": {
            "task": "app.services.notification_service.check_and_create_notifications",
            "schedule": 300.0,  # Every 5 minutes
        },
        # Generate recurring payments daily at midnight
        "generate-recurring-payments": {
            "task": "app.services.notification_service.check_and_create_notifications",
            "schedule": 86400.0,  # Daily (handled by notification service)
        },
    },
)

# Auto-discover tasks
celery_app.autodiscover_tasks()


@celery_app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")