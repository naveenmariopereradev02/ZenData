# 📡 ZenData REST API Specification

ZenData exposes a robust, high-performance REST API built with FastAPI, adhering strictly to OpenAPI 3.1 standards.

**Base URLs:**
- **Local:** `http://localhost:8000`
- **Production Cloud:** `https://zendata-backend.onrender.com`
- **Interactive Swagger UI:** `https://zendata-backend.onrender.com/docs`
- **Redoc Documentation:** `https://zendata-backend.onrender.com/redoc`

---

## Endpoints Overview

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint returning service status |
| `POST` | `/api/v1/upload` | Upload CSV or Excel file for automated quality audit |
| `POST` | `/api/v1/clean` | Apply selected cleaning recipes and generate audit log |
| `POST` | `/api/v1/clean/edit-cell` | Direct inline cell edit with real-time score recalculation |
| `GET` | `/api/v1/export/{session_id}/{format}` | Download cleaned data in PDF, Excel, CSV, or JSON format |

---

## 1. Health Check

### `GET /api/health`
Verifies whether the backend engine is running and responsive.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## 2. Upload & Health Audit

### `POST /api/v1/upload`
Uploads a `.csv`, `.xlsx`, or `.xls` file. The server computes the initial 4-Pillar Data Health Score, profiles column schemas, and generates summary distributions.

**Request:**
- `Content-Type: multipart/form-data`
- `file`: Binary file upload (Max 25 MB)

**Response:**
```json
{
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "filename": "ceylonry_pos_sales_uncleaned.csv",
  "size_bytes": 48076,
  "total_rows": 302,
  "total_cols": 17,
  "health_score": {
    "overall_score": 93.9,
    "grade": "A",
    "pillars": {
      "completeness": 96.4,
      "uniqueness": 95.4,
      "validity": 81.5,
      "consistency": 100.0
    },
    "summary": {
      "total_rows": 302,
      "total_cols": 17,
      "total_cells": 5134,
      "missing_cells": 184,
      "duplicate_rows": 14,
      "outlier_cells": 0
    },
    "issues": [
      {
        "id": "duplicate_rows",
        "severity": "CRITICAL",
        "title": "Duplicate Records Detected",
        "description": "Identified 14 exact duplicate rows (4.6%).",
        "column": null,
        "impact_count": 14,
        "action": "Deduplicate in one click to retain clean unique records."
      }
    ],
    "column_profiles": [ ... ]
  },
  "preview_rows": [ ... ],
  "columns": [ ... ],
  "analytics": { ... }
}
```

---

## 3. Automated Cleaning

### `POST /api/v1/clean`
Executes automated cleaning rules according to selected user options.

**Request:**
- `Content-Type: application/json`

```json
{
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "options": {
    "deduplicate": true,
    "impute_missing": "median",
    "fix_negatives": true,
    "strip_whitespace": true,
    "normalize_headers": true,
    "replace_placeholders": true,
    "coerce_numerics": true,
    "standardize_dates": true,
    "standardize_booleans": true,
    "standardize_text_case": true,
    "fuzzy_typo_fix": true,
    "approved_issues": ["duplicate_rows", "negative_qty", "casing_category"],
    "skipped_issues": []
  }
}
```

**Response:**
```json
{
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "audit_log": [
    {
      "type": "DEDUPLICATION",
      "column": null,
      "affected_rows": 14,
      "description": "Removed 14 exact duplicate row(s).",
      "details": "Eliminated identical records."
    }
  ],
  "new_health_score": {
    "overall_score": 98.2,
    "grade": "A",
    "pillars": { ... }
  },
  "comparison": {
    "initial_rows": 302,
    "final_rows": 288,
    "duplicates_removed": 14,
    "negatives_fixed": 2,
    "initial_missing_cells": 184,
    "final_missing_cells": 80,
    "rows_needing_review": 24
  },
  "cleaned_preview_rows": [ ... ],
  "cleaned_columns": [ ... ],
  "analytics": { ... }
}
```

---

## 4. Human-in-the-Loop Cell Edit

### `POST /api/v1/clean/edit-cell`
Allows real-time inline updates to individual cells. Automatically updates the underlying dataset and recalculates the Data Health Score.

**Request:**
```json
{
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "row_index": 0,
  "column": "category",
  "new_value": "Dairy",
  "target": "clean"
}
```

**Response:**
```json
{
  "status": "success",
  "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "row_index": 0,
  "column": "category",
  "new_value": "Dairy",
  "target": "clean",
  "health_score": { ... },
  "analytics": { ... },
  "preview_rows": [ ... ],
  "columns": [ ... ]
}
```

---

## 5. Multi-Format Export Hub

### `GET /api/v1/export/{session_id}/{format}`

Downloads the cleaned dataset in the requested format:
- `pdf`: Executive Quality Scorecard via ReportLab (`application/pdf`)
- `excel`: 3-Sheet formatted workbook via OpenPyXL (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- `csv`: UTF-8 comma-separated dataset (`text/csv`)
- `json`: Structured dataset with audit metadata (`application/json`)
