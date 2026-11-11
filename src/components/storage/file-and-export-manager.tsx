"use client";

import React, { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileCheck,
  FileSpreadsheet,
  FileCode,
  Lock
} from "lucide-react";

export type ExportType =
  | "SCOPE_PDF"
  | "ESTIMATE_PDF"
  | "PROPOSAL_PDF"
  | "TASK_CSV"
  | "TASK_MARKDOWN"
  | "PROJECT_SUMMARY_PDF"
  | "AUDIT_LOG_CSV"
  | "ANALYTICS_CSV";

interface FileItem {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  sha256: string | null;
  status: "AVAILABLE" | "UPLOADING" | "SCANNING" | "MALWARE_DETECTED" | "EXPIRED" | "DELETED";
  retentionDays: number;
  expiresAt: string;
  downloadCount: number;
}

interface ExportItem {
  id: string;
  exportType: ExportType;
  fileName: string;
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED";
  downloadUrl?: string;
  expiresAt?: string;
  sha256?: string;
  fileSizeBytes?: number;
  errorMessage?: string;
  createdAt: string;
}

export function FileAndExportManager({
  organizationId,
  projectId = "proj_fintech_core",
  userRole = "MANAGER"
}: {
  organizationId: string;
  projectId?: string;
  userRole?: string;
}) {
  const [activeTab, setActiveTab] = useState<"FILES" | "EXPORTS">("FILES");

  // Mock initial files
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: "file_rfp_001",
      fileName: "Fintech_Platform_RFP.pdf",
      fileSizeBytes: 2_450_000,
      mimeType: "application/pdf",
      sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "AVAILABLE",
      retentionDays: 365,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toLocaleDateString(),
      downloadCount: 4
    },
    {
      id: "file_interview_audio",
      fileName: "Client_Stakeholder_Discovery.mp3",
      fileSizeBytes: 14_200_000,
      mimeType: "audio/mpeg",
      sha256: "9f83c605d4bfb107ee9acf217acab302f402edbc614f195cbe6f67299dd74fe6",
      status: "AVAILABLE",
      retentionDays: 365,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toLocaleDateString(),
      downloadCount: 1
    }
  ]);

  // Mock initial exports
  const [exports, setExports] = useState<ExportItem[]>([
    {
      id: "exp_scope_101",
      exportType: "SCOPE_PDF",
      fileName: "specforge_scope_pdf_proj_fintech_core.pdf",
      status: "READY",
      downloadUrl: "https://storage.specforge.io/files/scope_101.pdf?token=signed_token_mock_24h",
      expiresAt: "In 23 hours",
      sha256: "d5a8b79234bcf12...",
      fileSizeBytes: 420_000,
      createdAt: "10 mins ago"
    },
    {
      id: "exp_task_csv_102",
      exportType: "TASK_CSV",
      fileName: "specforge_task_csv_proj_fintech_core.csv",
      status: "READY",
      downloadUrl: "https://storage.specforge.io/files/tasks_102.csv?token=signed_token_mock_24h",
      expiresAt: "In 23 hours",
      sha256: "7ac45610283bd78...",
      fileSizeBytes: 18_400,
      createdAt: "25 mins ago"
    }
  ]);

  const [selectedExportType, setSelectedExportType] = useState<ExportType>("SCOPE_PDF");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDownloadUrl, setActiveDownloadUrl] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const exportTypesList: Array<{ type: ExportType; label: string; icon: any; format: string }> = [
    { type: "SCOPE_PDF", label: "Scope Specification PDF", icon: FileText, format: "PDF" },
    { type: "ESTIMATE_PDF", label: "Commercial Estimate PDF", icon: FileSpreadsheet, format: "PDF" },
    { type: "PROPOSAL_PDF", label: "Client Proposal PDF (Digital Seal)", icon: Lock, format: "PDF" },
    { type: "PROJECT_SUMMARY_PDF", label: "Executive Project Summary PDF", icon: FileCheck, format: "PDF" },
    { type: "TASK_CSV", label: "Task Handover CSV", icon: FileSpreadsheet, format: "CSV" },
    { type: "TASK_MARKDOWN", label: "Task Handover Markdown (GFM)", icon: FileCode, format: "Markdown" },
    { type: "AUDIT_LOG_CSV", label: "Regulatory Audit Logs CSV", icon: ShieldCheck, format: "CSV" },
    { type: "ANALYTICS_CSV", label: "SaaS Performance Analytics CSV", icon: FileSpreadsheet, format: "CSV" }
  ];

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorBanner(null);

    // 1. Validation checks
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
      "audio/mpeg",
      "audio/wav",
      "audio/mp4"
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorBanner(`File format '${file.type || "unknown"}' rejected. Only PDF, DOCX, TXT, and Audio formats allowed.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorBanner(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 25MB limit.`);
      return;
    }

    // Add uploading file
    const newFile: FileItem = {
      id: `file_${Date.now()}`,
      fileName: file.name,
      fileSizeBytes: file.size,
      mimeType: file.type,
      sha256: null,
      status: "SCANNING",
      retentionDays: 365,
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toLocaleDateString(),
      downloadCount: 0
    };

    setFiles((prev) => [newFile, ...prev]);

    // Simulate malware scan & completion
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id
            ? {
                ...f,
                status: "AVAILABLE",
                sha256: "a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0"
              }
            : f
        )
      );
    }, 1200);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, status: "DELETED" } : f))
    );
  };

  const handleGenerateDownload = (file: FileItem) => {
    const token = `sig_${Date.now()}_exp900`;
    const url = `https://storage.specforge.io/files/${encodeURIComponent(file.fileName)}?token=${token}&expiresIn=900s`;
    setActiveDownloadUrl(url);
    setFiles((prev) =>
      prev.map((f) => (f.id === file.id ? { ...f, downloadCount: f.downloadCount + 1 } : f))
    );
  };

  const handleRequestExport = () => {
    setIsGenerating(true);
    setErrorBanner(null);

    const typeConfig = exportTypesList.find((t) => t.type === selectedExportType)!;
    const newExport: ExportItem = {
      id: `exp_${Date.now()}`,
      exportType: selectedExportType,
      fileName: `specforge_${selectedExportType.toLowerCase()}_${projectId}.${typeConfig.format.toLowerCase()}`,
      status: "PROCESSING",
      createdAt: "Just now"
    };

    setExports((prev) => [newExport, ...prev]);

    setTimeout(() => {
      setExports((prev) =>
        prev.map((item) =>
          item.id === newExport.id
            ? {
                ...item,
                status: "READY",
                downloadUrl: `https://storage.specforge.io/exports/${item.fileName}?token=signed_token_24h`,
                expiresAt: "In 24 hours",
                sha256: "b4c8996fb92427ae41e4649b934ca495...",
                fileSizeBytes: 350_000
              }
            : item
        )
      );
      setIsGenerating(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight">Secure Storage & Export Pipeline</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Presigned HMAC-SHA256 uploads, malware protection, short-lived signed downloads & asynchronous multi-format exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-emerald-300 border border-emerald-500/20">
            Tenant: {organizationId}
          </span>
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-indigo-300 border border-indigo-500/20">
            Role: {userRole}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="flex items-center gap-3 p-4 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-lg text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* Active Signed Download Modal Pill */}
      {activeDownloadUrl && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-200 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium text-emerald-300 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Short-Lived Signed Download URL Generated (Expires in 15 mins)
            </div>
            <p className="text-xs font-mono text-slate-300 break-all">{activeDownloadUrl}</p>
          </div>
          <button
            onClick={() => setActiveDownloadUrl(null)}
            className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-xs rounded font-medium transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("FILES")}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === "FILES"
              ? "border-emerald-400 text-emerald-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-4 h-4" /> Client Files & Media ({files.filter((f) => f.status !== "DELETED").length})
        </button>
        <button
          onClick={() => setActiveTab("EXPORTS")}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition ${
            activeTab === "EXPORTS"
              ? "border-indigo-400 text-indigo-300"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Download className="w-4 h-4" /> Multi-Format Exports (8 Types)
        </button>
      </div>

      {/* TAB 1: FILES & MEDIA UPLOADS */}
      {activeTab === "FILES" && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div className="p-6 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl bg-slate-900/50 text-center transition flex flex-col items-center justify-center gap-2">
            <Upload className="w-10 h-10 text-emerald-400 mb-1" />
            <div className="text-sm font-medium text-slate-200">
              Upload Client Brief, RFP, or Audio Discovery Interview
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Supported: PDF, DOCX, TXT, MP3, WAV (Max 25MB). Automatically verified with magic byte fidelity & virus scan.
            </p>
            <label className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition">
              Select File to Upload
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.mp3,.wav,.m4a"
                onChange={handleSimulateUpload}
              />
            </label>
          </div>

          {/* Files Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SHA-256 Checksum</th>
                  <th className="px-4 py-3">Retention Expiry</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className={file.status === "DELETED" ? "line-through text-slate-500" : ""}>
                        {file.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {(file.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="px-4 py-3">
                      {file.status === "AVAILABLE" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Clean & Verified
                        </span>
                      )}
                      {file.status === "SCANNING" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Scanning Safety
                        </span>
                      )}
                      {file.status === "MALWARE_DETECTED" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Quarantined
                        </span>
                      )}
                      {file.status === "DELETED" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-500 w-fit">
                          Deleted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {file.sha256 ? `${file.sha256.slice(0, 16)}...` : "Calculating..."}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{file.expiresAt}</td>
                    <td className="px-4 py-3 text-right">
                      {file.status === "AVAILABLE" && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleGenerateDownload(file)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-emerald-300 transition"
                            title="Generate Signed Download URL"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition"
                            title="Soft Delete File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXPORT ENGINE (8 FORMATS) */}
      {activeTab === "EXPORTS" && (
        <div className="space-y-6">
          {/* Export Launcher Card */}
          <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-slate-200">Generate Client or Regulatory Export</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {exportTypesList.map((item) => {
                const IconComponent = item.icon;
                const isSelected = selectedExportType === item.type;
                return (
                  <button
                    key={item.type}
                    onClick={() => setSelectedExportType(item.type)}
                    className={`p-3 rounded-lg border text-left flex items-start gap-3 transition ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/30 text-white"
                        : "border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <IconComponent className={`w-5 h-5 mt-0.5 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                    <div>
                      <div className="font-medium text-xs">{item.label}</div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 mt-1 inline-block">
                        {item.format}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Asynchronous generation queued via DurableJobQueue (24-hour expiry).
              </span>
              <button
                disabled={isGenerating}
                onClick={handleRequestExport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Enqueueing Export...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> Generate Export
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Exports Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Format / Type</th>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Checksum</th>
                  <th className="px-4 py-3">Link Expiry</th>
                  <th className="px-4 py-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {exports.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-4 py-3 font-medium text-xs text-indigo-300 font-mono">
                      {exp.exportType}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{exp.fileName}</td>
                    <td className="px-4 py-3">
                      {exp.status === "READY" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                      {exp.status === "PROCESSING" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Rendering
                        </span>
                      )}
                      {exp.status === "FAILED" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">
                      {exp.sha256 ? `${exp.sha256.slice(0, 16)}...` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{exp.expiresAt || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {exp.status === "READY" && exp.downloadUrl && (
                        <a
                          href={exp.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-xs font-medium inline-flex items-center gap-1 transition"
                        >
                          <Download className="w-3 h-3" /> Download
                        </a>
                      )}
                      {exp.status === "FAILED" && (
                        <button
                          onClick={() => {
                            setExports((prev) =>
                              prev.map((e) => (e.id === exp.id ? { ...e, status: "READY", expiresAt: "In 24 hours" } : e))
                            );
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded text-xs font-medium inline-flex items-center gap-1 transition"
                        >
                          <RefreshCw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
