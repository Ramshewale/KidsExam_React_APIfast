from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas.auth_schemas import (
    ParentRegisterRequest,
    EmailLoginRequest,
    StudentCreateRequest,
    StudentUpdateRequest,
    StudentLoginRequest,
    CheckUsernameResponse,
    StudentResponse,
    AuthResponse,
)
from controllers.auth_controller import (
    register_parent,
    login_email_user,
    add_student_to_parent,
    update_student_credentials,
    login_student,
    check_student_username_available,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication & Licensing"])


@router.post("/register/parent")
def register(payload: ParentRegisterRequest, db: Session = Depends(get_db)):
    return register_parent(db, payload)


@router.post("/login")
def login(payload: EmailLoginRequest, db: Session = Depends(get_db)):
    return login_email_user(db, payload)


# Check real-time username availability
@router.get("/check-student-username", response_model=CheckUsernameResponse)
def check_username(
    username: str = Query(..., min_length=3, max_length=50),
    exclude_student_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return check_student_username_available(db, username, exclude_student_id)


# Parent creates child with username + password
@router.post("/parents/{parent_id}/students", response_model=StudentResponse)
def create_student_profile(
    parent_id: int,
    payload: StudentCreateRequest,
    db: Session = Depends(get_db)
):
    return add_student_to_parent(db, parent_id, payload)


# Parent updates child details, username, or resets password
@router.put("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: int,
    payload: StudentUpdateRequest,
    db: Session = Depends(get_db)
):
    return update_student_credentials(db, student_id, payload)


# Modern student login: Handle + Bcrypt password
@router.post("/student/login")
def student_handle_login(payload: StudentLoginRequest, db: Session = Depends(get_db)):
    return login_student(db, payload)
