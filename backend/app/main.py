"""FastAPI application entrypoint."""
import asyncio
import logging

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api import annotations, auth, dashboard, heatmaps, matches, players, subscriptions, teams
from app.config import settings
from app.database import SessionLocal, get_db, init_db

log = logging.getLogger(__name__)

app = FastAPI(title="VOD Analyst Pro API", version="1.0.0",
              description="Análise de VODs e demos de CS2 e CrossFire")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list + ["*"] if settings.environment == "development" else settings.cors_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth.router, teams.router, matches.router, players.router, annotations.router,
               heatmaps.router, dashboard.router, subscriptions.router):
    app.include_router(router)


@app.on_event("startup")
def startup() -> None:
    init_db()
    if settings.seed_demo_data:
        try:
            from app.seed import run as seed_run

            seed_run()
        except Exception as exc:  # noqa: BLE001
            log.warning("Seed skipped: %s", exc)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}


@app.websocket("/ws/matches/{match_id}")
async def match_progress(ws: WebSocket, match_id: int):
    """Push processing progress; the frontend falls back to polling /status."""
    from app.models.match import Match

    await ws.accept()
    try:
        while True:
            db = SessionLocal()
            try:
                m = db.get(Match, match_id)
                if not m:
                    await ws.send_json({"status": "not_found"})
                    break
                await ws.send_json({"status": m.status, "progress": m.progress, "error": m.error})
                if m.status in ("completed", "failed"):
                    break
            finally:
                db.close()
            await asyncio.sleep(1.5)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await ws.close()
        except Exception:  # noqa: BLE001, S110
            pass
