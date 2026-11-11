"use client";

import React, { useState } from "react";
import type { ReportType, ReportFormat, ScheduledFrequency } from "@/lib/validations/analytics";
import {
  Download,
  Mail,
  FileSpreadsheet,
  FileText,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check
} from "lucide-react";

export interface ScheduledReportItem {
  id: string;
  reportType: ReportType;
  recipients: string[];
  format: ReportFormat;
  frequency: ScheduledFrequency;
  dayOfWeek?: number;
  isActive: boolean;
  lastSentAt?: string | null;
}

interface ReportsExportCenterProps {
  onExportCsv: (type: ReportType) => Promise<void>;
  onScheduleReport: (data: {
    reportType: ReportType;
    recipients: string[];
    format: ReportFormat;
    frequency: ScheduledFrequency;
    dayOfWeek: number;
  }) => Promise<void>;
  scheduledReports: ScheduledReportItem[];
  onToggleScheduleActive: (id: string, active: boolean) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  clientReadyReportMarkdown?: string;
  isExporting?: boolean;
}

export const ReportsExportCenter: React.FC<ReportsExportCenterProps> = ({
  onExportCsv,
  onScheduleReport,
  scheduledReports,
  onToggleScheduleActive,
  onDeleteSchedule,
  clientReadyReportMarkdown,
  isExporting = false
}) => {
  const [selectedExportType, setSelectedExportType] = useState<ReportType>("WEEKLY_EXECUTIVE");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state for scheduling
  const [formReportType, setFormReportType] = useState<ReportType>("WEEKLY_EXECUTIVE");
  const [formRecipients, setFormRecipients] = useState("");
  const [formFormat, setFormFormat] = useState<ReportFormat>("PDF");
  const [formFrequency, setFormFrequency] = useState<ScheduledFrequency>("WEEKLY");
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const emails = formRecipients
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) return;

    try {
      setIsSubmittingSchedule(true);
      await onScheduleReport({
        reportType: formReportType,
        recipients: emails,
        format: formFormat,
        frequency: formFrequency,
        dayOfWeek: formDayOfWeek
      });
      setShowScheduleModal(false);
      setFormRecipients("");
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!clientReadyReportMarkdown) return;
    navigator.clipboard.writeText(clientReadyReportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Export & Reporting Center */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Instant CSV Export Hub */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Instant Data Export (CSV)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Export structured metrics, financial ledgers, and delivery logs in RFC 4180 compliant CSV format.
          </p>

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Select Dataset
            </label>
            <select
              value={selectedExportType}
              onChange={(e) => setSelectedExportType(e.target.value as ReportType)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="WEEKLY_EXECUTIVE">Executive Performance & Time-Saved Summary</option>
              <option value="MONTHLY_FINANCIAL">Monthly Financial Pipeline & Ledger</option>
              <option value="PROJECT_HEALTH">Project Health & Turnaround Velocity</option>
              <option value="FUNNEL_COHORTS">Funnel Progression & Cohort Matrix</option>
            </select>

            <button
              onClick={() => onExportCsv(selectedExportType)}
              disabled={isExporting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Generating CSV..." : "Download Selected CSV"}</span>
            </button>
          </div>
        </div>

        {/* Client-Ready Executive Brief Preview */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Client-Ready Executive Report
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Generate a polished, jargon-free status digest ready to present directly to client executive stakeholders.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Preview Report</span>
            </button>
            <button
              onClick={handleCopyMarkdown}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-colors shadow"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied Markdown!" : "Copy Report Markdown"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scheduled Email Digests Hub */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Scheduled Email Digests
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Automatically deliver weekly or monthly executive summaries to founders and clients.
            </p>
          </div>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Digest</span>
          </button>
        </div>

        {/* Scheduled Reports List */}
        {scheduledReports.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No Scheduled Digests Active
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create an automated weekly email report to keep leadership aligned on utilization and pipeline.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {scheduledReports.map((sch) => (
              <div
                key={sch.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {sch.reportType.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {sch.frequency} ({sch.format})
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        sch.isActive
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {sch.isActive ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Recipients: {sch.recipients.join(", ")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleScheduleActive(sch.id, !sch.isActive)}
                    className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  >
                    {sch.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    onClick={() => onDeleteSchedule(sch.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                    title="Delete scheduled digest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Scheduled Digest */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Configure Scheduled Email Digest
            </h3>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                  Report Type
                </label>
                <select
                  value={formReportType}
                  onChange={(e) => setFormReportType(e.target.value as ReportType)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="WEEKLY_EXECUTIVE">Weekly Executive Digest</option>
                  <option value="MONTHLY_FINANCIAL">Monthly Financial Overview</option>
                  <option value="PROJECT_HEALTH">Project Delivery Status</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                  Recipient Email(s)
                </label>
                <input
                  type="text"
                  placeholder="founder@agency.io, client@corp.com"
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Separate multiple emails with commas.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                    Frequency
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as ScheduledFrequency)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500 block mb-1">
                    Format
                  </label>
                  <select
                    value={formFormat}
                    onChange={(e) => setFormFormat(e.target.value as ReportFormat)}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="PDF">PDF Attachment</option>
                    <option value="CSV">CSV Data Export</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow disabled:opacity-50"
                >
                  {isSubmittingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Client Ready Report */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Client Executive Status Report Preview
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Print report"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed border border-slate-200 dark:border-slate-800">
              {clientReadyReportMarkdown || "Loading report..."}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCopyMarkdown}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Markdown"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
