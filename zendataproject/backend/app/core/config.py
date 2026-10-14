from pydantic import BaseModel
from typing import List

class Settings(BaseModel):
    PROJECT_NAME: str = "ZenData Core API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS Origins (Allow local Next.js frontend)
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
    ]
    
    # File upload constraints
    MAX_UPLOAD_SIZE_MB: int = 25  # 25 MB max for Freemium
    ALLOWED_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls"]

settings = Settings()
