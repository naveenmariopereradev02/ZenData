import numpy as np
import pandas as pd
from typing import Dict, Any, List

def generate_analytics(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes visual dashboard aggregations, KPIs, distributions, and domain insights.
    """
    if len(df) == 0:
        return {"kpis": [], "distributions": [], "categories": []}

    total_rows = len(df)
    kpis: List[Dict[str, Any]] = [
        {
            "id": "total_records",
            "title": "Total Records",
            "value": f"{total_rows:,}",
            "subtitle": f"{len(df.columns)} Columns Processed",
            "trend": "neutral"
        }
    ]

    # Numeric Columns Analytics (Histograms & Averages)
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    distributions: List[Dict[str, Any]] = []

    for col in numeric_cols[:4]: # Top 4 numeric columns for charts
        s = df[col].dropna()
        if len(s) > 5:
            col_mean = round(float(s.mean()), 2)
            col_sum = round(float(s.sum()), 2)
            col_min = round(float(s.min()), 2)
            col_max = round(float(s.max()), 2)
            
            # Format KPI
            kpis.append({
                "id": f"avg_{col}",
                "title": f"Avg {str(col).replace('_', ' ').title()}",
                "value": f"{col_mean:,.2f}" if col_mean < 1000000 else f"{col_mean/1000000:.2f}M",
                "subtitle": f"Range: {col_min:,.0f} - {col_max:,.0f}",
                "trend": "positive"
            })

            # Create 10 histogram bins
            counts, bin_edges = np.histogram(s, bins=min(10, max(3, len(s.unique()))))
            bins_data = []
            for i in range(len(counts)):
                label = f"{bin_edges[i]:,.0f} - {bin_edges[i+1]:,.0f}"
                bins_data.append({
                    "range": label,
                    "count": int(counts[i]),
                    "min": float(bin_edges[i]),
                    "max": float(bin_edges[i+1])
                })
            
            distributions.append({
                "column": col,
                "title": f"Distribution of {str(col).replace('_', ' ').title()}",
                "mean": col_mean,
                "median": round(float(s.median()), 2),
                "bins": bins_data
            })

    # Categorical Columns Analytics (Value counts for bar / donut charts)
    cat_cols = df.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    categories: List[Dict[str, Any]] = []

    for col in cat_cols[:4]: # Top 4 categorical columns
        s = df[col].dropna()
        if len(s) > 0:
            top_vals = s.value_counts().head(8)
            chart_data = []
            for val, count in top_vals.items():
                pct = round((count / total_rows) * 100, 1)
                chart_data.append({
                    "label": str(val)[:24], # Truncate long labels
                    "count": int(count),
                    "percentage": pct
                })
            
            categories.append({
                "column": col,
                "title": f"Breakdown by {str(col).replace('_', ' ').title()}",
                "unique_values": int(s.nunique()),
                "data": chart_data
            })

    # FinSight Lanka domain heuristic: Risk & Generation Detection
    fin_insights = []
    col_names_lower = [str(c).lower() for c in df.columns]
    
    # Check if age column exists to segment Gen Z vs Millennials vs Gen X
    age_col = next((c for c in df.columns if "age" in str(c).lower()), None)
    savings_col = next((c for c in df.columns if any(k in str(c).lower() for k in ["saving", "balance", "income"])), None)

    if age_col and savings_col and pd.api.types.is_numeric_dtype(df[age_col]) and pd.api.types.is_numeric_dtype(df[savings_col]):
        df_demo = df.dropna(subset=[age_col, savings_col])
        gen_z = df_demo[df_demo[age_col] < 26]
        if len(gen_z) > 0:
            gen_z_avg_savings = round(float(gen_z[savings_col].mean()), 2)
            overall_avg = round(float(df_demo[savings_col].mean()), 2)
            fin_insights.append({
                "type": "DEMOGRAPHIC_ANOMALY",
                "title": "Gen Z Demographic Analysis",
                "description": f"Identified {len(gen_z)} Gen Z individuals (age < 26) with average {savings_col} of {gen_z_avg_savings:,.2f} vs overall average {overall_avg:,.2f}."
            })

    return {
        "kpis": kpis[:4],
        "distributions": distributions,
        "categories": categories,
        "insights": fin_insights
    }
