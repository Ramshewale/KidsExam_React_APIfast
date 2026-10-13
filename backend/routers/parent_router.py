from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from controllers.parent_controller import get_student_progress_report

router = APIRouter(prefix="/api/parents", tags=["Parents - Monitoring & Analytics"])

@router.get("/students/{student_id}/progress-report")
def get_child_progress_report(student_id: int, db: Session = Depends(get_db)):
    return get_student_progress_report(db, student_id)