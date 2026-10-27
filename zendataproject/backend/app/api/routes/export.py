import os
import io
import json
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, JSONResponse
from app.engine.report_generator import generate_pdf_audit_report
from app.engine.excel_export import generate_multi_sheet_excel
from app.engine.health_scorer import calculate_health_score

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")

def _load_session_data(session_id: str):
    clean_path = os.path.join(STORAGE_DIR, f"{session_id}_clean.pkl")
    raw_path = os.path.join(STORAGE_DIR, f"{session_id}_raw.pkl")
    meta_path = os.path.join(STORAGE_DIR, f"{session_id}_meta.json")

    target_path = clean_path if os.path.exists(clean_path) else raw_path
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    df = pd.read_pickle(target_path)
    
    meta = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        except Exception:
            pass

    # Ensure meta has health score if not already present
    if "new_health" not in meta:
        meta["new_health"] = calculate_health_score(df)
    if "initial_health" not in meta:
        meta["initial_health"] = meta["new_health"]

    prefix = "cleaned" if os.path.exists(clean_path) else "raw"
    return df, meta, prefix

@router.get("/export/{session_id}/csv")
async def export_csv(session_id: str):
    """
    Downloads the cleaned dataset as a CSV file.
    """
    df, _, prefix = _load_session_data(session_id)
    
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    csv_bytes = stream.getvalue().encode("utf-8")

    filename = f"zendata_{prefix}_{session_id[:8]}.csv"

    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.get("/export/{session_id}/pdf")
async def export_pdf(session_id: str):
    """
    Generates and downloads the Executive Data Quality & Audit Report PDF.
    """
    df, meta, prefix = _load_session_data(session_id)

    try:
        pdf_bytes = generate_pdf_audit_report(session_id, df, meta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {str(e)}")

    filename = f"zendata_audit_report_{session_id[:8]}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.get("/export/{session_id}/excel")
async def export_excel(session_id: str):
    """
    Generates and downloads a styled multi-sheet Excel workbook:
    - Sheet 1: Cleaned Data
    - Sheet 2: Audit Changelog
    - Sheet 3: Quality Metrics
    """
    df, meta, prefix = _load_session_data(session_id)

    try:
        excel_bytes = generate_multi_sheet_excel(df, meta)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel workbook: {str(e)}")

    filename = f"zendata_{prefix}_{session_id[:8]}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@router.get("/export/{session_id}/json")
async def export_json(session_id: str):
    """
    Downloads structured dataset JSON including records, schema metadata, and audit log.
    """
    df, meta, prefix = _load_session_data(session_id)

    records = df.fillna("").to_dict(orient="records")
    payload = {
        "session_id": session_id,
        "filename": meta.get("filename", f"zendata_{prefix}.json"),
        "status": prefix,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": [str(c) for c in df.columns],
        "health_score": meta.get("new_health", {}),
        "audit_log": meta.get("audit_log", []),
        "comparison": meta.get("comparison", {}),
        "data": records
    }

    filename = f"zendata_{prefix}_{session_id[:8]}.json"

    return Response(
        content=json.dumps(payload, indent=2).encode("utf-8"),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
