from database import SessionLocal, Base, engine
from models.academic import AcademicClass, Chapter, Subject
from models.question import Question, QuestionStatus
from models.user import Admin, Parent, Student
from security import hash_password


def seed_commercial_data():
    # 1. Automatically create all missing tables (admins, parents, students, etc.)
    Base.metadata.create_all(bind=engine)

    # 2. Open DB session
    db = SessionLocal()
    try:
        # Academic Class
        cls = db.query(AcademicClass).filter_by(name="Class 10").first()
        if not cls:
            cls = AcademicClass(name="Class 10")
            db.add(cls)
            db.commit()
            db.refresh(cls)

        # Subject
        math = db.query(Subject).filter_by(name="Mathematics", class_id=cls.id).first()
        if not math:
            math = Subject(name="Mathematics", class_id=cls.id)
            db.add(math)
            db.commit()
            db.refresh(math)

        # Chapter
        fractions = db.query(Chapter).filter_by(name="Fractions & Decimals", subject_id=math.id).first()
        if not fractions:
            fractions = Chapter(name="Fractions & Decimals", subject_id=math.id)
            db.add(fractions)
            db.commit()
            db.refresh(fractions)

        # Flashcard Questions
        if db.query(Question).filter_by(chapter_id=fractions.id).count() == 0:
            questions = [
                Question(
                    chapter_id=fractions.id,
                    text="What is 1/2 + 1/4 in simplest form?",
                    options=["3/4", "2/6", "1/8", "2/4"],
                    correct_answer="3/4",
                    difficulty="Easy",
                    status=QuestionStatus.ACTIVE,
                ),
                Question(
                    chapter_id=fractions.id,
                    text="Which of the following is equivalent to 3/5?",
                    options=["0.3", "0.5", "0.6", "0.8"],
                    correct_answer="0.6",
                    difficulty="Easy",
                    status=QuestionStatus.ACTIVE,
                ),
                Question(
                    chapter_id=fractions.id,
                    text="Evaluate: 2/3 * 9/10",
                    options=["1/5", "3/5", "18/30", "4/5"],
                    correct_answer="3/5",
                    difficulty="Medium",
                    status=QuestionStatus.ACTIVE,
                ),
            ]
            db.add_all(questions)
            db.commit()

        # Admin Account
        if not db.query(Admin).filter_by(email="admin@readyforexam.com").first():
            admin = Admin(
                full_name="Platform Admin",
                email="admin@readyforexam.com",
                hashed_password=hash_password("admin123"),
            )
            db.add(admin)

        # Parent & Student Accounts
        parent = db.query(Parent).filter_by(email="parent@example.com").first()
        if not parent:
            parent = Parent(
                full_name="Sarah Doe",
                email="parent@example.com",
                hashed_password=hash_password("parent123"),
                license_seats=3,
            )
            db.add(parent)
            db.commit()
            db.refresh(parent)

            student = Student(
                parent_id=parent.id,
                class_id=cls.id,
                name="Alex Doe",
                pin="1234",
            )
            db.add(student)

        db.commit()
        print("Database successfully seeded with Curriculum, Questions, Admin, and Parent accounts!")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_commercial_data()