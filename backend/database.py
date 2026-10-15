import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from the .env configuration file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")

# Fix Supabase URL scheme compatibility for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Ensure SSL requirement for Supabase cloud connections
connect_args = {}
if "sslmode" not in DATABASE_URL and "localhost" not in DATABASE_URL:
    connect_args = {"sslmode": "require"}


engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Yield an isolated database session per request and close it automatically
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()