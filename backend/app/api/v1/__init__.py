from fastapi import APIRouter

from app.api.v1 import content, exam, practice

api_router = APIRouter()
api_router.include_router(content.router)
api_router.include_router(practice.router)
api_router.include_router(exam.router)
