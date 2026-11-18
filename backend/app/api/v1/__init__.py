from fastapi import APIRouter

from app.api.v1 import auth, content, exam, practice, progress, teacher

api_router = APIRouter()
api_router.include_router(content.router)
api_router.include_router(practice.router)
api_router.include_router(exam.router)
api_router.include_router(auth.router)
api_router.include_router(progress.router)
api_router.include_router(teacher.router)
