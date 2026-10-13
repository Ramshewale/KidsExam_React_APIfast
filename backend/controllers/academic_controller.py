from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.academic import AcademicClass, Subject, Chapter
from models.question import Question
from schemas.exam_schemas import (
    AcademicClassCreate,
    SubjectCreate,
    ChapterCreate,
    EntityRenameRequest,
)


# --- Academic Class Operations ---
def list_classes(db: Session):
    return db.query(AcademicClass).order_by(AcademicClass.id.asc()).all()


def create_class(db: Session, payload: AcademicClassCreate):
    existing = db.query(AcademicClass).filter(AcademicClass.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A class with this name already exists.")

    new_class = AcademicClass(name=payload.name.strip())
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class


def rename_class(db: Session, class_id: int, payload: EntityRenameRequest):
    item = db.query(AcademicClass).filter(AcademicClass.id == class_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Class not found.")
    item.name = payload.name.strip()
    db.commit()
    db.refresh(item)
    return item


# --- Subject Operations ---
def list_subjects_by_class(db: Session, class_id: int):
    return db.query(Subject).filter(Subject.class_id == class_id).order_by(Subject.id.asc()).all()


def create_subject(db: Session, payload: SubjectCreate):
    cls = db.query(AcademicClass).filter(AcademicClass.id == payload.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Target academic class not found.")

    existing = db.query(Subject).filter(
        Subject.class_id == payload.class_id,
        Subject.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This subject already exists under this class.")

    new_subj = Subject(class_id=payload.class_id, name=payload.name.strip())
    db.add(new_subj)
    db.commit()
    db.refresh(new_subj)
    return new_subj


def rename_subject(db: Session, subject_id: int, payload: EntityRenameRequest):
    item = db.query(Subject).filter(Subject.id == subject_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Subject not found.")
    item.name = payload.name.strip()
    db.commit()
    db.refresh(item)
    return item


# --- Chapter Operations ---
def list_chapters_by_subject(db: Session, subject_id: int):
    return db.query(Chapter).filter(Chapter.subject_id == subject_id).order_by(Chapter.id.asc()).all()


def create_chapter(db: Session, payload: ChapterCreate):
    subj = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="Target subject not found.")

    existing = db.query(Chapter).filter(
        Chapter.subject_id == payload.subject_id,
        Chapter.name.ilike(payload.name.strip())
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This chapter already exists under this subject.")

    new_ch = Chapter(subject_id=payload.subject_id, name=payload.name.strip())
    db.add(new_ch)
    db.commit()
    db.refresh(new_ch)
    return new_ch


def rename_chapter(db: Session, chapter_id: int, payload: EntityRenameRequest):
    item = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Chapter not found.")
    item.name = payload.name.strip()
    db.commit()
    db.refresh(item)
    return item


# --- Tree Hierarchy Overview ---
def get_full_curriculum_tree(db: Session):
    classes = db.query(AcademicClass).order_by(AcademicClass.id.asc()).all()
    tree = []
    for c in classes:
        subjects_data = []
        for s in c.subjects:
            chapters_data = [
                {
                    "id": ch.id,
                    "name": ch.name,
                    "question_count": db.query(Question).filter(Question.chapter_id == ch.id).count(),
                }
                for ch in s.chapters
            ]
            subjects_data.append({
                "id": s.id,
                "name": s.name,
                "chapters": chapters_data,
            })
        tree.append({
            "id": c.id,
            "name": c.name,
            "subjects": subjects_data,
        })
    return tree