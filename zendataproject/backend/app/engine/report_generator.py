import os
import io
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)

def generate_pdf_audit_report(
    session_id: str,
    df: pd.DataFrame,
    meta: Dict[str, Any]
) -> bytes:
    """
    Dynamically generates an Executive Data Quality & Audit Report PDF
    using ReportLab, returning binary PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A')
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B')
    )

    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#1E293B')
    )

    badge_crit = ParagraphStyle(
        'CritBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#991B1B')
    )

    badge_warn = ParagraphStyle(
        'WarnBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#92400E')
    )

    badge_info = ParagraphStyle(
        'InfoBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E40AF')
    )

    badge_success = ParagraphStyle(
        'SuccessBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#065F46')
    )

    th_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )

    story = []

    filename = meta.get("filename", "Dataset.csv")
    initial_health = meta.get("initial_health", {})
    new_health = meta.get("new_health", initial_health)
    audit_log = meta.get("audit_log", [])
    comparison = meta.get("comparison", {})
    uploaded_at = meta.get("uploaded_at", "N/A")[:19].replace("T", " ")

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>ZenData</b> | Executive Data Health & Quality Audit Report", title_style),
            Paragraph(
                f"<b>File:</b> {filename}<br/>"
                f"<b>Date:</b> {uploaded_at} UTC<br/>"
                f"<b>Session ID:</b> {session_id[:8]}",
                ParagraphStyle('RAlign', parent=subtitle_style, alignment=2)
            )
        ]
    ]
    t_header = Table(header_data, colWidths=[480, 240])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>CONFIDENTIAL AUDIT REPORT:</b> Automated data hygiene evaluation, anomaly risk analysis, and cleaning transformation record.",
        subtitle_style
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    # 2. Executive Health Score Cards
    story.append(Paragraph("1. Executive Data Health Metrics (Before vs. After Zen Remediation)", h1_style))
    
    init_score = initial_health.get("overall_score", 0)
    final_score = new_health.get("overall_score", init_score)
    grade = new_health.get("grade", "A")

    init_pillars = initial_health.get("pillars", {})
    final_pillars = new_health.get("pillars", init_pillars)

    score_cards = [
        [
            Paragraph(
                f"<b>Overall Health Score</b><br/>"
                f"<font size=14 color='#059669'><b>{final_score}% (Grade {grade})</b></font><br/>"
                f"<font size=7 color='#64748B'>Initial: {init_score}%</font>",
                body_style
            ),
            Paragraph(
                f"<b>Completeness</b><br/>"
                f"<font size=14 color='#1E293B'><b>{final_pillars.get('completeness', 0)}%</b></font><br/>"
                f"<font size=7 color='#64748B'>Nulls resolved</font>",
                body_style
            ),
            Paragraph(
                f"<b>Uniqueness</b><br/>"
                f"<font size=14 color='#1E293B'><b>{final_pillars.get('uniqueness', 0)}%</b></font><br/>"
                f"<font size=7 color='#64748B'>Duplicates removed</font>",
                body_style
            ),
            Paragraph(
                f"<b>Validity</b><br/>"
                f"<font size=14 color='#1E293B'><b>{final_pillars.get('validity', 0)}%</b></font><br/>"
                f"<font size=7 color='#64748B'>Negative signs fixed</font>",
                body_style
            ),
            Paragraph(
                f"<b>Consistency</b><br/>"
                f"<font size=14 color='#1E293B'><b>{final_pillars.get('consistency', 0)}%</b></font><br/>"
                f"<font size=7 color='#64748B'>Outliers checked</font>",
                body_style
            )
        ]
    ]
    t_cards = Table(score_cards, colWidths=[144, 144, 144, 144, 144])
    t_cards.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_cards)
    story.append(Spacer(1, 10))

    # 3. Delta Impact Summary
    if comparison:
        story.append(Paragraph("2. Transformation Impact Summary", h1_style))
        delta_cards = [
            [
                Paragraph(f"<b>Records Purged</b><br/><font size=11 color='#059669'><b>{comparison.get('duplicates_removed', 0)} duplicates</b></font>", body_style),
                Paragraph(f"<b>Negatives Corrected</b><br/><font size=11 color='#059669'><b>{comparison.get('negatives_fixed', 0)} values</b></font>", body_style),
                Paragraph(f"<b>Missing Imputed</b><br/><font size=11 color='#059669'><b>{comparison.get('missing_imputed_count', 0)} cells</b></font>", body_style),
                Paragraph(f"<b>Final Dataset Size</b><br/><font size=11 color='#1E293B'><b>{comparison.get('final_rows', len(df))} rows × {len(df.columns)} cols</b></font>", body_style),
            ]
        ]
        t_delta = Table(delta_cards, colWidths=[180, 180, 180, 180])
        t_delta.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BBF7D0')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BBF7D0')),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(t_delta)
        story.append(Spacer(1, 10))

    # 4. Audit Log Table
    if audit_log:
        story.append(Paragraph(f"3. Applied Cleaning Transformations ({len(audit_log)} Operations)", h1_style))
        log_rows = [
            [
                Paragraph("Step", th_style),
                Paragraph("Operation Type", th_style),
                Paragraph("Target Field", th_style),
                Paragraph("Affected", th_style),
                Paragraph("Description & Details", th_style),
            ]
        ]
        for idx, entry in enumerate(audit_log):
            op_type = entry.get("type", "TRANSFORMATION")
            badge_s = badge_success if op_type != "HUMAN_OVERRIDE" else badge_warn
            details_str = str(entry.get("details", "")) if entry.get("details") else ""
            desc = f"<b>{entry.get('description', '')}</b>"
            if details_str:
                desc += f"<br/><font color='#64748B'>{details_str}</font>"

            log_rows.append([
                Paragraph(str(idx + 1), cell_style),
                Paragraph(op_type, badge_s),
                Paragraph(str(entry.get("column", "—") or "—"), cell_style),
                Paragraph(f"{entry.get('affected_rows', 0)} rows", cell_style),
                Paragraph(desc, cell_style),
            ])

        t_logs = Table(log_rows, colWidths=[35, 120, 95, 70, 400])
        t_logs.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_logs)

    # Page Break for Schema & Cleaned Preview
    story.append(PageBreak())

    # 5. Column Health Profiles Table
    story.append(Paragraph("4. Dataset Schema & Column Health Profiles", h1_style))
    col_profiles = new_health.get("column_profiles", [])
    if col_profiles:
        profile_rows = [
            [
                Paragraph("Field Name", th_style),
                Paragraph("Data Type", th_style),
                Paragraph("Missing Cells", th_style),
                Paragraph("Missing %", th_style),
                Paragraph("Distinct Values", th_style),
                Paragraph("Distribution / Statistical Range", th_style),
            ]
        ]
        for cp in col_profiles[:15]:
            stats = cp.get("stats")
            if stats:
                range_str = f"Min: {stats.get('min'):,.0f} | Max: {stats.get('max'):,.0f} | Mean: {stats.get('mean'):,.1f}"
            else:
                sample = ", ".join(cp.get("sample_values", [])[:3])
                range_str = f"Sample: {sample}" if sample else "—"

            profile_rows.append([
                Paragraph(str(cp.get("name")), body_bold),
                Paragraph(str(cp.get("type", "text")).upper(), cell_style),
                Paragraph(str(cp.get("null_count", 0)), cell_style),
                Paragraph(f"{cp.get('null_pct', 0)}%", cell_style),
                Paragraph(str(cp.get("unique_count", 0)), cell_style),
                Paragraph(range_str, cell_style),
            ])

        t_prof = Table(profile_rows, colWidths=[120, 75, 75, 65, 85, 300])
        t_prof.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_prof)
        story.append(Spacer(1, 10))

    # 6. Sample Cleaned Data Records (First 15 Rows)
    story.append(Paragraph(f"5. Cleaned Records Preview (First {min(15, len(df))} of {len(df)} Rows)", h1_style))
    preview_cols = list(df.columns)[:8] # Max 8 columns to fit landscape width
    table_headers = [Paragraph("#", th_style)] + [Paragraph(str(c), th_style) for c in preview_cols]
    
    col_width_each = int(680 / max(len(preview_cols), 1))
    col_widths = [25] + [col_width_each] * len(preview_cols)

    preview_table_data = [table_headers]
    for r_idx, (_, row) in enumerate(df.head(15).iterrows()):
        row_cells = [Paragraph(str(r_idx + 1), cell_style)]
        for col in preview_cols:
            val = row[col]
            v_str = "" if pd.isna(val) else str(val)[:25]
            row_cells.append(Paragraph(v_str, cell_style))
        preview_table_data.append(row_cells)

    t_data_prev = Table(preview_table_data, colWidths=col_widths)
    t_data_prev.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_data_prev)
    story.append(Spacer(1, 10))

    # 7. Compliance Statement
    story.append(Paragraph(
        "<i>ZenData Engine • Certified Automated Data Audit & Hygiene Pipeline • Generated for Financial & Analytical Compliance.</i>",
        subtitle_style
    ))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
