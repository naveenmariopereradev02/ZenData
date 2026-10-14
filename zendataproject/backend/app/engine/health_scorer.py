import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List

def calculate_health_score(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes a comprehensive Data Health Score (0-100%) across 4 pillars:
    1. Completeness (35%): Ratio of non-missing values.
    2. Uniqueness (25%): Absence of duplicate records.
    3. Validity (20%): Sensible ranges, lack of negative financial values, clean text.
    4. Consistency (20%): Absence of extreme statistical anomalies/outliers.
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    total_cells = total_rows * total_cols
    
    if total_rows == 0 or total_cols == 0:
        return {
            "overall_score": 0,
            "grade": "F",
            "pillars": {
                "completeness": 0,
                "uniqueness": 0,
                "validity": 0,
                "consistency": 0,
            },
            "summary": {
                "total_rows": 0,
                "total_cols": 0,
                "total_cells": 0,
                "missing_cells": 0,
                "duplicate_rows": 0,
            },
            "issues": [{
                "id": "empty_dataset",
                "severity": "CRITICAL",
                "title": "Empty Dataset",
                "description": "Uploaded dataset contains no data rows.",
                "column": None,
                "impact_count": 0,
                "action": "Upload a non-empty CSV or Excel file."
            }],
            "column_profiles": [],
        }

    issues: List[Dict[str, Any]] = []

    # 1. COMPLETENESS PILLAR
    missing_cells = int(df.isna().sum().sum())
    completeness_score = max(0.0, 100.0 * (1.0 - (missing_cells / total_cells)))
    
    # Check column-specific nulls
    null_cols = []
    for col in df.columns:
        col_nulls = int(df[col].isna().sum())
        if col_nulls > 0:
            null_pct = round((col_nulls / total_rows) * 100, 1)
            null_cols.append({"column": col, "null_count": col_nulls, "null_pct": null_pct})
            severity = "CRITICAL" if null_pct > 25 else ("WARNING" if null_pct > 5 else "INFO")
            issues.append({
                "id": f"missing_{col}",
                "severity": severity,
                "title": f"Missing values in '{col}'",
                "description": f"Found {col_nulls} null entries ({null_pct}% of rows).",
                "column": col,
                "impact_count": col_nulls,
                "action": "ZenData can impute medians for numeric or mode for categorical columns."
            })

    # 2. UNIQUENESS PILLAR
    duplicate_rows = int(df.duplicated().sum())
    uniqueness_score = max(0.0, 100.0 * (1.0 - (duplicate_rows / total_rows)))
    if duplicate_rows > 0:
        dup_pct = round((duplicate_rows / total_rows) * 100, 1)
        issues.append({
            "id": "duplicate_rows",
            "severity": "CRITICAL" if dup_pct > 5 else "WARNING",
            "title": f"Duplicate Records Detected",
            "description": f"Identified {duplicate_rows} exact duplicate rows ({dup_pct}%).",
            "column": None,
            "impact_count": duplicate_rows,
            "action": "Deduplicate in one click to retain clean unique records."
        })

    # 3. VALIDITY PILLAR
    SENTINEL_PLACEHOLDERS = {"?", "not given", "none", "nan", "null", "n/a", "na", "-", "--", "undefined", "unknown", "0000000000", "00/00/0000", "test", "nil", "empty", "yesterday"}
    non_negative_keywords = ["savings", "saving", "balance", "age", "income", "salary", "price", "amount", "cost", "revenue", "count", "quantity", "lkr", "rs", "rating", "total", "qty"]
    validity_penalty_points = 0.0
    total_validity_checks = 0

    # 3.1 Detect sentinel / pseudo-null placeholders
    for col in df.columns:
        s_ph = df[col].dropna().astype(str).str.strip().str.lower()
        ph_mask = s_ph.isin(SENTINEL_PLACEHOLDERS)
        ph_count = int(ph_mask.sum())
        if ph_count > 0:
            total_validity_checks += 1
            validity_penalty_points += min(1.0, (ph_count / total_rows) * 2.0)
            issues.append({
                "id": f"placeholders_{col}",
                "severity": "WARNING",
                "title": f"Invalid Sentinel Placeholders in '{col}'",
                "description": f"Found {ph_count} pseudo-null placeholder entries (e.g., 'not given', '?', or fake zeros).",
                "column": col,
                "impact_count": ph_count,
                "action": "Purge placeholder strings and impute with valid statistical values."
            })

    # 3.2 Detect negative values in numeric OR string/object financial columns
    for col in df.columns:
        col_lower = str(col).lower()
        if any(keyword in col_lower for keyword in non_negative_keywords):
            total_validity_checks += 1
            if pd.api.types.is_numeric_dtype(df[col]):
                neg_count = int((df[col] < 0).sum())
            else:
                s_neg = df[col].dropna().astype(str).str.strip()
                neg_count = int(s_neg.str.match(r"^-\s*\d+").sum())
            
            if neg_count > 0:
                validity_penalty_points += min(1.0, (neg_count / total_rows) * 2.0)
                issues.append({
                    "id": f"negative_{col}",
                    "severity": "CRITICAL",
                    "title": f"Negative values in field '{col}'",
                    "description": f"Found {neg_count} negative entries where non-negative numbers are expected.",
                    "column": col,
                    "impact_count": neg_count,
                    "action": "Sanitize negative values using abs() or zero out."
                })

    # 3.3 Detect mixed date formats in temporal columns
    for col in df.columns:
        col_l = str(col).lower()
        if "date" in col_l:
            s_date = df[col].dropna().astype(str)
            if len(s_date) > 5:
                has_dash = int(s_date.str.contains("-").sum())
                has_slash = int(s_date.str.contains("/").sum())
                has_word = int(s_date.str.contains(r"[a-zA-Z]", regex=True).sum())
                patterns = (has_dash > 0) + (has_slash > 0) + (has_word > 0)
                if patterns > 1:
                    total_validity_checks += 1
                    validity_penalty_points += 0.5
                    issues.append({
                        "id": f"mixed_dates_{col}",
                        "severity": "WARNING",
                        "title": f"Mixed Date Formats in '{col}'",
                        "description": f"Detected multiple inconsistent date representations (e.g. YYYY-MM-DD, DD/MM/YYYY, text dates).",
                        "column": col,
                        "impact_count": len(s_date),
                        "action": "Standardize all temporal records into standard ISO 8601 (YYYY-MM-DD)."
                    })

    # 3.4 Detect whitespace and casing/typo anomalies in string columns
    string_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()
    for col in string_cols:
        non_nulls = df[col].dropna().astype(str)
        trailing_spaces = non_nulls[non_nulls.str.strip() != non_nulls]
        if len(trailing_spaces) > 0:
            total_validity_checks += 1
            validity_penalty_points += 0.2
            issues.append({
                "id": f"whitespace_{col}",
                "severity": "INFO",
                "title": f"Unsanitized Whitespace in '{col}'",
                "description": f"Detected {len(trailing_spaces)} records with leading/trailing spaces.",
                "column": col,
                "impact_count": len(trailing_spaces),
                "action": "Auto-trim whitespace on one-click clean."
            })

        col_l = str(col).lower()
        if not any(k in col_l for k in ["date", "time", "email", "phone", "id"]):
            s_clean = non_nulls.str.strip()
            if 2 < s_clean.nunique() <= 40:
                unique_lower = s_clean.str.lower().unique()
                case_diff = s_clean.nunique() - len(unique_lower)
                if case_diff > 0:
                    total_validity_checks += 1
                    validity_penalty_points += 0.3
                    issues.append({
                        "id": f"casing_{col}",
                        "severity": "INFO",
                        "title": f"Inconsistent Text Casing in '{col}'",
                        "description": f"Found {case_diff} variant(s) of identical categories due to mixed upper/lower case.",
                        "column": col,
                        "impact_count": len(s_clean),
                        "action": "Standardize to clean Title Case while preserving standard acronyms."
                    })
                
                # Check for near-duplicate typos
                from difflib import SequenceMatcher
                vals = list(s_clean.value_counts().index)
                typo_pairs = []
                for i, v1 in enumerate(vals[:12]):
                    for v2 in vals[i+1:12]:
                        sim = SequenceMatcher(None, v1.lower(), v2.lower()).ratio()
                        if 0.78 <= sim < 1.0 and v1.lower() != v2.lower():
                            typo_pairs.append(f"'{v2}' vs '{v1}'")
                            break
                    if typo_pairs:
                        break
                if typo_pairs:
                    total_validity_checks += 1
                    validity_penalty_points += 0.4
                    issues.append({
                        "id": f"typos_{col}",
                        "severity": "WARNING",
                        "title": f"Near-Duplicate Typos in '{col}'",
                        "description": f"Identified potential typographic variations (e.g. {', '.join(typo_pairs)}).",
                        "column": col,
                        "impact_count": len(s_clean),
                        "action": "Cluster similar categorical strings to majority variants."
                    })

    if total_validity_checks > 0:
        validity_score = max(0.0, 100.0 * (1.0 - (validity_penalty_points / total_validity_checks)))
    else:
        validity_score = 100.0

    # 4. CONSISTENCY & OUTLIERS PILLAR
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    outlier_count_total = 0
    numeric_checks_count = 0
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) > 10:
            numeric_checks_count += 1
            q1 = float(series.quantile(0.25))
            q3 = float(series.quantile(0.75))
            iqr = q3 - q1
            if iqr > 0:
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                outliers = int(((series < lower_bound) | (series > upper_bound)).sum())
                if outliers > 0:
                    outlier_count_total += outliers
                    outlier_pct = round((outliers / len(series)) * 100, 1)
                    if outlier_pct > 10:
                        issues.append({
                            "id": f"outliers_{col}",
                            "severity": "WARNING",
                            "title": f"High statistical outliers in '{col}'",
                            "description": f"{outliers} rows ({outlier_pct}%) lie outside 1.5× IQR [{round(lower_bound, 2)}, {round(upper_bound, 2)}].",
                            "column": col,
                            "impact_count": outliers,
                            "action": "Examine extreme values or cap to normal statistical distribution."
                        })

    if total_rows > 0 and len(numeric_cols) > 0:
        consistency_score = max(0.0, 100.0 * (1.0 - (outlier_count_total / (total_rows * len(numeric_cols)))))
    else:
        consistency_score = 100.0

    # COMPOSITE SCORE (0 - 100)
    overall_score = round(
        (0.35 * completeness_score) +
        (0.25 * uniqueness_score) +
        (0.20 * validity_score) +
        (0.20 * consistency_score),
        1
    )

    if overall_score >= 90:
        grade = "A"
    elif overall_score >= 80:
        grade = "B"
    elif overall_score >= 70:
        grade = "C"
    elif overall_score >= 60:
        grade = "D"
    else:
        grade = "F"

    # COLUMN PROFILES
    column_profiles = []
    for col in df.columns:
        s = df[col]
        null_count = int(s.isna().sum())
        null_pct = round((null_count / total_rows) * 100, 1) if total_rows > 0 else 0
        unique_cnt = int(s.nunique())
        
        # Determine human-friendly data type
        if pd.api.types.is_numeric_dtype(s):
            col_type = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(s):
            col_type = "datetime"
        elif pd.api.types.is_bool_dtype(s):
            col_type = "boolean"
        else:
            col_type = "categorical"

        profile: Dict[str, Any] = {
            "name": str(col),
            "type": col_type,
            "raw_dtype": str(s.dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": unique_cnt,
            "sample_values": [str(x) for x in s.dropna().head(4).tolist()],
        }

        # Calculate numerical statistics if applicable
        if col_type == "numeric":
            clean_s = s.dropna()
            if len(clean_s) > 0:
                profile["stats"] = {
                    "min": float(clean_s.min()) if not math.isnan(clean_s.min()) else None,
                    "max": float(clean_s.max()) if not math.isnan(clean_s.max()) else None,
                    "mean": round(float(clean_s.mean()), 2) if not math.isnan(clean_s.mean()) else None,
                    "median": round(float(clean_s.median()), 2) if not math.isnan(clean_s.median()) else None,
                }
        column_profiles.append(profile)

    return {
        "overall_score": overall_score,
        "grade": grade,
        "pillars": {
            "completeness": round(completeness_score, 1),
            "uniqueness": round(uniqueness_score, 1),
            "validity": round(validity_score, 1),
            "consistency": round(consistency_score, 1),
        },
        "summary": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "total_cells": total_cells,
            "missing_cells": missing_cells,
            "duplicate_rows": duplicate_rows,
            "outlier_cells": outlier_count_total,
        },
        "issues": sorted(issues, key=lambda x: (0 if x["severity"] == "CRITICAL" else (1 if x["severity"] == "WARNING" else 2))),
        "column_profiles": column_profiles,
    }
