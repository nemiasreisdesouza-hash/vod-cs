"""Celery application (Redis broker)."""
from celery import Celery

from app.config import settings

celery_app = Celery("vod", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(task_track_started=True, task_time_limit=3600, worker_prefetch_multiplier=1)
celery_app.autodiscover_tasks(["app.tasks"])
