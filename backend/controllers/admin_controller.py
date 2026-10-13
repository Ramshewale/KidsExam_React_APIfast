import re
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from models.question import Question, QuestionStatus
from models.academic import Chapter, Subject, AcademicClass
from schemas.exam_schemas import (
    AdminQuestionCreate,
    AdminQuestionUpdate,
    AdminStatusUpdate,
)
from schemas.exam_schemas import AdminQuestionCreate
from models.user import Parent, Student
from models.academic import AcademicClass

def _normalize_text(text: str) -> str:
    """Normalize text by lowering case, stripping extra whitespace and punctuation."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    return " ".join(cleaned.split())


def check_for_duplicates(db: Session, chapter_id: int, new_text: str, exclude_id: int = None):
    """
    Checks if a substantially similar question already exists in the same chapter.
    Enforces PRD Section 19 duplicate prevention.
    """
    normalized_target = _normalize_text(new_text)
    existing_questions = db.query(Question).filter(Question.chapter_id == chapter_id)

    if exclude_id:
        existing_questions = existing_questions.filter(Question.id != exclude_id)

    for q in existing_questions.all():
        if _normalize_text(q.text) == normalized_target:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate question detected in this chapter: '{q.text}' (ID: {q.id})"
            )


def create_admin_question(db: Session, payload: AdminQuestionCreate):
    # Verify chapter exists
    chapter = db.query(Chapter).filter(Chapter.id == payload.chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    # Verify correct_answer is in options
    if payload.correct_answer not in payload.options:
        raise HTTPException(
            status_code=400,
            detail="The correct_answer must be one of the provided options."
        )

    # Enforce duplicate check
    check_for_duplicates(db, payload.chapter_id, payload.text)

    new_q = Question(
        chapter_id=payload.chapter_id,
        text=payload.text.strip(),
        options=payload.options,
        correct_answer=payload.correct_answer.strip(),
        difficulty=payload.difficulty,
        status=payload.status.value,
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q


def list_admin_questions(
        db: Session,
        class_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        chapter_id: Optional[int] = None,
        difficulty: Optional[str] = None,
        status_filter: Optional[str] = None,
):
    query = db.query(Question)

    # Hierarchical dynamic drill-down
    if chapter_id:
        # Question connects directly to chapter_id
        query = query.filter(Question.chapter_id == chapter_id)
    elif subject_id:
        # Chapter contains subject_id
        query = query.join(Chapter, Question.chapter_id == Chapter.id) \
            .filter(Chapter.subject_id == subject_id)
    elif class_id:
        # Subject contains class_id
        query = query.join(Chapter, Question.chapter_id == Chapter.id) \
            .join(Subject, Chapter.subject_id == Subject.id) \
            .filter(Subject.class_id == class_id)

    # Status and difficulty filters
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if status_filter:
        query = query.filter(Question.status == status_filter)

    results = query.order_by(Question.id.desc()).all()

    # Attach chapter name for admin UI display convenience
    response = []
    for q in results:
        response.append({
            "id": q.id,
            "chapter_id": q.chapter_id,
            "chapter_name": q.chapter.name if q.chapter else "",
            "text": q.text,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "difficulty": q.difficulty,
            "status": q.status,
        })
    return response


def update_admin_question(db: Session, question_id: int, payload: AdminQuestionUpdate):
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check duplicates if text changed
    if payload.text and payload.text.strip() != question.text:
        check_for_duplicates(db, question.chapter_id, payload.text, exclude_id=question_id)
        question.text = payload.text.strip()

    if payload.options is not None:
        question.options = payload.options

    if payload.correct_answer is not None:
        options_to_check = payload.options if payload.options is not None else question.options
        if payload.correct_answer not in options_to_check:
            raise HTTPException(
                status_code=400,
                detail="The correct_answer must be one of the provided options."
            )
        question.correct_answer = payload.correct_answer.strip()

    if payload.difficulty is not None:
        question.difficulty = payload.difficulty

    if payload.status is not None:
        question.status = payload.status.value

    db.commit()
    db.refresh(question)
    return question


def set_question_status(db: Session, question_id: int, payload: AdminStatusUpdate):
    """Direct lifecycle toggle (e.g. Approve, Activate, Deactivate)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.status = payload.status.value
    db.commit()
    db.refresh(question)
    return {"message": f"Question {question_id} status updated to {question.status}"}


