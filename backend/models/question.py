import enum
from database import Base
from sqlalchemy import JSON, Column, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship


# Controlled question lifecycle state (PRD Section 17 & 18)
class QuestionStatus(str, enum.Enum):
    DRAFT = "Draft"
    REVIEWED = "Reviewed"
    APPROVED = "Approved"
    ACTIVE = "Active"
    INACTIVE = "Inactive"


# Multiple-choice flashcard question linked directly to a Chapter (PRD Section 10, 14-16)
class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    text = Column(Text, nullable=False, index=True)
    options = Column(JSON, nullable=False)
    correct_answer = Column(String(255), nullable=False)
    difficulty = Column(String(50), default="Medium")
    status = Column(Enum(QuestionStatus), default=QuestionStatus.ACTIVE, nullable=False)

    chapter = relationship("Chapter", back_populates="questions")