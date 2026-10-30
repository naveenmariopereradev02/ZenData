"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  Download,
  RefreshCw,
  BarChart3,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Sliders,
  Table,
  Zap,
  TrendingUp,
  Edit3,
  Save,
  X,
  CheckSquare,
  Square,
  CornerDownLeft,
  FileText,
  FileCode,
  ChevronDown,
} from "lucide-react";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://zendata-backend.onrender.com"
    : "http://localhost:8000");

// Sample dataset text representation for 1-click FinSight Lanka demo
const FINSIGHT_SAMPLE_CSV = `customer_id,full_name,age,gender,city,monthly_income,savings_balance,risk_rating,account_status
CUST-1001,Kasun Perera,24,Male, Colombo ,45000,-2500,High,Active
CUST-1002,Amara Fernando,31,Female,Kandy,85000,120000,Low,Active
CUST-1003,Dilshan Silva,22,Male,Galle,38000,-1500,High,Active
CUST-1004,Nimali Jayasuriya,45,Female, Colombo,110000,340000,Low,Active
CUST-1005,Rohan Wickramasinghe,,Male,Kurunegala,62000,85000,Medium,Active
CUST-1006,Thisara Gunaratne,23,Male, Colombo ,41000,0,High,Active
CUST-1007,Sanduni Mendis,29,Female,Gampaha,78000,,Low,Active
CUST-1008,Mahesh De Silva,52,Male,Negombo,145000,680000,Low,Active
CUST-1001,Kasun Perera,24,Male, Colombo ,45000,-2500,High,Active
CUST-1009,Chathurika Alwis,25,Female,Kandy,52000,-800,High,Active
CUST-1010,Sajith Bandara,38,Male,Anuradhapura,,190000,Medium,Active
CUST-1011,Anuki Rathnayake,21,Female,Colombo,35000,12000,High,Active
CUST-1012,Pradeep Senanayake,49,Male,Galle,125000,410000,Low,Active
CUST-1003,Dilshan Silva,22,Male,Galle,38000,-1500,High,Active
CUST-1013,Ruwan Dissanayake,23,Male,Jaffna,44000,,High,Active
CUST-1014,Hiruni Cooray,34,Female,Colombo,92000,215000,Low,Active
CUST-1015,Asanka Fonseka,27,Male,Matara,58000,64000,Medium,Active
CUST-1016,Kavindi Abeysekara,22,Female,Colombo,40000,-3200,High,Active
CUST-1017,Lasantha Gamage,41,Male,Badulla,73000,110000,Medium,Active
CUST-1018,Pooja Ranasinghe,,Female,Colombo,88000,175000,Low,Active
CUST-1019,Nuwan Kulatunga,24,Male,Kandy,46000,-500,High,Active
CUST-1020,Dinithi Wijesinghe,30,Female,Kurunegala,81000,154000,Low,Active`;

