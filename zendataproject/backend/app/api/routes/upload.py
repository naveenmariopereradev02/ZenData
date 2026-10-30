import os
import uuid
import io
import json
from datetime import datetime
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.core.config import settings
from app.engine.health_scorer import calculate_health_score
from app.engine.analyzer import generate_analytics

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(STORAGE_DIR, exist_ok=True)

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """
    Receives an uploaded CSV or Excel file, parses it, calculates
    the initial Data Health Score, generates summary analytics, and stores it in session cache.
    """
    filename = file.filename or "dataset.csv"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Please upload a .csv, .xlsx, or .xls file."
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        if ext == ".csv":
            try:
                df = pd.read_csv(io.BytesIO(content))
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(content), encoding="latin-1")
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse file: {str(e)}"
        )

    session_id = str(uuid.uuid4())
    
    # Save raw dataset to local storage
    raw_path = os.path.join(STORAGE_DIR, f"{session_id}_raw.pkl")
    df.to_pickle(raw_path)

    # Calculate Data Health Score
    health = calculate_health_score(df)

    # Save session metadata
    meta_path = os.path.join(STORAGE_DIR, f"{session_id}_meta.json")
    try:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "session_id": session_id,
                "filename": filename,
                "size_bytes": len(content),
                "uploaded_at": datetime.utcnow().isoformat(),
                "initial_health": health,
            }, f)
    except Exception:
        pass

    # Generate initial visual analytics
    analytics = generate_analytics(df)

    # Convert preview rows to JSON-safe dictionaries
    preview_df = df.head(30).astype(object).fillna("")
    preview_rows = preview_df.to_dict(orient="records")

    return {
        "session_id": session_id,
        "filename": filename,
        "size_bytes": len(content),
        "total_rows": len(df),
        "total_cols": len(df.columns),
        "health_score": health,
        "preview_rows": preview_rows,
        "columns": [str(c) for c in df.columns],
        "analytics": analytics,
    }
