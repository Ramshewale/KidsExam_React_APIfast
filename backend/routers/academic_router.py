from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.exam_schemas import (
    AcademicClassCreate,
    AcademicClassRead,
    SubjectCreate,
    SubjectRead,
    ChapterCreate,
    ChapterRead,
    EntityRenameRequest,
)
from controllers.academic_controller import (
    list_classes,
    create_class,
    rename_class,
    list_subjects_by_class,
    create_subject,
    rename_subject,
    list_chapters_by_subject,
    create_chapter,
    rename_chapter,
    get_full_curriculum_tree,
)
from controllers.parent_controller import get_student_progress_report

router = APIRouter(prefix="/api/admin/curriculum", tags=["Admin - Academic Structure"])


@router.get("/tree")
def get_curriculum_tree(db: Session = Depends(get_db)):
    return get_full_curriculum_tree(db)


# Classes
@router.get("/classes", response_model=List[AcademicClassRead])
def get_classes(db: Session = Depends(get_db)):
    return list_classes(db)


@router.post("/classes", response_model=AcademicClassRead)
def add_class(payload: AcademicClassCreate, db: Session = Depends(get_db)):
    return create_class(db, payload)


@router.put("/classes/{class_id}", response_model=AcademicClassRead)
def update_class(class_id: int, payload: EntityRenameRequest, db: Session = Depends(get_db)):
    return rename_class(db, class_id, payload)


# Subjects
@router.get("/classes/{class_id}/subjects", response_model=List[SubjectRead])
def get_subjects(class_id: int, db: Session = Depends(get_db)):
    return list_subjects_by_class(db, class_id)


@router.post("/subjects", response_model=SubjectRead)
def add_subject(payload: SubjectCreate, db: Session = Depends(get_db)):
    return create_subject(db, payload)


@router.put("/subjects/{subject_id}", response_model=SubjectRead)
def update_subject(subject_id: int, payload: EntityRenameRequest, db: Session = Depends(get_db)):
    return rename_subject(db, subject_id, payload)


# Chapters
@router.get("/subjects/{subject_id}/chapters", response_model=List[ChapterRead])
def get_chapters(subject_id: int, db: Session = Depends(get_db)):
    return list_chapters_by_subject(db, subject_id)


@router.post("/chapters", response_model=ChapterRead)
def add_chapter(payload: ChapterCreate, db: Session = Depends(get_db)):
    return create_chapter(db, payload)


@router.put("/chapters/{chapter_id}", response_model=ChapterRead)
def update_chapter(chapter_id: int, payload: EntityRenameRequest, db: Session = Depends(get_db)):
    return rename_chapter(db, chapter_id, payload)

@router.get("/students/{student_id}/progress-report")
def get_child_progress_report(student_id: int, db: Session = Depends(get_db)):
    return get_student_progress_report(db, student_id)