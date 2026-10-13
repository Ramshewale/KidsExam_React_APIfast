from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.user import Student
from models.academic import Subject, Chapter
from models.exam import TestResult


def get_student_progress_report(db: Session, student_id: int):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    # 1. Fetch entire curriculum for the student's assigned class
    subjects = db.query(Subject).filter(Subject.class_id == student.class_id).all()

    # 2. Fetch all test results taken by this student
    results = (
        db.query(TestResult)
        .filter(TestResult.student_id == student_id)
        .order_by(TestResult.completed_at.asc())
        .all()
    )

    # Group test results by chapter_id
    results_by_chapter = {}
    for r in results:
        results_by_chapter.setdefault(r.chapter_id, []).append(r)

    total_study_seconds = sum(r.duration_seconds or 0 for r in results)
    total_tests_taken = len(results)
    overall_avg_score = (
        round(sum(r.percentage for r in results) / total_tests_taken, 1)
        if total_tests_taken > 0
        else 0
    )

    subject_reports = []
    high_priority_chapters = []

    for subj in subjects:
        subj_tests = []
        chapter_matrix = []

        for ch in subj.chapters:
            ch_tests = results_by_chapter.get(ch.id, [])
            attempts = len(ch_tests)

            if attempts > 0:
                latest_score = ch_tests[-1].percentage
                best_score = max(t.percentage for t in ch_tests)
                total_duration = sum(t.duration_seconds or 0 for t in ch_tests)
                total_q = sum(t.total_questions or 1 for t in ch_tests)
                avg_time_per_q = round(total_duration / total_q, 1) if total_q > 0 else 0
                last_active = ch_tests[-1].completed_at.strftime("%b %d, %Y")

                # Mastery Status
                if latest_score >= 80:
                    status = "Mastered"
                elif latest_score >= 55:
                    status = "In Progress"
                else:
                    status = "Needs Attention"

                # Focus recommendations
                if latest_score < 55 and avg_time_per_q > 45:
                    recommendation = "Concept Confusion (High time, low accuracy)"
                    high_priority_chapters.append({
                        "subject": subj.name,
                        "chapter": ch.name,
                        "latest_score": latest_score,
                        "reason": recommendation,
                    })
                elif latest_score < 55 and avg_time_per_q < 10:
                    recommendation = "Rushing / Guessing (Very fast pace)"
                    high_priority_chapters.append({
                        "subject": subj.name,
                        "chapter": ch.name,
                        "latest_score": latest_score,
                        "reason": recommendation,
                    })
                elif latest_score >= 80:
                    recommendation = "Ready for revision"
                else:
                    recommendation = "Needs more repetitions"

                subj_tests.extend(ch_tests)
            else:
                latest_score = None
                best_score = None
                avg_time_per_q = 0
                status = "Not Started"
                recommendation = "No practice recorded yet"
                last_active = "—"

            chapter_matrix.append({
                "chapter_id": ch.id,
                "chapter_name": ch.name,
                "attempts": attempts,
                "latest_score": latest_score,
                "best_score": best_score,
                "avg_time_per_question": avg_time_per_q,
                "status": status,
                "recommendation": recommendation,
                "last_active": last_active,
            })

        subj_attempts = len(subj_tests)
        subj_avg = (
            round(sum(t.percentage for t in subj_tests) / subj_attempts, 1)
            if subj_attempts > 0
            else 0
        )
        subj_time = sum(t.duration_seconds or 0 for t in subj_tests)

        subject_reports.append({
            "subject_id": subj.id,
            "subject_name": subj.name,
            "total_attempts": subj_attempts,
            "average_score": subj_avg,
            "time_invested_seconds": subj_time,
            "chapters_completed": sum(1 for c in chapter_matrix if c["attempts"] > 0),
            "total_chapters": len(subj.chapters),
            "chapters": chapter_matrix,
        })

    # Recent activity logs (last 5)
    recent_activity = [
        {
            "id": r.id,
            "chapter_name": r.chapter.name if r.chapter else "General Test",
            "score": r.score,
            "total_questions": r.total_questions,
            "percentage": r.percentage,
            "duration_seconds": r.duration_seconds or 0,
            "completed_at": r.completed_at.strftime("%b %d, %Y %I:%M %p"),
        }
        for r in reversed(results[-5:])
    ]

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "class_name": student.academic_class.name if student.academic_class else "Class 10",
        },
        "summary": {
            "total_tests_taken": total_tests_taken,
            "overall_avg_score": overall_avg_score,
            "total_study_seconds": total_study_seconds,
            "focus_areas_count": len(high_priority_chapters),
        },
        "high_priority_focus": high_priority_chapters,
        "subjects": subject_reports,
        "recent_activity": recent_activity,
    }