export default function ZenDataApp() {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dataset State
  const [sessionData, setSessionData] = useState<any | null>(null);
  const [cleanData, setCleanData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"audit" | "preview" | "analytics" | "auditLog">("audit");
  const [previewMode, setPreviewMode] = useState<"raw" | "clean">("raw");

  // Feature 1: Human-in-the-Loop Selective Fix Approvals
  const [approvedIssues, setApprovedIssues] = useState<Set<string>>(new Set());

  // Feature 1: Interactive Cell-Level Editing State
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);
  const [cellDraftValue, setCellDraftValue] = useState<string>("");
  const [isSavingCell, setIsSavingCell] = useState<boolean>(false);
  const [editedCells, setEditedCells] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Feature 2: Multi-Format Export Dropdown State
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Cleaning options
  const [cleanOptions, setCleanOptions] = useState({
    deduplicate: true,
    impute_missing: "median",
    fix_negatives: true,
    strip_whitespace: true,
    normalize_headers: true,
    replace_placeholders: true,
    coerce_numerics: true,
    standardize_dates: true,
    standardize_booleans: true,
    standardize_text_case: true,
    fuzzy_typo_fix: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Backend Connection
  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { method: "GET" });
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch {
        setBackendOnline(false);
      }
    }
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Upload handler
  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BACKEND_URL}/api/v1/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Upload failed with code ${res.status}`);
      }

      const data = await res.json();
      setSessionData(data);
      setCleanData(null);
      setPreviewMode("raw");
      setActiveTab("audit");

      // Initialize all detected issues as approved by default
      const issueIds = (data.health_score?.issues || []).map((i: any) => i.id);
      setApprovedIssues(new Set(issueIds));
      setEditedCells(new Set());
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to upload and analyze file.");
    } finally {
      setIsUploading(false);
    }
  }

  // Load FinSight Demo
  function loadDemoData() {
    const blob = new Blob([FINSIGHT_SAMPLE_CSV], { type: "text/csv" });
    const demoFile = new File([blob], "finsight_lanka_customers.csv", { type: "text/csv" });
    handleFileUpload(demoFile);
  }

  // Selective Fix Approval Toggles
  function toggleIssueApproval(issueId: string) {
    setApprovedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }

  function selectAllIssues() {
    if (!sessionData?.health_score?.issues) return;
    setApprovedIssues(new Set(sessionData.health_score.issues.map((i: any) => i.id)));
  }

  function deselectAllIssues() {
    setApprovedIssues(new Set());
  }

  // Interactive Cell Editing Handlers
  function handleStartCellEdit(rowIndex: number, column: string, currentValue: any) {
    setEditingCell({ rowIndex, column });
    setCellDraftValue(currentValue === null || currentValue === undefined ? "" : String(currentValue));
  }

  async function handleSaveCellEdit(rowIndex: number, column: string) {
    if (!sessionData?.session_id) return;
    setIsSavingCell(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/clean/edit-cell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          row_index: rowIndex,
          column: column,
          new_value: cellDraftValue,
          target: previewMode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to update cell.");
      }

      const result = await res.json();

      if (previewMode === "clean" && cleanData) {
        setCleanData((prev: any) => ({
          ...prev,
          cleaned_preview_rows: result.preview_rows,
          new_health_score: result.health_score,
          analytics: result.analytics,
        }));
      } else {
        setSessionData((prev: any) => ({
          ...prev,
          preview_rows: result.preview_rows,
          health_score: result.health_score,
          analytics: result.analytics,
        }));
      }

      setEditedCells((prev) => new Set(prev).add(`${previewMode}:${rowIndex}:${column}`));
      setEditingCell(null);
      setToastMsg({
        text: `Row #${rowIndex + 1} "${column}" set to "${cellDraftValue}". Health score recalculated!`,
        type: "success",
      });
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setToastMsg({
        text: err.message || "Failed to update cell.",
        type: "error",
      });
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setIsSavingCell(false);
    }
  }

  // Execute One-Click Clean with Approved Fixes
  async function handleAutoClean() {
    if (!sessionData?.session_id) return;
    setIsCleaning(true);
    setErrorMsg(null);

    try {
      const allIssues = sessionData.health_score?.issues || [];
      const skippedIssues = allIssues
        .filter((i: any) => !approvedIssues.has(i.id))
        .map((i: any) => i.title);

      const res = await fetch(`${BACKEND_URL}/api/v1/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.session_id,
          options: {
            ...cleanOptions,
            approved_issues: Array.from(approvedIssues),
            skipped_issues: skippedIssues,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Cleaning execution failed.");
      }

      const result = await res.json();
      setCleanData(result);
      setPreviewMode("clean");
      setActiveTab("auditLog");

      // Celebrate with confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#06b6d4", "#f8fafc"],
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to auto-clean data.");
    } finally {
      setIsCleaning(false);
    }
  }

  // Feature 2: Multi-Format Export Handler
  function handleExport(format: "pdf" | "excel" | "csv" | "json") {
    if (!sessionData?.session_id) return;
    window.open(`${BACKEND_URL}/api/v1/export/${sessionData.session_id}/${format}`, "_blank");
  }

  // Download Cleaned CSV (fallback)
  function handleDownloadCSV() {
    handleExport("csv");
  }

  // Reset to Upload another file
  function handleReset() {
    setSessionData(null);
    setCleanData(null);
    setErrorMsg(null);
  }

  // Helpers for Health Score
  const currentHealth = cleanData?.new_health_score || sessionData?.health_score;
  const initialScore = sessionData?.health_score?.overall_score || 0;
  const currentScore = currentHealth?.overall_score || 0;

  const scoreColor =
    currentScore >= 90
      ? "var(--zen-emerald)"
      : currentScore >= 75
      ? "var(--zen-cyan)"
      : currentScore >= 60
      ? "var(--zen-amber)"
      : "var(--zen-rose)";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(7, 10, 16, 0.85)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0.9rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(16, 185, 129, 0.35)",
              }}
            >
              <Sparkles size={20} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  Zen<span style={{ color: "var(--zen-emerald)" }}>Data</span>
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.45rem",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--zen-emerald-light)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  MVP 1.0
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Peace & Clarity for Chaotic Data
              </p>
            </div>
          </div>

          {/* Status & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.75rem",
                borderRadius: 9999,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.75rem",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: backendOnline ? "var(--zen-emerald)" : "var(--zen-amber)",
                  boxShadow: backendOnline
                    ? "0 0 8px var(--zen-emerald)"
                    : "0 0 8px var(--zen-amber)",
                }}
              />
              <span style={{ color: backendOnline ? "var(--text-secondary)" : "var(--zen-amber)" }}>
                {backendOnline === null
                  ? "Checking Backend..."
                  : backendOnline
                  ? "FastAPI Engine Online"
                  : "Engine Disconnected (Port 8000)"}
              </span>
            </div>

            {!sessionData ? (
              <button onClick={loadDemoData} className="zen-btn-secondary" style={{ fontSize: "0.8rem" }}>
                <Zap size={14} color="var(--zen-amber)" />
                Load FinSight Demo Data
              </button>
            ) : (
              <button onClick={handleReset} className="zen-btn-secondary" style={{ fontSize: "0.8rem" }}>
                <RefreshCw size={14} />
                Upload New Dataset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "2rem 1.5rem", width: "100%", flex: 1 }}>
        {errorMsg && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(244, 63, 94, 0.12)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              color: "#fb7185",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.9rem",
            }}
          >
            <AlertOctagon size={20} />
            <div>
              <strong>Error:</strong> {errorMsg}
            </div>
          </div>
        )}

        {!sessionData ? (
          /* HERO & UPLOAD SECTION */
          <div style={{ maxWidth: 840, margin: "3rem auto 0", textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.9rem",
                borderRadius: 9999,
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                color: "var(--zen-emerald-light)",
                fontSize: "0.825rem",
                fontWeight: 600,
                marginBottom: "1.25rem",
              }}
            >
              <Sparkles size={14} />
              Zero-Learning Curve Automated Data Cleaning
            </div>

            <h1
              style={{
                fontSize: "3.2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                marginBottom: "1rem",
              }}
            >
              Bring <span style={{ color: "var(--zen-emerald)" }}>Zen</span> to Chaotic Data.
            </h1>
            <p
              style={{
                fontSize: "1.125rem",
                color: "var(--text-secondary)",
                maxWidth: 620,
                margin: "0 auto 2.5rem",
                lineHeight: 1.6,
              }}
            >
              Drop raw, dirty spreadsheets without formulas or complex scripts. ZenData audits data health, resolves anomalies, and outputs executive insights in one click.
            </p>

            {/* Drag & Drop Target */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="glass-panel"
              style={{
                padding: "3.5rem 2rem",
                cursor: "pointer",
                border: dragOver
                  ? "2px dashed var(--zen-emerald)"
                  : "2px dashed var(--border-medium)",
                background: dragOver ? "rgba(16, 185, 129, 0.05)" : "var(--bg-card)",
                transition: "all 0.2s ease",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />

              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "20px",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--zen-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                {isUploading ? (
                  <RefreshCw size={28} className="animate-spin" />
                ) : (
                  <UploadCloud size={30} />
                )}
              </div>

              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                {isUploading ? "Auditing Dataset Health..." : "Drag and drop your spreadsheet here"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                Supports CSV, XLSX, and XLS up to 25MB (Freemium tier)
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <span className="zen-btn-primary" style={{ pointerEvents: "none" }}>
                  Browse Files
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadDemoData();
                  }}
                  className="zen-btn-secondary"
                >
                  <Zap size={14} color="var(--zen-amber)" />
                  Try FinSight Customer Demo (22 rows)
                </button>
                <a
                  href="/FinSight_Uncleaned_Data_Audit_Report.pdf"
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="zen-btn-secondary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FileSpreadsheet size={14} color="var(--zen-cyan)" />
                  Interview Artifact: Uncleaned PDF Report
                </a>
              </div>
            </div>

            {/* Feature Pills */}
            <div
              style={{
                marginTop: "3rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1.25rem",
                textAlign: "left",
              }}
            >
              <div className="glass-panel" style={{ padding: "1.25rem" }}>
                <ShieldCheck size={20} color="var(--zen-emerald)" style={{ marginBottom: "0.5rem" }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Instant Health Score
                </h4>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Weighted audit covering completeness, uniqueness, validity, and outliers.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "1.25rem" }}>
                <Sparkles size={20} color="var(--zen-cyan)" style={{ marginBottom: "0.5rem" }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  1-Click Auto Clean
                </h4>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Deduplicates, imputes statistical medians, and corrects negative values.
                </p>
              </div>

              <div className="glass-panel" style={{ padding: "1.25rem" }}>
                <BarChart3 size={20} color="var(--zen-amber)" style={{ marginBottom: "0.5rem" }} />
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                  Executive Insights
                </h4>
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Generates instant demographic histograms and exportable clean datasets.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* AUDITED DATASET DASHBOARD */
          <div>
            {/* Top Info Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.5rem",
                padding: "1rem 1.5rem",
                background: "var(--bg-glass)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    padding: "0.6rem",
                    borderRadius: "10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    color: "var(--zen-emerald)",
                  }}
                >
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                    {sessionData.filename}
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {sessionData.total_rows.toLocaleString()} rows • {sessionData.total_cols} columns • {(sessionData.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {!cleanData ? (
                  <button
                    onClick={handleAutoClean}
                    disabled={isCleaning || approvedIssues.size === 0}
                    className="zen-btn-primary"
                  >
                    {isCleaning ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Cleaning Dataset...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Auto-Clean ({approvedIssues.size} Fixes Approved)
                      </>
                    )}
                  </button>
                ) : (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="zen-btn-primary"
                      style={{
                        background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Download size={16} />
                      <span>Export Data & Reports</span>
                      <ChevronDown size={14} style={{ transform: showExportMenu ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>

                    {showExportMenu && (
                      <div
                        className="glass-panel"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 0.5rem)",
                          right: 0,
                          width: 320,
                          zIndex: 100,
                          padding: "0.6rem",
                          background: "rgba(11, 17, 30, 0.98)",
                          boxShadow: "0 15px 35px rgba(0, 0, 0, 0.7)",
                          border: "1px solid rgba(16, 185, 129, 0.35)",
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.4rem",
                        }}
                      >
                        {/* PDF Option */}
                        <button
                          onClick={() => {
                            handleExport("pdf");
                            setShowExportMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            borderRadius: "8px",
                            background: "rgba(244, 63, 94, 0.08)",
                            border: "1px solid rgba(244, 63, 94, 0.2)",
                            color: "#ffffff",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(244, 63, 94, 0.2)", color: "var(--zen-rose)" }}>
                            <FileText size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fca5a5" }}>Executive PDF Audit</span>
                              <span className="badge badge-critical" style={{ fontSize: "0.6rem" }}>REPORT</span>
                            </div>
                            <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              Certified PDF report with health gauges, issues & changelog
                            </p>
                          </div>
                        </button>

                        {/* Excel Option */}
                        <button
                          onClick={() => {
                            handleExport("excel");
                            setShowExportMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            borderRadius: "8px",
                            background: "rgba(16, 185, 129, 0.08)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            color: "#ffffff",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(16, 185, 129, 0.2)", color: "var(--zen-emerald)" }}>
                            <FileSpreadsheet size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--zen-emerald-light)" }}>Multi-Sheet Excel</span>
                              <span className="badge badge-success" style={{ fontSize: "0.6rem" }}>3 SHEETS</span>
                            </div>
                            <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              Styled workbook: Cleaned Data + Changelog + Metrics
                            </p>
                          </div>
                        </button>

                        {/* CSV Option */}
                        <button
                          onClick={() => {
                            handleExport("csv");
                            setShowExportMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            borderRadius: "8px",
                            background: "rgba(6, 182, 212, 0.08)",
                            border: "1px solid rgba(6, 182, 212, 0.2)",
                            color: "#ffffff",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(6, 182, 212, 0.2)", color: "var(--zen-cyan)" }}>
                            <Download size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#7dd3fc" }}>Cleaned CSV File</span>
                              <span className="badge badge-info" style={{ fontSize: "0.6rem" }}>CSV</span>
                            </div>
                            <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              Universal flat CSV for database imports & ML pipelines
                            </p>
                          </div>
                        </button>

                        {/* JSON Option */}
                        <button
                          onClick={() => {
                            handleExport("json");
                            setShowExportMenu(false);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            padding: "0.65rem 0.75rem",
                            borderRadius: "8px",
                            background: "rgba(139, 92, 246, 0.08)",
                            border: "1px solid rgba(139, 92, 246, 0.2)",
                            color: "#ffffff",
                            textAlign: "left",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ padding: "0.4rem", borderRadius: "6px", background: "rgba(139, 92, 246, 0.2)", color: "var(--zen-violet)" }}>
                            <FileCode size={18} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c4b5fd" }}>Developer JSON</span>
                              <span className="badge" style={{ fontSize: "0.6rem", background: "rgba(139, 92, 246, 0.2)", color: "#c4b5fd" }}>API</span>
                            </div>
                            <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              Structured array with schema profiles & changelog
                            </p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* HEALTH SCORE HERO CARD & STATS */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(320px, 1fr) 2fr",
                gap: "1.5rem",
                marginBottom: "1.75rem",
              }}
            >
              {/* Circular Health Gauge Card */}
              <div
                className="glass-panel"
                style={{
                  padding: "1.75rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    left: "1.25rem",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Data Health Score
                </div>

                {cleanData && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1.25rem",
                    }}
                  >
                    <span className="badge badge-success">Cleaned</span>
                  </div>
                )}

                {/* SVG Gauge */}
                <div style={{ position: "relative", width: 170, height: 170, margin: "1.5rem 0 1rem" }}>
                  <svg width="170" height="170" viewBox="0 0 170 170">
                    <circle
                      cx="85"
                      cy="85"
                      r="70"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="14"
                      fill="none"
                    />
                    <circle
                      cx="85"
                      cy="85"
                      r="70"
                      stroke={scoreColor}
                      strokeWidth="14"
                      fill="none"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={2 * Math.PI * 70 * (1 - currentScore / 100)}
                      strokeLinecap="round"
                      transform="rotate(-90 85 85)"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: "2.4rem", fontWeight: 800, color: scoreColor }}>
                      {currentScore}%
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.08)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Grade {currentHealth?.grade}
                    </span>
                  </div>
                </div>

                {cleanData ? (
                  <p style={{ fontSize: "0.85rem", color: "var(--zen-emerald-light)", fontWeight: 600 }}>
                    Score improved from {initialScore}% to {currentScore}%!
                  </p>
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {currentHealth?.issues?.length || 0} issues flagged across quality pillars
                  </p>
                )}

                {/* 4 Pillars Mini Bars */}
                <div style={{ width: "100%", marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", textAlign: "left" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      <span>Completeness</span>
                      <span>{currentHealth?.pillars?.completeness}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${currentHealth?.pillars?.completeness}%`, height: "100%", background: "var(--zen-emerald)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      <span>Uniqueness</span>
                      <span>{currentHealth?.pillars?.uniqueness}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${currentHealth?.pillars?.uniqueness}%`, height: "100%", background: "var(--zen-cyan)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      <span>Validity</span>
                      <span>{currentHealth?.pillars?.validity}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${currentHealth?.pillars?.validity}%`, height: "100%", background: "var(--zen-amber)" }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                      <span>Consistency</span>
                      <span>{currentHealth?.pillars?.consistency}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${currentHealth?.pillars?.consistency}%`, height: "100%", background: "var(--zen-violet)" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Metrics & Clean Config */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* 4 Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                      Missing Cells
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem", color: currentHealth?.summary?.missing_cells > 0 ? "var(--zen-amber)" : "var(--zen-emerald)" }}>
                      {currentHealth?.summary?.missing_cells || 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Out of {currentHealth?.summary?.total_cells?.toLocaleString()}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                      Duplicate Rows
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem", color: currentHealth?.summary?.duplicate_rows > 0 ? "var(--zen-rose)" : "var(--zen-emerald)" }}>
                      {currentHealth?.summary?.duplicate_rows || 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Exact copies
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                      Clean Status
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem", color: cleanData ? "var(--zen-emerald)" : "var(--zen-cyan)" }}>
                      {cleanData ? "Ready" : "Raw"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {cleanData ? `${cleanData.comparison.final_rows} rows active` : "Awaiting auto-clean"}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase" }}>
                      Outliers Flagged
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--text-primary)" }}>
                      {currentHealth?.summary?.outlier_cells || 0}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Outside 1.5× IQR
                    </div>
                  </div>
                </div>

                {/* One-Click Clean Recipe Card */}
                <div className="glass-panel" style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Sliders size={18} color="var(--zen-emerald)" />
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                          Automated Cleaning Rules
                        </h4>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        FinSight Lanka Engine
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", fontSize: "0.825rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.deduplicate}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, deduplicate: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Drop Duplicates</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.fix_negatives}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, fix_negatives: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Fix Negatives (abs / 0)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.replace_placeholders}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, replace_placeholders: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Purge Placeholders (?, not given)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.coerce_numerics}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, coerce_numerics: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Coerce Currency & Strings</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.standardize_dates}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, standardize_dates: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Standardize Dates (ISO 8601)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.fuzzy_typo_fix}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, fuzzy_typo_fix: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Fuzzy Typo Cluster (Diary → Dairy)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.standardize_text_case}
                          onChange={(e) => setCleanOptions({ ...cleanOptions, standardize_text_case: e.target.checked })}
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Title Case & Acronyms (QR, POS)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={cleanOptions.impute_missing !== "none"}
                          onChange={(e) =>
                            setCleanOptions({
                              ...cleanOptions,
                              impute_missing: e.target.checked ? "median" : "none",
                            })
                          }
                          style={{ accentColor: "var(--zen-emerald)" }}
                        />
                        <span>Impute Nulls (Median/Mode)</span>
                      </label>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.25rem", display: "flex", gap: "0.75rem" }}>
                    {!cleanData ? (
                      <button
                        onClick={handleAutoClean}
                        disabled={isCleaning || approvedIssues.size === 0}
                        className="zen-btn-primary"
                        style={{ width: "100%" }}
                      >
                        {isCleaning
                          ? "Applying Zen Transformations..."
                          : `✨ Apply Fixes (${approvedIssues.size} Approved)`}
                      </button>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%" }}>
                        <button
                          onClick={() => handleExport("pdf")}
                          className="zen-btn-primary"
                          style={{
                            background: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
                            padding: "0.6rem 0.75rem",
                            fontSize: "0.775rem",
                          }}
                        >
                          <FileText size={14} />
                          Executive PDF Report
                        </button>
                        <button
                          onClick={() => handleExport("excel")}
                          className="zen-btn-primary"
                          style={{
                            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                            padding: "0.6rem 0.75rem",
                            fontSize: "0.775rem",
                          }}
                        >
                          <FileSpreadsheet size={14} />
                          Excel (.xlsx)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "1.5rem",
                overflowX: "auto",
              }}
            >
              <button
                onClick={() => setActiveTab("audit")}
                style={{
                  padding: "0.65rem 1.25rem",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "audit" ? "2px solid var(--zen-emerald)" : "2px solid transparent",
                  color: activeTab === "audit" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <AlertTriangle size={15} />
                Quality Audit Issues ({sessionData.health_score.issues.length})
              </button>

              <button
                onClick={() => setActiveTab("preview")}
                style={{
                  padding: "0.65rem 1.25rem",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "preview" ? "2px solid var(--zen-emerald)" : "2px solid transparent",
                  color: activeTab === "preview" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <Table size={15} />
                Data Preview & Diff
              </button>

              <button
                onClick={() => setActiveTab("analytics")}
                style={{
                  padding: "0.65rem 1.25rem",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "analytics" ? "2px solid var(--zen-emerald)" : "2px solid transparent",
                  color: activeTab === "analytics" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <BarChart3 size={15} />
                Visual Analytics & Charts
              </button>

              {cleanData && (
                <button
                  onClick={() => setActiveTab("auditLog")}
                  style={{
                    padding: "0.65rem 1.25rem",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === "auditLog" ? "2px solid var(--zen-emerald)" : "2px solid transparent",
                    color: activeTab === "auditLog" ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <CheckCircle2 size={15} color="var(--zen-emerald)" />
                  Changelog ({cleanData.audit_log.length} Fixes)
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: QUALITY AUDIT ISSUES WITH SELECTIVE APPROVAL */}
            {activeTab === "audit" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {sessionData.health_score.issues.length === 0 ? (
                  <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>
                    <CheckCircle2 size={36} color="var(--zen-emerald)" style={{ margin: "0 auto 1rem" }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Data is Completely Pure</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      No critical errors, nulls, duplicates or anomalies detected.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Selective Approval Control Bar */}
                    <div
                      className="glass-panel"
                      style={{
                        padding: "0.85rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        background: "rgba(16, 185, 129, 0.05)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "6px",
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "var(--zen-emerald-light)",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          HUMAN-IN-THE-LOOP REVIEW
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <strong>{approvedIssues.size}</strong> of {sessionData.health_score.issues.length} fixes approved for automated cleaning
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          onClick={selectAllIssues}
                          className="zen-btn-secondary"
                          style={{ padding: "0.3rem 0.75rem", fontSize: "0.775rem" }}
                        >
                          <CheckSquare size={13} />
                          Approve All
                        </button>
                        <button
                          onClick={deselectAllIssues}
                          className="zen-btn-secondary"
                          style={{ padding: "0.3rem 0.75rem", fontSize: "0.775rem" }}
                        >
                          <Square size={13} />
                          Skip All
                        </button>
                      </div>
                    </div>

                    {sessionData.health_score.issues.map((issue: any, idx: number) => {
                      const isApproved = approvedIssues.has(issue.id);
                      return (
                        <div
                          key={idx}
                          className="glass-panel"
                          style={{
                            padding: "1.25rem 1.5rem",
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            gap: "1rem",
                            border: isApproved
                              ? "1px solid rgba(16, 185, 129, 0.35)"
                              : "1px solid var(--border-subtle)",
                            background: isApproved
                              ? "rgba(18, 24, 38, 0.75)"
                              : "rgba(15, 23, 42, 0.35)",
                            opacity: isApproved ? 1 : 0.65,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                            <div style={{ marginTop: "0.15rem" }}>
                              {issue.severity === "CRITICAL" ? (
                                <AlertOctagon size={20} color="var(--zen-rose)" />
                              ) : issue.severity === "WARNING" ? (
                                <AlertTriangle size={20} color="var(--zen-amber)" />
                              ) : (
                                <Info size={20} color="var(--zen-cyan)" />
                              )}
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                                <span
                                  className={`badge ${
                                    issue.severity === "CRITICAL"
                                      ? "badge-critical"
                                      : issue.severity === "WARNING"
                                      ? "badge-warning"
                                      : "badge-info"
                                  }`}
                                >
                                  {issue.severity}
                                </span>
                                <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>
                                  {issue.title}
                                </h4>
                              </div>
                              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                                {issue.description}
                              </p>
                              <p style={{ fontSize: "0.775rem", color: "var(--zen-emerald-light)" }}>
                                💡 <strong>Zen Fix:</strong> {issue.action}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                            {issue.impact_count > 0 && (
                              <div
                                style={{
                                  textAlign: "right",
                                  padding: "0.4rem 0.8rem",
                                  borderRadius: "8px",
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid var(--border-subtle)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                  {issue.impact_count}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  Affected Rows
                                </div>
                              </div>
                            )}

                            {/* Human-in-the-Loop Toggle Action */}
                            <button
                              onClick={() => toggleIssueApproval(issue.id)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                padding: "0.45rem 0.85rem",
                                borderRadius: "8px",
                                fontSize: "0.775rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                border: isApproved
                                  ? "1px solid rgba(16, 185, 129, 0.5)"
                                  : "1px solid rgba(255, 255, 255, 0.15)",
                                background: isApproved
                                  ? "rgba(16, 185, 129, 0.18)"
                                  : "rgba(255, 255, 255, 0.05)",
                                color: isApproved ? "var(--zen-emerald-light)" : "var(--text-muted)",
                                transition: "all 0.2s ease",
                              }}
                            >
                              {isApproved ? (
                                <>
                                  <Check size={14} />
                                  Approved for Clean
                                </>
                              ) : (
                                <>
                                  <X size={14} />
                                  Skip This Fix
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: DATA PREVIEW & DIFF WITH INTERACTIVE CELL EDITING */}
            {activeTab === "preview" && (
              <div className="glass-panel" style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Viewing:</span>
                    <button
                      onClick={() => setPreviewMode("raw")}
                      className={`zen-btn-secondary ${previewMode === "raw" ? "badge-info" : ""}`}
                      style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
                    >
                      Raw Data (First 30 Rows)
                    </button>
                    {cleanData && (
                      <button
                        onClick={() => setPreviewMode("clean")}
                        className={`zen-btn-secondary ${previewMode === "clean" ? "badge-success" : ""}`}
                        style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
                      >
                        Cleaned Data (First 30 Rows)
                      </button>
                    )}
                  </div>

                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {previewMode === "clean"
                      ? `${cleanData.cleaned_columns.length} Normalized Columns`
                      : `${sessionData.columns.length} Original Columns`}
                  </span>
                </div>

                {/* Interactive Cell Editing Notice */}
                <div
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px dashed var(--border-subtle)",
                    marginBottom: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.775rem",
                    color: "var(--text-muted)",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Edit3 size={14} color="var(--zen-emerald-light)" />
                    <span>
                      <strong>Interactive Human-in-the-Loop Editor:</strong> Double-click any cell below to edit. Changes immediately recalculate your Health Score and Visual Analytics.
                    </span>
                  </div>
                  {editedCells.size > 0 && (
                    <span style={{ color: "var(--zen-emerald-light)", fontWeight: 700 }}>
                      ✓ {editedCells.size} cell(s) edited
                    </span>
                  )}
                </div>

                {/* Table */}
                <div style={{ overflowX: "auto", maxHeight: 440, borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left", fontFamily: "var(--font-mono)" }}>
                    <thead>
                      <tr style={{ background: "rgba(255, 255, 255, 0.05)", position: "sticky", top: 0, zIndex: 10 }}>
                        <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>#</th>
                        {(previewMode === "clean" ? cleanData.cleaned_columns : sessionData.columns).map((col: string, i: number) => (
                          <th key={i} style={{ padding: "0.75rem 1rem", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(previewMode === "clean" ? cleanData.cleaned_preview_rows : sessionData.preview_rows).map((row: any, rIdx: number) => (
                        <tr key={rIdx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", background: rIdx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.01)" }}>
                          <td style={{ padding: "0.6rem 1rem", color: "var(--text-muted)" }}>{rIdx + 1}</td>
                          {(previewMode === "clean" ? cleanData.cleaned_columns : sessionData.columns).map((col: string, cIdx: number) => {
                            const val = row[col];
                            const isNeg = typeof val === "number" && val < 0;
                            const isMissing = val === "" || val === null || val === undefined;
                            const isEditing = editingCell?.rowIndex === rIdx && editingCell?.column === col;
                            const wasEdited = editedCells.has(`${previewMode}:${rIdx}:${col}`);

                            if (isEditing) {
                              return (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: "0.35rem 0.5rem",
                                    background: "rgba(16, 185, 129, 0.15)",
                                    border: "1px solid var(--zen-emerald)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                    <input
                                      autoFocus
                                      value={cellDraftValue}
                                      onChange={(e) => setCellDraftValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveCellEdit(rIdx, col);
                                        if (e.key === "Escape") setEditingCell(null);
                                      }}
                                      style={{
                                        background: "#07090e",
                                        border: "1px solid var(--zen-emerald)",
                                        color: "#ffffff",
                                        padding: "0.25rem 0.5rem",
                                        borderRadius: "4px",
                                        fontSize: "0.8rem",
                                        fontFamily: "var(--font-mono)",
                                        outline: "none",
                                        minWidth: "100px",
                                        boxShadow: "0 0 10px rgba(16, 185, 129, 0.35)",
                                      }}
                                    />
                                    <button
                                      onClick={() => handleSaveCellEdit(rIdx, col)}
                                      disabled={isSavingCell}
                                      title="Save (Enter)"
                                      style={{
                                        background: "var(--zen-emerald)",
                                        border: "none",
                                        color: "#ffffff",
                                        borderRadius: "4px",
                                        padding: "0.25rem 0.45rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {isSavingCell ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                                    </button>
                                    <button
                                      onClick={() => setEditingCell(null)}
                                      title="Cancel (Esc)"
                                      style={{
                                        background: "rgba(255, 255, 255, 0.1)",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        borderRadius: "4px",
                                        padding: "0.25rem 0.45rem",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <X size={11} />
                                    </button>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={cIdx}
                                onDoubleClick={() => handleStartCellEdit(rIdx, col, val)}
                                title="Double-click to edit cell directly"
                                style={{
                                  padding: "0.6rem 1rem",
                                  color: isNeg ? "var(--zen-rose)" : isMissing ? "var(--text-muted)" : "var(--text-secondary)",
                                  background: wasEdited
                                    ? "rgba(16, 185, 129, 0.12)"
                                    : isNeg
                                    ? "rgba(244, 63, 94, 0.08)"
                                    : "transparent",
                                  borderLeft: wasEdited ? "3px solid var(--zen-emerald)" : "none",
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                  transition: "background 0.15s ease",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                                  <span>
                                    {isMissing ? <span style={{ fontStyle: "italic", opacity: 0.5 }}>null</span> : String(val)}
                                  </span>
                                  {wasEdited && (
                                    <span
                                      style={{
                                        fontSize: "0.55rem",
                                        fontWeight: 800,
                                        color: "var(--zen-emerald-light)",
                                        background: "rgba(16, 185, 129, 0.25)",
                                        padding: "0.1rem 0.35rem",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      EDITED
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: VISUAL ANALYTICS & CHARTS */}
            {activeTab === "analytics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Insights Banner */}
                {sessionData.analytics.insights?.length > 0 && (
                  <div
                    style={{
                      padding: "1.25rem 1.5rem",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ color: "var(--zen-emerald)" }}>
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--zen-emerald-light)" }}>
                        {sessionData.analytics.insights[0].title}
                      </h4>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        {sessionData.analytics.insights[0].description}
                      </p>
                    </div>
                  </div>
                )}

                {/* KPI Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  {(cleanData?.analytics?.kpis || sessionData.analytics.kpis).map((kpi: any, idx: number) => (
                    <div key={idx} className="glass-panel" style={{ padding: "1.25rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                        {kpi.title}
                      </div>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.25rem", color: "var(--text-primary)" }}>
                        {kpi.value}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {kpi.subtitle}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
                  {/* Histograms */}
                  {(cleanData?.analytics?.distributions || sessionData.analytics.distributions).map((dist: any, idx: number) => {
                    const maxCount = Math.max(...dist.bins.map((b: any) => b.count), 1);
                    return (
                      <div key={idx} className="glass-panel" style={{ padding: "1.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{dist.title}</h4>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Mean: {dist.mean.toLocaleString()}
                          </span>
                        </div>

                        {/* Histogram Bars */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem", height: 160, paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
                          {dist.bins.map((bin: any, bIdx: number) => {
                            const barHeight = Math.max(12, Math.round((bin.count / maxCount) * 140));
                            return (
                              <div
                                key={bIdx}
                                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}
                                title={`${bin.range}: ${bin.count} rows`}
                              >
                                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                                  {bin.count > 0 ? bin.count : ""}
                                </span>
                                <div
                                  style={{
                                    width: "100%",
                                    height: `${barHeight}px`,
                                    background: "linear-gradient(to top, var(--zen-emerald-dark), var(--zen-emerald))",
                                    borderRadius: "4px 4px 0 0",
                                    transition: "height 0.3s ease",
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Categorical Breakdowns */}
                  {(cleanData?.analytics?.categories || sessionData.analytics.categories).map((cat: any, idx: number) => (
                    <div key={idx} className="glass-panel" style={{ padding: "1.5rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{cat.title}</h4>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {cat.unique_values} Categories
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                        {cat.data.map((item: any, iIdx: number) => (
                          <div key={iIdx}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                              <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                              <span style={{ fontWeight: 600 }}>{item.count} ({item.percentage}%)</span>
                            </div>
                            <div style={{ height: 6, background: "rgba(255, 255, 255, 0.08)", borderRadius: 3, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${item.percentage}%`,
                                  height: "100%",
                                  background: "linear-gradient(to right, var(--zen-cyan), var(--zen-emerald))",
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: AUDIT CHANGELOG */}
            {activeTab === "auditLog" && cleanData && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Executive Multi-Format Export Hub */}
                <div
                  className="glass-panel"
                  style={{
                    padding: "1.25rem 1.5rem",
                    background: "rgba(11, 17, 30, 0.85)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span className="badge badge-success" style={{ fontSize: "0.7rem" }}>READY FOR EXPORT</span>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700 }}>Executive Multi-Format Export Hub</h4>
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        Download verified datasets and certified PDF audit documentation for stakeholders and production pipelines.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    {/* PDF Card */}
                    <button
                      onClick={() => handleExport("pdf")}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(244, 63, 94, 0.08)",
                        border: "1px solid rgba(244, 63, 94, 0.25)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        color: "#ffffff",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(244, 63, 94, 0.2)", color: "var(--zen-rose)" }}>
                        <FileText size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fca5a5" }}>Executive PDF Audit</div>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Formal audit report with health scorecards, issues & changelog
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--zen-rose)", fontWeight: 700, marginTop: "0.5rem" }}>
                          <Download size={12} /> Download PDF
                        </span>
                      </div>
                    </button>

                    {/* Excel Card */}
                    <button
                      onClick={() => handleExport("excel")}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.08)",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        color: "#ffffff",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.2)", color: "var(--zen-emerald)" }}>
                        <FileSpreadsheet size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--zen-emerald-light)" }}>Multi-Sheet Excel (.xlsx)</div>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Cleaned Data, Audit Changelog, and Quality Metrics sheets
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--zen-emerald-light)", fontWeight: 700, marginTop: "0.5rem" }}>
                          <Download size={12} /> Download Excel
                        </span>
                      </div>
                    </button>

                    {/* CSV Card */}
                    <button
                      onClick={() => handleExport("csv")}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(6, 182, 212, 0.08)",
                        border: "1px solid rgba(6, 182, 212, 0.25)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        color: "#ffffff",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(6, 182, 212, 0.2)", color: "var(--zen-cyan)" }}>
                        <Download size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#7dd3fc" }}>Cleaned CSV File</div>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Universal flat CSV for SQL, Python, PowerBI, and warehousing
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--zen-cyan)", fontWeight: 700, marginTop: "0.5rem" }}>
                          <Download size={12} /> Download CSV
                        </span>
                      </div>
                    </button>

                    {/* JSON Card */}
                    <button
                      onClick={() => handleExport("json")}
                      style={{
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(139, 92, 246, 0.08)",
                        border: "1px solid rgba(139, 92, 246, 0.25)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        cursor: "pointer",
                        color: "#ffffff",
                        textAlign: "left",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(139, 92, 246, 0.2)", color: "var(--zen-violet)" }}>
                        <FileCode size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#c4b5fd" }}>Developer JSON</div>
                        <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          Full records array with schema types, health metrics & log
                        </div>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--zen-violet)", fontWeight: 700, marginTop: "0.5rem" }}>
                          <Download size={12} /> Download JSON
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Stats Delta Header */}
                <div
                  className="glass-panel"
                  style={{
                    padding: "1.25rem 1.5rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1rem",
                    background: "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Health Score Jump</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--zen-emerald-light)" }}>
                      {sessionData.health_score.overall_score}% → {cleanData.new_health_score.overall_score}%
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Duplicates Purged</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      {cleanData.comparison.duplicates_removed} rows
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Negatives Corrected</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      {cleanData.comparison.negatives_fixed} values
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Missing Imputed</span>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      {cleanData.comparison.missing_imputed_count} cells
                    </div>
                  </div>
                </div>

                {/* Detailed Logs */}
                {cleanData.audit_log.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="glass-panel"
                    style={{
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        padding: "0.45rem",
                        borderRadius: "8px",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "var(--zen-emerald)",
                        marginTop: "0.15rem",
                      }}
                    >
                      <Check size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <span className="badge badge-success">{log.type}</span>
                        {log.column && (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            Column: {log.column}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {log.description}
                      </p>
                      {log.details && (
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                          {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    {log.affected_rows > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--zen-emerald-light)", fontWeight: 600 }}>
                        +{log.affected_rows} rows fixed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "1.5rem",
          textAlign: "center",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
        }}
      >
        <p>
          ZenData • Developed for FinSight Lanka & Data Professionals • Fast, Private & Zero-Learning-Curve
        </p>
      </footer>

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 9999,
            padding: "0.85rem 1.25rem",
            borderRadius: "var(--radius-md)",
            background:
              toastMsg.type === "success"
                ? "rgba(16, 185, 129, 0.95)"
                : toastMsg.type === "error"
                ? "rgba(244, 63, 94, 0.95)"
                : "rgba(15, 23, 42, 0.95)",
            color: "#ffffff",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            animation: "pulseGlow 2s ease-in-out",
          }}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}
    </div>
  );
}
