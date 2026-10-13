from models.academic import Chapter, Subject, AcademicClass
from models.exam import TestResult
from models.question import Question, QuestionStatus
from schemas.exam_schemas import (
    AnswerCheckRequest,
    AnswerCheckResponse,
    FinalizeSessionRequest,
    ExamSubmission,  # <--- Ensure this is imported
)
from sqlalchemy.orm import Session


# Fetch all chapters for a given subject
def list_chapters_by_subject(db: Session, subject_id: int):
    return db.query(Chapter).filter(Chapter.subject_id == subject_id).all()


# Retrieve active, approved questions for a chapter flashcard deck
def list_active_questions_by_chapter(db: Session, chapter_id: int):
    return (
        db.query(Question)
        .filter(
            Question.chapter_id == chapter_id,
            Question.status == QuestionStatus.ACTIVE,
        )
        .all()
    )


# Perform instant evaluation of a flashcard answer (PRD Section 6, Obj 4)
def verify_flashcard_answer(db: Session, payload: AnswerCheckRequest):
    question = db.query(Question).filter(Question.id == payload.question_id).first()
    if not question:
        return AnswerCheckResponse(is_correct=False, correct_answer="")

    is_correct = question.correct_answer.strip() == payload.selected_option.strip()
    return AnswerCheckResponse(
        is_correct=is_correct,
        correct_answer=question.correct_answer,
    )


# Finalize test session and commit permanent metrics
def record_test_session(db: Session, payload: FinalizeSessionRequest):
    total = payload.total_questions if payload.total_questions > 0 else 1
    percentage = round((payload.score / total) * 100, 2)

    result = TestResult(
        student_name=payload.student_name,
        chapter_id=payload.chapter_id,
        score=payload.score,
        total_questions=payload.total_questions,
        percentage=percentage,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    return {"percentage": percentage, "score": payload.score}


# Process entire submitted practice deck and generate item-by-item breakdown
def submit_exam_session(db: Session, payload: ExamSubmission):
    total = len(payload.answers)
    score = 0
    breakdown = []

    for ans in payload.answers:
        q = db.query(Question).filter(Question.id == ans.question_id).first()
        is_correct = False
        correct_answer = q.correct_answer if q else ""

        if q and ans.selected_answer and ans.selected_answer.strip() == q.correct_answer.strip():
            score += 1
            is_correct = True

        breakdown.append({
            "question_id": ans.question_id,
            "question_text": q.text if q else "",
            "selected_answer": ans.selected_answer,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "time_spent_seconds": ans.time_spent_seconds or 0,
        })

    percentage = round((score / total) * 100, 2) if total > 0 else 0.0

    # Save to your database TestResult table
    result_record = TestResult(
        student_id=payload.student_id,
        student_name=f"Student #{payload.student_id}",
        chapter_id=payload.chapter_id,
        score=score,
        total_questions=total,
        percentage=percentage,
        duration_seconds=payload.total_duration_seconds or 0,
    )
    db.add(result_record)
    db.commit()
    db.refresh(result_record)

    return {
        "id": result_record.id,
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "duration_seconds": payload.total_duration_seconds or 0,
        "breakdown": breakdown,
    }


# Retrieve recent test results for the student dashboard (PRD Section 13)
def get_student_history(db: Session, student_name: str):
    results = (
        db.query(TestResult)
        .filter(TestResult.student_name == student_name)
        .order_by(TestResult.completed_at.desc())
        .limit(5)
        .all()
    )
    history = []
    for r in results:
        history.append(
            {
                "id": r.id,
                "chapter_name": r.chapter.name if r.chapter else "General Test",
                "score": r.score,
                "total_questions": r.total_questions,
                "percentage": r.percentage,
                "completed_at": r.completed_at,
            }
        )
    return history


def get_curriculum_for_class(db: Session, class_id: int):
    subjects = db.query(Subject).filter(Subject.class_id == class_id).all()

    deck_list = []
    for subj in subjects:
        for ch in subj.chapters:
            q_count = db.query(Question).filter(
                Question.chapter_id == ch.id,
                Question.status == QuestionStatus.ACTIVE
            ).count()

            deck_list.append({
                "chapter_id": ch.id,
                "chapter_name": ch.name,
                "subject_id": subj.id,
                "subject_name": subj.name,
                "question_count": q_count
            })

    return deck_list