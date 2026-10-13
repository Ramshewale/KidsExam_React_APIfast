import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "Admin"
    PARENT = "Parent"
    STUDENT = "Student"


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    subscription_plan = Column(String(50), default="Family Standard")
    license_seats = Column(Integer, default=2)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    students = relationship("Student", back_populates="parent", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("parents.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("academic_classes.id"), nullable=False)
    name = Column(String(100), nullable=False)

    # Custom handle & Bcrypt hashed password
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    # Optional legacy fallback (retained to prevent breakage during transition)
    pin = Column(String(10), nullable=True, default="1234")
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("Parent", back_populates="students")
    academic_class = relationship("AcademicClass")
    test_results = relationship("TestResult", back_populates="student", cascade="all, delete-orphan")