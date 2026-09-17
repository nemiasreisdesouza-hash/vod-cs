"""VOD annotations CRUD."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.match import Match
from app.models.tactical_mistake import VodAnnotation
from app.models.user import User
from app.schemas.match import AnnotationIn, AnnotationOut

router = APIRouter(tags=["annotations"])


@router.post("/api/matches/{match_id}/annotations", response_model=AnnotationOut)
def create(match_id: int, body: AnnotationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or m.uploader_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    ann = VodAnnotation(match_id=match_id, user_id=user.id, timestamp_seconds=body.timestamp_seconds,
                        kind=body.kind, text=body.text, drawings=body.drawings)
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


@router.get("/api/matches/{match_id}/annotations", response_model=list[AnnotationOut])
def list_all(match_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    m = db.get(Match, match_id)
    if not m or m.uploader_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Match not found")
    return db.scalars(select(VodAnnotation).where(VodAnnotation.match_id == match_id)
                      .order_by(VodAnnotation.timestamp_seconds)).all()


@router.put("/api/annotations/{ann_id}", response_model=AnnotationOut)
def update(ann_id: int, body: AnnotationIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ann = db.get(VodAnnotation, ann_id)
    if not ann or ann.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Annotation not found")
    ann.timestamp_seconds = body.timestamp_seconds
    ann.kind = body.kind
    ann.text = body.text
    ann.drawings = body.drawings
    db.commit()
    db.refresh(ann)
    return ann


@router.delete("/api/annotations/{ann_id}")
def delete(ann_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ann = db.get(VodAnnotation, ann_id)
    if not ann or ann.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Annotation not found")
    db.delete(ann)
    db.commit()
    return {"ok": True}
