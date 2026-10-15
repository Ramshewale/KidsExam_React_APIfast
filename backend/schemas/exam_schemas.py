from __future__ import annotations
from datetime import datetime
from typing import List, Optional
import enum
from pydantic import BaseModel, Field



# Question status enum matching the database model
class QuestionStatusEnum(str, enum.Enum):
    DRAFT = "Draft"
    REVIEWED = "Reviewed"
    APPROVED = "Approved"
    ACTIVE = "Active"
    INACTIVE = "Inactive"


# DTO for chapter lists
class ChapterRead(BaseModel):
    id: int
    is_active: bool
    name: str

    class Config:
        from_attributes = True


# DTO for delivering flashcards to students
class QuestionRead(BaseModel):
    id: int
    chapter_id: int
    text: str
    options: List[str]
    correct_answer: str
    difficulty: Optional[str] = "Medium"
    explanation: Optional[str] = None

    class Config:
        from_attributes = True


# DTO for evaluating a flashcard answer
class AnswerCheckRequest(BaseModel):
    question_id: int
    selected_option: str


# DTO returning immediate correctness
class AnswerCheckResponse(BaseModel):
    is_correct: bool
    correct_answer: str


# DTOs for submitting full practice session
class ExamAnswerSubmission(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None

class QuestionSubmissionItem(BaseModel):
    question_id: int
    selected_answer: Optional[str] = None
    time_spent_seconds: Optional[int] = 0

class ExamSubmission(BaseModel):
    student_id: int
    chapter_id: int
    total_duration_seconds: Optional[int] = 0
    answers: List[QuestionSubmissionItem]


# DTO for saving final test session results
class FinalizeSessionRequest(BaseModel):
    student_name: str
    chapter_id: int
    score: int
    total_questions: int


# DTO for displaying past performance on dashboard
class HistoricalResultRead(BaseModel):
    id: int
    chapter_name: str
    score: float
    total_questions: int
    percentage: float
    completed_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Admin Question Bank DTOs (PRD Sections 17-21)
# ============================================================

# Request schema for creating a new question
class AdminQuestionCreate(BaseModel):
    chapter_id: int
    text: str = Field(..., min_length=5)
    options: List[str] = Field(..., min_items=2)
    correct_answer: str
    difficulty: str = Field(default="Medium")
    status: QuestionStatusEnum = Field(default=QuestionStatusEnum.DRAFT)


# Request schema for updating an existing question
class AdminQuestionUpdate(BaseModel):
    text: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[QuestionStatusEnum] = None


# Request schema to transition question status (PRD Section 17)
class AdminStatusUpdate(BaseModel):
    status: QuestionStatusEnum


# Response schema returning complete question details to admins
class AdminQuestionDetail(BaseModel):
    id: int
    chapter_id: int
    chapter_name: Optional[str] = None
    text: str
    options: List[str]
    correct_answer: str
    difficulty: str
    status: QuestionStatusEnum

    class Config:
        from_attributes = True


# ============================================================
# Academic Hierarchy CRUD Schemas (PRD Section 10)
# ============================================================

class AcademicClassCreate(BaseModel):
    name: str = Field(..., min_length=2)


class AcademicClassRead(BaseModel):
    id: int
    name: str
    is_active: bool

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    class_id: int
    name: str = Field(..., min_length=2)


class SubjectRead(BaseModel):
    id: int
    class_id: int
    is_active: bool
    name: str

    class Config:
        from_attributes = True


class ChapterCreate(BaseModel):
    subject_id: int
    name: str = Field(..., min_length=2)


class EntityRenameRequest(BaseModel):
    name: str = Field(..., min_length=2)


