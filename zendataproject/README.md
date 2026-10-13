# ZenData - Automated Data Cleaning & Analytics SaaS

ZenData brings **Zen** (peace and clarity) to chaotic data. A lightweight, web-based platform designed for non-technical users to drag & drop raw spreadsheets, get instant data health audits, clean dirty anomalies in one click, and explore interactive dashboards.

## Architecture

- **Backend (`/backend`)**: Python 3.10+, FastAPI, Pandas, NumPy.
- **Frontend (`/frontend`)**: Next.js 15, React 19, TypeScript, Vanilla CSS design system.
- **Sample Data (`/backend/sample_data`)**: Real-world dirty financial dataset inspired by FinSight Lanka assessment.

## Getting Started

### 1. Run the FastAPI Backend
```bash
cd backend
# Activate virtual environment
source venv/bin/activate
# Start development server
uvicorn app.main:app --reload --port 8000
```
Interactive API documentation available at: `http://localhost:8000/docs`

### 2. Run the Next.js Frontend
```bash
cd frontend
npm run dev
```
Frontend web application runs at: `http://localhost:3000`
