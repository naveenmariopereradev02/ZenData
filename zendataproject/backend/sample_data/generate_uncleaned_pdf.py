import os
import pandas as pd
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

def build_pdf(output_path: str):
    # Setup document
    doc = SimpleDocTemplate(
        output_path,
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
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A')
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748B')
    )

    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )

    badge_crit = ParagraphStyle(
        'CritBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#991B1B')
    )

    badge_warn = ParagraphStyle(
        'WarnBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#92400E')
    )

    badge_info = ParagraphStyle(
        'InfoBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1E40AF')
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

    cell_dirty_style = ParagraphStyle(
        'TableCellDirty',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#DC2626')
    )

    story = []

    # Header Banner
    header_data = [
        [
            Paragraph("<b>ZenData</b> | Automated Data Cleaning Platform", title_style),
            Paragraph("<b>STATUS:</b> <font color='#DC2626'>DIRTY / UNCLEANED</font><br/><b>Target:</b> FinSight Lanka Dataset", ParagraphStyle('RAlign', parent=subtitle_style, alignment=2))
        ]
    ]
    t_header = Table(header_data, colWidths=[520, 200])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 6))
    story.append(Paragraph("<b>INTERVIEW ARTIFACT:</b> Raw uncleaned financial customer records demonstrating automated anomaly detection, deduplication, imputation, and sanitization.", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=12))

    # Executive Summary & Health Card
    story.append(Paragraph("1. Data Health & Anomaly Audit Summary", h1_style))
    
    score_cards = [
        [
            Paragraph("<b>Overall Quality</b><br/><font size=16 color='#D97706'><b>92.3% (Grade A-)</b></font><br/><font size=7 color='#64748B'>Penalized by validity & duplicates</font>", body_style),
            Paragraph("<b>Completeness</b><br/><font size=16 color='#059669'><b>97.5%</b></font><br/><font size=7 color='#64748B'>5 missing cells out of 198</font>", body_style),
            Paragraph("<b>Uniqueness</b><br/><font size=16 color='#DC2626'><b>90.9%</b></font><br/><font size=7 color='#64748B'>2 exact duplicate records (9.1%)</font>", body_style),
            Paragraph("<b>Validity</b><br/><font size=16 color='#DC2626'><b>78.8%</b></font><br/><font size=7 color='#64748B'>7 negative savings balances</font>", body_style),
            Paragraph("<b>Consistency</b><br/><font size=16 color='#059669'><b>98.5%</b></font><br/><font size=7 color='#64748B'>1 statistical outlier</font>", body_style)
        ]
    ]
    t_cards = Table(score_cards, colWidths=[144, 144, 144, 144, 144])
    t_cards.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_cards)
    story.append(Spacer(1, 12))

    # Issues Breakdown Table
    story.append(Paragraph("2. Flagged Data Hygiene Anomalies (Detected by ZenData)", h1_style))
    
    issues_table_data = [
        [
            Paragraph("Severity", th_style),
            Paragraph("Anomaly Type", th_style),
            Paragraph("Affected Field", th_style),
            Paragraph("Impact / Dirty Details", th_style),
            Paragraph("ZenData Automated Remediation", th_style)
        ],
        [
            Paragraph("CRITICAL", badge_crit),
            Paragraph("Exact Duplicate Records", body_bold),
            Paragraph("Entire Row", body_style),
            Paragraph("<b>2 duplicate rows:</b> CUST-1001 (Kasun) and CUST-1003 (Dilshan) repeated", body_style),
            Paragraph("One-click deduplication retains the primary unique instance.", body_style)
        ],
        [
            Paragraph("CRITICAL", badge_crit),
            Paragraph("Negative Financial Balances", body_bold),
            Paragraph("savings_balance", body_style),
            Paragraph("<b>7 negative balances:</b> -2500, -1500, -800, -3200, -500 (savings cannot be < 0)", body_style),
            Paragraph("Sanitize to zero or absolute positive magnitude.", body_style)
        ],
        [
            Paragraph("WARNING", badge_warn),
            Paragraph("Missing Demographic Data", body_bold),
            Paragraph("age", body_style),
            Paragraph("<b>2 null values:</b> Rohan Wickramasinghe, Pooja Ranasinghe missing age", body_style),
            Paragraph("Impute robust statistical median age (26 years).", body_style)
        ],
        [
            Paragraph("WARNING", badge_warn),
            Paragraph("Missing Financial Balances", body_bold),
            Paragraph("savings_balance", body_style),
            Paragraph("<b>2 null values:</b> Sanduni Mendis, Ruwan Dissanayake missing balance", body_style),
            Paragraph("Impute median positive balance across peer risk profile.", body_style)
        ],
        [
            Paragraph("INFO", badge_info),
            Paragraph("Missing Income Data", body_bold),
            Paragraph("monthly_income", body_style),
            Paragraph("<b>1 null value:</b> Sajith Bandara (Anuradhapura) has blank income", body_style),
            Paragraph("Impute median monthly income (Rs. 58,000).", body_style)
        ],
        [
            Paragraph("INFO", badge_info),
            Paragraph("Whitespace & Padding", body_bold),
            Paragraph("city", body_style),
            Paragraph("<b>4 entries with dirty spacing:</b> ' Colombo ', ' Colombo'", body_style),
            Paragraph("Automated regex strip removes leading/trailing spaces.", body_style)
        ],
    ]
    t_issues = Table(issues_table_data, colWidths=[65, 130, 85, 230, 210])
    t_issues.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_issues)

    # Page Break to show the full raw dirty dataset
    story.append(PageBreak())

    # Raw Dirty Dataset Table
    story.append(Paragraph("3. Complete Uncleaned Raw Dataset (22 Rows × 9 Columns)", h1_style))
    story.append(Paragraph("<i>Red highlighted cells indicate dirty values (duplicates, nulls, negative numbers, untrimmed whitespace) detected prior to cleaning.</i>", subtitle_style))
    story.append(Spacer(1, 8))

    csv_path = os.path.join(os.path.dirname(__file__), 'finsight_dirty_customers.csv')
    df = pd.read_csv(csv_path)

    table_data = [
        [
            Paragraph("#", th_style),
            Paragraph("Customer ID", th_style),
            Paragraph("Full Name", th_style),
            Paragraph("Age", th_style),
            Paragraph("Gender", th_style),
            Paragraph("City", th_style),
            Paragraph("Monthly Inc (LKR)", th_style),
            Paragraph("Savings Bal (LKR)", th_style),
            Paragraph("Risk", th_style),
            Paragraph("Status", th_style),
        ]
    ]

    seen_ids = set()
    dup_indices = []

    for idx, row in df.iterrows():
        cid = str(row['customer_id'])
        is_dup = False
        if cid in seen_ids:
            is_dup = True
            dup_indices.append(idx)
        else:
            seen_ids.add(cid)

        # check age
        age_str = str(int(row['age'])) if pd.notna(row['age']) else "MISSING [NULL]"
        age_p = Paragraph(age_str, cell_dirty_style if pd.isna(row['age']) else cell_style)

        # check city whitespace
        city_raw = str(row['city'])
        has_ws = city_raw != city_raw.strip()
        city_str = f"'{city_raw}' [SPACES]" if has_ws else city_raw
        city_p = Paragraph(city_str, cell_dirty_style if has_ws else cell_style)

        # check income
        inc_str = f"{int(row['monthly_income']):,}" if pd.notna(row['monthly_income']) else "MISSING [NULL]"
        inc_p = Paragraph(inc_str, cell_dirty_style if pd.isna(row['monthly_income']) else cell_style)

        # check savings
        if pd.isna(row['savings_balance']):
            sav_str = "MISSING [NULL]"
            sav_p = Paragraph(sav_str, cell_dirty_style)
        else:
            val = float(row['savings_balance'])
            if val < 0:
                sav_str = f"{int(val):,} [NEGATIVE!]"
                sav_p = Paragraph(sav_str, cell_dirty_style)
            else:
                sav_str = f"{int(val):,}"
                sav_p = Paragraph(sav_str, cell_style)

        cid_text = f"{cid} (DUP!)" if is_dup else cid
        cid_p = Paragraph(cid_text, cell_dirty_style if is_dup else cell_style)
        name_p = Paragraph(str(row['full_name']), cell_dirty_style if is_dup else cell_style)

        row_cells = [
            Paragraph(str(idx + 1), cell_style),
            cid_p,
            name_p,
            age_p,
            Paragraph(str(row['gender']), cell_style),
            city_p,
            inc_p,
            sav_p,
            Paragraph(str(row['risk_rating']), cell_style),
            Paragraph(str(row['account_status']), cell_style),
        ]
        table_data.append(row_cells)

    col_widths = [22, 75, 110, 68, 50, 85, 85, 95, 55, 60]
    t_dataset = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]

    for i in range(1, len(table_data)):
        bg = colors.HexColor('#FEF2F2') if (i-1) in dup_indices else (colors.white if i % 2 == 1 else colors.HexColor('#F8FAFC'))
        t_style.append(('BACKGROUND', (0, i), (-1, i), bg))

    t_dataset.setStyle(TableStyle(t_style))
    story.append(t_dataset)
    story.append(Spacer(1, 10))

    # Interview Talking Points / Value Prop
    interview_box = [
        [
            Paragraph(
                "<b>KEY INTERVIEW TALKING POINTS & DEMO SCRIPT:</b><br/>"
                "• <b>Problem Statement:</b> Raw client spreadsheets typically contain silent corruptions: duplicate keys, inverted signs, missing records, and trailing spaces that break relational joins and machine learning pipelines.<br/>"
                "• <b>ZenData Solution:</b> Drop this file into ZenData (or click 'Load FinSight Demo' on the homepage). ZenData flags a 92.3% health score and categorizes all 6 hygiene issues.<br/>"
                "• <b>One-Click Cleaning:</b> ZenData deduplicates the dataset (from 22 to 20 clean rows), imputes medians, eliminates negative balances, and strips strings — producing an audit-logged 100% clean dataset ready for export in CSV or Excel.",
                body_style
            )
        ]
    ]
    t_box = Table(interview_box, colWidths=[720])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#93C5FD')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_box)

    doc.build(story)
    print(f"Successfully created PDF at: {output_path}")

if __name__ == '__main__':
    backend_sample_dir = os.path.dirname(os.path.abspath(__file__))
    doc_dir = os.path.abspath(os.path.join(backend_sample_dir, '../../..', 'Documentation'))
    
    out1 = os.path.join(backend_sample_dir, 'FinSight_Uncleaned_Data_Audit_Report.pdf')
    out2 = os.path.join(doc_dir, 'FinSight_Uncleaned_Data_Audit_Report.pdf')
    
    build_pdf(out1)
    build_pdf(out2)
