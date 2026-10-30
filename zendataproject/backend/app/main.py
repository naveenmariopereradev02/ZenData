from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import upload, clean, export

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="ZenData: Automated Data Cleaning & Analytics Engine"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(upload.router, prefix=settings.API_V1_STR, tags=["Upload & Health"])
app.include_router(clean.router, prefix=settings.API_V1_STR, tags=["Cleaning"])
app.include_router(export.router, prefix=settings.API_V1_STR, tags=["Export"])

@app.get("/")
def root():
    return {
        "app": "ZenData Core API",
        "status": "online",
        "docs": "/docs",
        "version": settings.VERSION
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
