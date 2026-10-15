import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


# Parent Registration
class ParentRegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str


# Login for Parent and Admin
class EmailLoginRequest(BaseModel):
    email: str
    password: str


# Student Login via Custom Handle + Password
class StudentLoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_]+$", cleaned):
            raise ValueError("Username can only contain letters, numbers, and underscores.")
        return cleaned


# Check Handle Availability
class CheckUsernameResponse(BaseModel):
    username: str
    available: bool
    message: str


# Child profile creation by Parent
class StudentCreateRequest(BaseModel):
    name: str
    class_id: int
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4)

    @field_validator("username")
    @classmethod
    def validate_handle(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_]+$", cleaned):
            raise ValueError("Username can only contain letters, numbers, and underscores.")
        return cleaned


# Edit student details / credentials
class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    class_id: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None  # If provided, hashes and updates password

    @field_validator("username")
    @classmethod
    def validate_opt_handle(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip().lower()
            if not re.match(r"^[a-zA-Z0-9_]+$", cleaned):
                raise ValueError("Username can only contain letters, numbers, and underscores.")
            return cleaned
        return v


class StudentResponse(BaseModel):
    id: int
    name: str
    username: str
    class_id: int
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    students: Optional[List[StudentResponse]] = None


class ParentLicenseUpdate(BaseModel):
    license_seats: int
    subscription_plan: Optional[str] = None
