import os
import json
from datetime import datetime
import numpy as np
import pandas as pd
from pydantic import BaseModel
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from app.engine.cleaning_rules import auto_clean_dataframe
from app.engine.health_scorer import calculate_health_score
from app.engine.analyzer import generate_analytics

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

class CleanRequest(BaseModel):
    session_id: str
    options: Optional[Dict[str, Any]] = None

class EditCellRequest(BaseModel):
    session_id: str
    row_index: int
    column: str
    new_value: Any
    target: Optional[str] = "clean"

@router.post("/clean")
async def clean_dataset(payload: CleanRequest):
    """
    Applies automated cleaning recipes on the session dataset, produces
    an audit log, calculates the improved health score, and updates analytics.
    """
    raw_path = os.path.join(STORAGE_DIR, f"{payload.session_id}_raw.pkl")
    if not os.path.exists(raw_path):
        raise HTTPException(
            status_code=404,
            detail="Session dataset not found or expired. Please upload the file again."
        )

    try:
        raw_df = pd.read_pickle(raw_path)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read cached dataset: {str(e)}"
        )

    # Execute cleaning pipeline
    cleaned_df, audit_log, new_health, comparison = auto_clean_dataframe(
        raw_df, payload.options or {}
    )

    # Save cleaned dataset
    clean_path = os.path.join(STORAGE_DIR, f"{payload.session_id}_clean.pkl")
    cleaned_df.to_pickle(clean_path)

    # Save / Update session metadata
    meta_path = os.path.join(STORAGE_DIR, f"{payload.session_id}_meta.json")
    try:
        meta = {}
        if os.path.exists(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        meta["cleaned_at"] = datetime.utcnow().isoformat()
        meta["audit_log"] = audit_log
        meta["new_health"] = new_health
        meta["comparison"] = comparison
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f)
    except Exception:
        pass

    # Generate updated analytics on clean data
    new_analytics = generate_analytics(cleaned_df)

    # Clean preview rows
    clean_preview_df = cleaned_df.head(30).astype(object).fillna("")
    clean_preview_rows = clean_preview_df.to_dict(orient="records")

    return {
        "session_id": payload.session_id,
        "audit_log": audit_log,
        "new_health_score": new_health,
        "comparison": comparison,
        "cleaned_preview_rows": clean_preview_rows,
        "cleaned_columns": [str(c) for c in cleaned_df.columns],
        "analytics": new_analytics,
    }

@router.post("/clean/edit-cell")
@router.post("/edit-cell")
async def edit_cell(payload: EditCellRequest):
    """
    Direct human-in-the-loop cell edit.
    Updates an individual cell in either the raw or cleaned DataFrame,
    re-computes Data Health Score, recalculates visual analytics, and updates previews.
    """
    clean_path = os.path.join(STORAGE_DIR, f"{payload.session_id}_clean.pkl")
    raw_path = os.path.join(STORAGE_DIR, f"{payload.session_id}_raw.pkl")

    target_mode = payload.target or "clean"
    target_path = clean_path if (target_mode == "clean" and os.path.exists(clean_path)) else raw_path

    if not os.path.exists(target_path):
        raise HTTPException(
            status_code=404,
            detail="Session dataset not found or expired. Please upload the file again."
        )

    try:
        df = pd.read_pickle(target_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read dataset: {str(e)}")

    if payload.column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{payload.column}' does not exist in dataset.")

    if payload.row_index < 0 or payload.row_index >= len(df):
        raise HTTPException(status_code=400, detail=f"Row index {payload.row_index} out of bounds (0 to {len(df)-1}).")

    # Type coercion according to column dtype
    col_series = df[payload.column]
    raw_val = payload.new_value
    
    if raw_val is None or raw_val == "" or str(raw_val).strip().lower() in ["null", "none", "nan"]:
        parsed_val = np.nan
    elif pd.api.types.is_numeric_dtype(col_series):
        try:
            parsed_val = float(raw_val)
            if pd.api.types.is_integer_dtype(col_series) and parsed_val.is_integer():
                parsed_val = int(parsed_val)
        except (ValueError, TypeError):
            parsed_val = raw_val
    elif pd.api.types.is_bool_dtype(col_series):
        parsed_val = str(raw_val).strip().lower() in ["true", "1", "yes", "t"]
    else:
        parsed_val = str(raw_val)

    # Assign directly to DataFrame at specific row and column
    df.iat[payload.row_index, df.columns.get_loc(payload.column)] = parsed_val

    # Save back to pickle
    df.to_pickle(target_path)

    # Re-calculate health score & analytics
    new_health = calculate_health_score(df)
    new_analytics = generate_analytics(df)

    preview_df = df.head(30).astype(object).fillna("")
    preview_rows = preview_df.to_dict(orient="records")

    return {
        "status": "success",
        "session_id": payload.session_id,
        "row_index": payload.row_index,
        "column": payload.column,
        "new_value": "" if pd.isna(parsed_val) else parsed_val,
        "target": "clean" if target_path == clean_path else "raw",
        "health_score": new_health,
        "analytics": new_analytics,
        "preview_rows": preview_rows,
        "columns": [str(c) for c in df.columns],
    }
