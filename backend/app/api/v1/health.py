import os

from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "healthy",
        "version": os.getenv("GIT_SHA", "dev"),
        "environment": settings.environment,
    }
