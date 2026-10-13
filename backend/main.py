from database import Base, engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.exam_router import router as exam_router
from routers.admin_router import router as admin_router
from routers.academic_router import router as academic_router
from routers import parent_router


# Import all models to ensure complete SQLAlchemy metadata registration
import models.academic
import models.question
import models.exam
import models.user  # Register user models
from routers.auth_router import router as auth_router

# Initialize tables in PostgreSQL
Base.metadata.create_all(bind=engine)

app = FastAPI(title="I'm Ready For Exam API", version="2.0")

# Enable CORS for the Vite React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(exam_router)
app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(academic_router)
app.include_router(parent_router.router)

# API health check endpoint
@app.get("/")
def health_check():
    return {"status": "healthy", "service": "I'm Ready For Exam API v2.0"}