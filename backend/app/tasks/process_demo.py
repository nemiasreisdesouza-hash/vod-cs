"""Celery tasks: demo/VOD processing, heatmap and report generation."""
import logging
import os

from app.database import SessionLocal
from app.models.match import Match
from app.services import analysis_service
from app.tasks.celery_app import celery_app

log = logging.getLogger(__name__)


@celery_app.task(name="process_demo", bind=True)
def process_demo(self, match_id: int, local_path: str) -> dict:
    db = SessionLocal()
    try:
        analysis_service.run_full_analysis(db, match_id, local_path)
        return {"match_id": match_id, "status": "completed"}
    finally:
        db.close()
        try:
            if os.path.exists(local_path) and "/tmp/vod_uploads" in local_path:
                pass  # keep original for re-processing; storage has the copy
        except OSError:
            pass


@celery_app.task(name="process_vod")
def process_vod(match_id: int, local_path: str) -> dict:
    db = SessionLocal()
    try:
        analysis_service.run_full_analysis(db, match_id, local_path)
        return {"match_id": match_id, "status": "completed"}
    finally:
        db.close()


@celery_app.task(name="generate_heatmap")
def generate_heatmap(match_id: int, heatmap_type: str = "kills") -> dict:
    from app.core import heatmap_generator
    from app.models.tactical_mistake import Heatmap

    db = SessionLocal()
    try:
        match = db.get(Match, match_id)
        points = heatmap_generator.generate(db, match_id, heatmap_type, map_name=match.map_name if match else "mirage")
        db.add(Heatmap(match_id=match_id, map_name=match.map_name if match else "mirage",
                       heatmap_type=heatmap_type, points=points))
        db.commit()
        return {"match_id": match_id, "points": len(points)}
    finally:
        db.close()


@celery_app.task(name="generate_report")
def generate_report(match_id: int) -> dict:
    return {"match_id": match_id, "status": "ok"}
