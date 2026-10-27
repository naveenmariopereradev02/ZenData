import io
import pandas as pd
from typing import Dict, Any
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

def generate_multi_sheet_excel(
    df: pd.DataFrame,
    meta: Dict[str, Any]
) -> bytes:
    """
    Generates a professional 3-sheet Excel workbook:
    1. Cleaned Data
    2. Audit Changelog
    3. Health & Metrics
    Returns binary bytes of the .xlsx file.
    """
    output = io.BytesIO()

    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # 1. Cleaned Data Sheet
        df.to_excel(writer, sheet_name='Cleaned Data', index=False)

        # 2. Audit Changelog Sheet
        audit_log = meta.get("audit_log", [])
        if audit_log:
            changelog_data = []
            for i, item in enumerate(audit_log, 1):
                changelog_data.append({
                    "Step": i,
                    "Action Type": item.get("type", "TRANSFORMATION"),
                    "Target Column": item.get("column", "—") or "—",
                    "Affected Rows": item.get("affected_rows", 0),
                    "Description": item.get("description", ""),
                    "Technical Details": str(item.get("details", "")) if item.get("details") else ""
                })
            changelog_df = pd.DataFrame(changelog_data)
        else:
            changelog_df = pd.DataFrame([{"Message": "No automated transformations applied."}])
        
        changelog_df.to_excel(writer, sheet_name='Audit Changelog', index=False)

        # 3. Quality Metrics Sheet
        initial_health = meta.get("initial_health", {})
        new_health = meta.get("new_health", initial_health)
        comparison = meta.get("comparison", {})

        metrics_data = [
            {"Metric": "Dataset Filename", "Value": meta.get("filename", "dataset.csv")},
            {"Metric": "Total Rows", "Value": len(df)},
            {"Metric": "Total Columns", "Value": len(df.columns)},
            {"Metric": "Initial Health Score", "Value": f"{initial_health.get('overall_score', 0)}%"},
            {"Metric": "Cleaned Health Score", "Value": f"{new_health.get('overall_score', 0)}%"},
            {"Metric": "Health Grade", "Value": new_health.get("grade", "A")},
            {"Metric": "Completeness Pillar", "Value": f"{new_health.get('pillars', {}).get('completeness', 0)}%"},
            {"Metric": "Uniqueness Pillar", "Value": f"{new_health.get('pillars', {}).get('uniqueness', 0)}%"},
            {"Metric": "Validity Pillar", "Value": f"{new_health.get('pillars', {}).get('validity', 0)}%"},
            {"Metric": "Consistency Pillar", "Value": f"{new_health.get('pillars', {}).get('consistency', 0)}%"},
            {"Metric": "Duplicates Purged", "Value": comparison.get("duplicates_removed", 0)},
            {"Metric": "Negative Balances Fixed", "Value": comparison.get("negatives_fixed", 0)},
            {"Metric": "Missing Cells Imputed", "Value": comparison.get("missing_imputed_count", 0)},
        ]
        metrics_df = pd.DataFrame(metrics_data)
        metrics_df.to_excel(writer, sheet_name='Quality Metrics', index=False)

        # Style Worksheets
        wb = writer.book

        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        accent_fill = PatternFill(start_color="059669", end_color="059669", fill_type="solid")
        
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        # Format Sheet 1
        ws1 = wb['Cleaned Data']
        ws1.freeze_panes = 'A2'
        for cell in ws1[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
        
        # Format Sheet 2
        ws2 = wb['Audit Changelog']
        ws2.freeze_panes = 'A2'
        for cell in ws2[1]:
            cell.fill = accent_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Format Sheet 3
        ws3 = wb['Quality Metrics']
        for cell in ws3[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        # Auto-adjust column widths for all sheets
        for ws in [ws1, ws2, ws3]:
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    if cell.row > 100: # check first 100 rows for speed
                        break
                    cell.border = thin_border
                    val_str = str(cell.value or '')
                    if len(val_str) > max_len:
                        max_len = len(val_str)
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    output.seek(0)
    return output.getvalue()
