from typing import List
from controllers.exam_controller import (
    get_student_history,
    list_active_questions_by_chapter,
    list_chapters_by_subject,
    record_test_session,
    verify_flashcard_answer,
    get_curriculum_for_class,
    submit_exam_session,  # <--- Add this import
)
from database import get_db
from fastapi import APIRouter, Depends
from schemas.exam_schemas import (
    AnswerCheckRequest,
    AnswerCheckResponse,
    ChapterRead,
    FinalizeSessionRequest,
    HistoricalResultRead,
    QuestionRead,
    ExamSubmission,      # <--- Add this import
)
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/exams", tags=["Exams"])


# Get all chapters under a specific subject
@router.get("/subjects/{subject_id}/chapters", response_model=List[ChapterRead])
def get_chapters(subject_id: int, db: Session = Depends(get_db)):
    return list_chapters_by_subject(db, subject_id)


# Fetch active flashcard questions for a chapter
@router.get("/chapters/{chapter_id}/questions", response_model=List[QuestionRead])
def get_chapter_questions(chapter_id: int, db: Session = Depends(get_db)):
    return list_active_questions_by_chapter(db, chapter_id)


# Immediate evaluation of a single selected flashcard option
@router.post("/check-answer", response_model=AnswerCheckResponse)
def check_answer(payload: AnswerCheckRequest, db: Session = Depends(get_db)):
    return verify_flashcard_answer(db, payload)


# Save session score upon completion (legacy endpoint)
@router.post("/finalize")
def finalize_session(payload: FinalizeSessionRequest, db: Session = Depends(get_db)):
    return record_test_session(db, payload)


# Submit full session deck and receive score breakdown (NEW ENDPOINT)
@router.post("/submit")
def submit_exam(payload: ExamSubmission, db: Session = Depends(get_db)):
    return submit_exam_session(db, payload)


# Get past 5 test performances for the student
@router.get("/history/{student_name}", response_model=List[HistoricalResultRead])
def get_history(student_name: str, db: Session = Depends(get_db)):
    return get_student_history(db, student_name)


@router.get("/classes/{class_id}/decks")
def get_decks_by_class(class_id: int, db: Session = Depends(get_db)):
    return get_curriculum_for_class(db, class_id)