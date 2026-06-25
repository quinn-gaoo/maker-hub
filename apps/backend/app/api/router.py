from fastapi import APIRouter

from app.api.routes import admin, auth, comments, feedback, projects, stats, tags, uploads, users

api_router = APIRouter()
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(auth.router, tags=["auth"])
api_router.include_router(projects.router, tags=["projects"])
api_router.include_router(stats.router, tags=["stats"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(tags.router, tags=["tags"])
api_router.include_router(comments.router, tags=["comments"])
api_router.include_router(uploads.router, tags=["uploads"])
api_router.include_router(feedback.router, tags=["feedback"])
