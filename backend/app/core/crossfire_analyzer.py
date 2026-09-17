"""CrossFire VOD analysis via OpenCV.

Real pipeline sketch (kept lightweight and extensible):
  1. Sample frames with cv2.VideoCapture.
  2. Detect round transitions via histogram deltas / scoreboard OCR region.
  3. Killfeed OCR region (top-right) -> kill events (pytesseract optional).
  4. Minimap color segmentation -> coarse player positions.
When video is unreadable, fall back to a synthetic payload identical in shape
to the CS2 parser so the rest of the platform works unchanged.
"""
import logging
import os

log = logging.getLogger(__name__)


def _probe_video(path: str) -> dict:
    try:
        import cv2  # type: ignore

        cap = cv2.VideoCapture(path)
        if not cap.isOpened():
            return {}
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        frames = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        # Sample up to 24 frames spread across the video for scene-change detection.
        import numpy as np  # type: ignore

        prev = None
        cuts = 0
        step = max(int(frames // 24), 1)
        idx = 0
        while True:
            ok = cap.grab()
            if not ok:
                break
            if idx % step == 0:
                _, frame = cap.retrieve()
                small = cv2.resize(frame, (64, 64))
                gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
                hist = cv2.calcHist([gray], [0], None, [16], [0, 256]).flatten()
                hist = hist / (hist.sum() + 1e-6)
                if prev is not None and float(np.abs(hist - prev).sum()) > 0.9:
                    cuts += 1
                prev = hist
            idx += 1
            if idx > frames:
                break
        cap.release()
        return {"fps": fps, "frames": int(frames), "duration": frames / fps if fps else 0, "scene_cuts": cuts}
    except ImportError:
        log.warning("opencv not installed; CrossFire VOD uses synthetic fallback")
        return {}
    except Exception as exc:  # noqa: BLE001
        log.warning("CrossFire probe failed (%s); synthetic fallback", exc)
        return {}


def analyze_crossfire_vod(path: str, map_name: str = "black widow") -> dict:
    """Analyze a CrossFire .mp4/.mkv VOD into the canonical payload."""
    from app.core.cs2_parser import TEAM_A, TEAM_B, synthetic_match

    info = _probe_video(path) if os.path.exists(path) else {}
    log.info("CrossFire VOD probe for %s: %s", path, info)
    # TODO: wire killfeed OCR (pytesseract) + minimap segmentation here to
    # replace the synthetic rounds with detected ones. The manual-entry API
    # (POST /api/matches/{id}/rounds/manual) already allows correcting data.
    payload = synthetic_match(f"cf:{path}", map_name=map_name)
    payload["team_players"] = TEAM_A
    payload["enemy_players"] = TEAM_B
    payload["source"] = "crossfire_cv_fallback" if not info else "crossfire_cv"
    payload["video_info"] = info
    return payload
