from datetime import datetime
from database import Base
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship


class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    student_name = Column(String(100), nullable=True)
    chapter_id = Column(Integer, ForeignKey("chapters.id"), nullable=False)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    duration_seconds = Column(Integer, default=0)  # Total deck duration in seconds
    completed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    chapter = relationship("Chapter")
    student = relationship("Student", back_populates="test_results")