import csv
import io
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

from database import get_db
# Ensure ChapterRead is imported from schemas.exam_schemas
from schemas.exam_schemas import (
    ChapterRead,
    AdminQuestionCreate,
    AdminQuestionDetail,
    AdminQuestionUpdate,
    AdminStatusUpdate,
)
from controllers.admin_controller import (
    create_admin_question,
    list_admin_questions,
    set_question_status,
    update_admin_question,
    bulk_create_admin_questions,
    get_all_chapters,
    list_all_parents_with_students,
    toggle_parent_status,
)
from schemas.auth_schemas import ParentLicenseUpdate, StudentUpdateRequest
from controllers.admin_controller import update_parent_license, update_student_details

router = APIRouter(prefix="/api/admin/questions", tags=["Admin - Question Bank"])


# Create a new question with duplicate validation
@router.post("", response_model=AdminQuestionDetail)
def create_question(payload: AdminQuestionCreate, db: Session = Depends(get_db)):
    return create_admin_question(db, payload)


# Filtered list of questions for admin dashboard
@router.get("", response_model=List[AdminQuestionDetail])
def list_questions(
    class_id: Optional[int] = Query(None),
    subject_id: Optional[int] = Query(None),
    chapter_id: Optional[int] = Query(None),
    difficulty: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return list_admin_questions(
        db,
        class_id=class_id,
        subject_id=subject_id,
        chapter_id=chapter_id,
        difficulty=difficulty,
        status_filter=status,
    )


# Update question content or options
@router.put("/{question_id}", response_model=AdminQuestionDetail)
def update_question(
    question_id: int,
    payload: AdminQuestionUpdate,
    db: Session = Depends(get_db),
):
    return update_admin_question(db, question_id, payload)


# Change question lifecycle status (Draft -> Reviewed -> Approved -> Active -> Inactive)
@router.patch("/{question_id}/status")
def change_status(
    question_id: int,
    payload: AdminStatusUpdate,
    db: Session = Depends(get_db),
):
    return set_question_status(db, question_id, payload)


# Bulk upload questions via CSV or JSON file
@router.post("/chapters/{chapter_id}/bulk-upload")
async def bulk_upload_questions(
        chapter_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
):
    contents = await file.read()
    filename = file.filename.lower()
    parsed_questions = []

    if filename.endswith(".json"):
        try:
            data = json.loads(contents.decode("utf-8"))
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON root must be an array of questions.")
            parsed_questions = data
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file format: {str(e)}")

    elif filename.endswith(".csv"):
        try:
            decoded = contents.decode("utf-8")
            reader = csv.DictReader(io.StringIO(decoded))
            for row in reader:
                # Expected CSV headers: text, option_a, option_b, option_c, option_d, correct_answer, difficulty, status
                options = [
                    row.get("option_a", "").strip(),
                    row.get("option_b", "").strip(),
                    row.get("option_c", "").strip(),
                    row.get("option_d", "").strip(),
                ]
                # Filter empty options
                cleaned_options = [opt for opt in options if opt]

                parsed_questions.append({
                    "text": row.get("text", "").strip(),
                    "options": cleaned_options,
                    "correct_answer": row.get("correct_answer", "").strip(),
                    "difficulty": row.get("difficulty", "Medium").strip(),
                    "status": row.get("status", "Draft").strip(),
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Only .csv and .json files are supported.")

    return bulk_create_admin_questions(db, chapter_id, parsed_questions)



@router.get("/chapters", response_model=List[ChapterRead])
def list_all_chapters(db: Session = Depends(get_db)):
    return get_all_chapters(db)

@router.get("/users/parents")
def get_all_parents(db: Session = Depends(get_db)):
    return list_all_parents_with_students(db)


@router.patch("/users/parents/{parent_id}/toggle-status")
def switch_parent_status(parent_id: int, db: Session = Depends(get_db)):
    return toggle_parent_status(db, parent_id)

# Update Parent License Seats
@router.patch("/users/parents/{parent_id}/license")
def change_parent_license(
    parent_id: int,
    payload: ParentLicenseUpdate,
    db: Session = Depends(get_db)
):
    return update_parent_license(db, parent_id, payload)


# Update Student Class, Name, or PIN
@router.patch("/users/students/{student_id}")
def change_student_profile(
    student_id: int,
    payload: StudentUpdateRequest,
    db: Session = Depends(get_db)
):
    return update_student_details(db, student_id, payload)