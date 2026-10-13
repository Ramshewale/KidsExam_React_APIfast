import re
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models.user import Parent, Student, Admin, RoleEnum
from models.academic import AcademicClass
from security import hash_password, verify_password, create_access_token
from schemas.auth_schemas import (
    ParentRegisterRequest,
    EmailLoginRequest,
    StudentCreateRequest,
    StudentUpdateRequest,
    StudentLoginRequest,
    CheckUsernameResponse,
)


def check_student_username_available(db: Session, username: str, exclude_student_id: int = None) -> CheckUsernameResponse:
    cleaned = username.strip().lower()
    if not re.match(r"^[a-zA-Z0-9_]{3,50}$", cleaned):
        return CheckUsernameResponse(
            username=cleaned,
            available=False,
            message="Username must be 3-50 characters using only letters, numbers, and underscores."
        )

    query = db.query(Student).filter(Student.username == cleaned)
    if exclude_student_id:
        query = query.filter(Student.id != exclude_student_id)

    if query.first():
        return CheckUsernameResponse(
            username=cleaned,
            available=False,
            message="That username is already taken. Try another."
        )

    return CheckUsernameResponse(
        username=cleaned,
        available=True,
        message="Username is available! ✨"
    )


def register_parent(db: Session, payload: ParentRegisterRequest):
    if db.query(Parent).filter(Parent.email == payload.email.lower()).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_parent = Parent(
        full_name=payload.full_name.strip(),
        email=payload.email.lower().strip(),
        hashed_password=hash_password(payload.password),
        subscription_plan="Family Standard",
        license_seats=2,
    )
    db.add(new_parent)
    db.commit()
    db.refresh(new_parent)

    token = create_access_token({
        "sub": str(new_parent.id),
        "role": RoleEnum.PARENT.value,
        "email": new_parent.email,
    })

    return {
        "access_token": token,
        "role": RoleEnum.PARENT.value,
        "user_id": new_parent.id,
        "name": new_parent.full_name,
        "students": [],
    }


def login_email_user(db: Session, payload: EmailLoginRequest):
    admin = db.query(Admin).filter(Admin.email == payload.email.lower()).first()
    if admin and verify_password(payload.password, admin.hashed_password):
        token = create_access_token({
            "sub": str(admin.id),
            "role": RoleEnum.ADMIN.value,
            "email": admin.email,
        })
        return {
            "access_token": token,
            "role": RoleEnum.ADMIN.value,
            "user_id": admin.id,
            "name": admin.full_name,
        }

    parent = db.query(Parent).filter(Parent.email == payload.email.lower()).first()
    if parent and verify_password(payload.password, parent.hashed_password):
        token = create_access_token({
            "sub": str(parent.id),
            "role": RoleEnum.PARENT.value,
            "email": parent.email,
        })
        students_list = [
            {
                "id": s.id,
                "name": s.name,
                "username": s.username,
                "class_id": s.class_id,
                "class_name": s.academic_class.name if s.academic_class else "",
            }
            for s in parent.students
        ]
        return {
            "access_token": token,
            "role": RoleEnum.PARENT.value,
            "user_id": parent.id,
            "name": parent.full_name,
            "students": students_list,
        }

    raise HTTPException(status_code=401, detail="Invalid email or password.")


def add_student_to_parent(db: Session, parent_id: int, payload: StudentCreateRequest):
    parent = db.query(Parent).filter(Parent.id == parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent account not found.")

    # Check username uniqueness across all students
    normalized_username = payload.username.strip().lower()
    if db.query(Student).filter(Student.username == normalized_username).first():
        raise HTTPException(status_code=400, detail="This username is already in use.")

    target_class = db.query(AcademicClass).filter(AcademicClass.id == payload.class_id).first()
    if not target_class:
        raise HTTPException(status_code=404, detail="Selected academic class not found.")

    new_student = Student(
        parent_id=parent_id,
        class_id=payload.class_id,
        name=payload.name.strip(),
        username=normalized_username,
        password_hash=hash_password(payload.password),
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)

    return {
        "id": new_student.id,
        "name": new_student.name,
        "username": new_student.username,
        "class_id": new_student.class_id,
        "class_name": target_class.name,
    }


def update_student_credentials(db: Session, student_id: int, payload: StudentUpdateRequest):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    if payload.name:
        student.name = payload.name.strip()

    if payload.class_id:
        target_class = db.query(AcademicClass).filter(AcademicClass.id == payload.class_id).first()
        if not target_class:
            raise HTTPException(status_code=404, detail="Academic class not found.")
        student.class_id = payload.class_id

    if payload.username:
        normalized_handle = payload.username.strip().lower()
        conflict = db.query(Student).filter(Student.username == normalized_handle, Student.id != student_id).first()
        if conflict:
            raise HTTPException(status_code=400, detail="This username is already taken.")
        student.username = normalized_handle

    if payload.password:
        student.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(student)

    return {
        "id": student.id,
        "name": student.name,
        "username": student.username,
        "class_id": student.class_id,
        "class_name": student.academic_class.name if student.academic_class else "",
    }


def login_student(db: Session, payload: StudentLoginRequest):
    normalized_handle = payload.username.strip().lower()
    student = db.query(Student).filter(Student.username == normalized_handle).first()

    # --- DEBUG PRINTS ---
    print(f"DEBUG: Searched username: '{normalized_handle}'")
    print(f"DEBUG: Student record found: {student}")
    print(f"DEBUG: Payload password received: {repr(payload.password)}")
    if student:
        print(f"DEBUG: Stored hash in DB: {student.password_hash}")
        password_matches = verify_password(payload.password, student.password_hash)
        print(f"DEBUG: Password match result: {password_matches}")
    # ---------------------

    if not student or not verify_password(payload.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = create_access_token({
        "sub": str(student.id),
        "role": RoleEnum.STUDENT.value,
        "parent_id": student.parent_id,
        "name": student.name,
        "username": student.username,
    })

    return {
        "access_token": token,
        "role": RoleEnum.STUDENT.value,
        "user_id": student.id,
        "name": student.name,
        "username": student.username,
        "class_id": student.class_id,
        "class_name": student.academic_class.name if student.academic_class else "",
    }