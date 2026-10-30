# 🧘 ZenData - Automated Data Cleaning & Semantic Hygiene Platform

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-teal.svg)
![Next.js](https://img.shields.io/badge/Next.js-16%20Turbopack-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

**ZenData** brings peace, clarity, and mathematical rigor to chaotic tabular data. A modern, web-based SaaS platform engineered for analysts and businesses to drag & drop raw messy spreadsheets, run automated multi-pillar health audits, preview interactive data corrections, and export enterprise-grade cleaned datasets.

## 🌐 Live Demo
- **Live Web Application:** [https://zendata-frontend.onrender.com](https://zendata-frontend.onrender.com)
- **Live FastAPI Documentation (Swagger UI):** [https://zendata-backend.onrender.com/docs](https://zendata-backend.onrender.com/docs)

---

## ✨ Key Features

### 1. 🛡️ Enterprise Data Hygiene Engine
- **No Fabricated Data (Anti-Poisoning):** Strict integrity rules that never blindly impute PII (Customer Names, Emails, Phones), Unique Transaction IDs, or subjective user ratings with fake mode values.
- **Canonical Categorical Normalization:** Fuzzy string matching and taxonomy clustering (`Diary` → `Dairy`, `Bakary` → `Bakery`, `Groceries` → `Groceries`).
- **Location & Cashier Standardizer:** Unifies variations like `colombo 07`, `Colombo-07`, and `Colombo7` to canonical `Colombo 07`, collapses whitespace anomalies, and preserves well-known acronyms (`QR`, `POS`, `LKR`, `VISA`).
- **Temporal Standardizer:** Automatically normalizes mixed date formats to ISO 8601 (`YYYY-MM-DD`) and times to 24-hour (`HH:MM:SS`), flagging relative (`yesterday`) and invalid dates.
- **Mathematical Reconciliation:** Automatically validates and enforces formula integrity:
  $$\text{Total} = \text{Qty} \times \text{Unit Price} \times (1 - \text{Discount})$$
  - Reverse-computes typo quantities (e.g. `999` resolved to true unit counts `2`, `3`, `5`).
  - Corrects negative unit prices using catalog and cart totals.
  - Recomputes missing, string-corrupted (`Rs 4,500`), or mathematically mismatched totals.

### 2. 🔍 Human-in-the-Loop Review & Cell-Level Editing
- Live inline double-click table editing with keyboard shortcuts (`Enter` to save, `Esc` to cancel).
- Selective Fix Approval: granularly toggle which automated rules to apply and which to skip.
- Automated `needs_review` and `review_reasons` columns added to output datasets for easy filtering and compliance audit.

### 3. 📊 Executive Multi-Format Export Hub
- **Executive PDF Audit Report:** Landscape quality scorecard generated via ReportLab featuring grade gauges, four health pillars, transformation changelog, and column profiles.
- **Multi-Sheet Styled Excel (.xlsx):** Three formatted worksheets (`Cleaned Data`, `Audit Changelog`, and `Quality Metrics`).
- **Standard Cleaned CSV & Developer JSON.**

---

## 🏗️ Project Architecture

```text
ZenData/
├── Documentation/                 # Architecture guides and audit reports
├── zendataproject/
│   ├── backend/                   # FastAPI Backend
│   │   ├── app/
│   │   │   ├── api/routes/        # REST Endpoints (upload, clean, export)
│   │   │   ├── core/              # Config and CORS settings
│   │   │   └── engine/            # Health Scorer, Hygiene Rules, PDF/Excel Generators
│   │   └── requirements.txt
│   └── frontend/                  # Next.js 16 (App Router) + TypeScript
│       ├── src/app/               # Interactive UI and Data Tables
│       └── package.json
├── .gitignore                     # Clean Git tracking configuration
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/ZenData.git
cd ZenData/zendataproject
```

### 2. Start the Backend API
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation: `http://localhost:8000/docs`

### 3. Start the Frontend App
```bash
cd ../frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`

---

## 📄 License
This project is licensed under the MIT License.