def bulk_create_admin_questions(db: Session, chapter_id: int, questions_data: list):
    """
    Bulk inserts a list of questions for a specific chapter,
    enforcing option validation and duplicate prevention on each entry.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    created_questions = []
    skipped_duplicates = []

    for index, item in enumerate(questions_data, start=1):
        text = item.get("text", "").strip()
        options = [str(opt).strip() for opt in item.get("options", [])]
        correct_answer = str(item.get("correct_answer", "")).strip()
        difficulty = item.get("difficulty", "Medium")
        status_val = item.get("status", "Draft")

        if len(text) < 5:
            continue
        if len(options) < 2:
            continue
        if correct_answer not in options:
            continue

        # Check duplicate
        try:
            check_for_duplicates(db, chapter_id, text)
        except HTTPException:
            skipped_duplicates.append(f"Row {index}: '{text}'")
            continue

        new_q = Question(
            chapter_id=chapter_id,
            text=text,
            options=options,
            correct_answer=correct_answer,
            difficulty=difficulty,
            status=status_val,
        )
        db.add(new_q)
        created_questions.append(new_q)

    db.commit()
    for q in created_questions:
        db.refresh(q)

    return {
        "created_count": len(created_questions),
        "skipped_count": len(skipped_duplicates),
        "skipped_details": skipped_duplicates,
    }

def get_all_chapters(db: Session):
    return db.query(Chapter).order_by(Chapter.id.asc()).all()

def list_all_parents_with_students(db: Session):
    """Retrieve all parent accounts, license seat capacity, and enrolled child profiles."""
    parents = db.query(Parent).order_by(Parent.id.desc()).all()
    result = []
    for p in parents:
        students_list = [
            {
                "id": s.id,
                "name": s.name,
                "class_id": s.class_id,
                "class_name": s.academic_class.name if s.academic_class else "Class 10",
                "pin": s.pin,
            }
            for s in p.students
        ]
        result.append({
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "subscription_plan": p.subscription_plan,
            "license_seats": p.license_seats,
            "is_active": p.is_active,
            "students": students_list,
        })
    return result


def toggle_parent_status(db: Session, parent_id: int):
    """Suspend or reactivate a parent account and their family license."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent account not found.")
    parent.is_active = not parent.is_active
    db.commit()
    db.refresh(parent)
    return {"message": f"Parent status changed to {'Active' if parent.is_active else 'Suspended'}"}


def update_parent_license(db: Session, parent_id: int, payload: ParentLicenseUpdate):
    """Allows Admin to update license seat capacity and plan."""
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found.")

    if payload.license_seats < len(parent.students):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reduce seats below currently registered children ({len(parent.students)})."
        )

    parent.license_seats = payload.license_seats
    if payload.subscription_plan:
        parent.subscription_plan = payload.subscription_plan
    db.commit()
    db.refresh(parent)
    return {"message": "Parent license updated successfully", "license_seats": parent.license_seats}


def update_student_details(db: Session, student_id: int, payload: StudentUpdateRequest):
    """Allows Admin or Parent to change student name, class assignment, or PIN."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if payload.name:
        student.name = payload.name.strip()
    if payload.class_id:
        target_class = db.query(AcademicClass).filter(AcademicClass.id == payload.class_id).first()
        if not target_class:
            raise HTTPException(status_code=404, detail="Selected academic class does not exist.")
        student.class_id = payload.class_id
    if payload.pin:
        pin_cleaned = payload.pin.strip()
        if len(pin_cleaned) != 4 or not pin_cleaned.isdigit():
            raise HTTPException(status_code=400, detail="PIN must be exactly 4 numeric digits.")
        student.pin = pin_cleaned

    db.commit()
    db.refresh(student)
    return {
        "id": student.id,
        "name": student.name,
        "class_id": student.class_id,
        "class_name": student.academic_class.name if student.academic_class else "",
        "pin": student.pin
    }