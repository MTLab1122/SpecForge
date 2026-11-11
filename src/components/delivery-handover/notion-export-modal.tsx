"use client";

import React, { useState } from "react";
import { NotionExportAdapter, NotionExportResult } from "@/lib/integrations/adapters/notion-adapter";
import { InternalTask } from "@/lib/validations/delivery-handover";
import {
  FileText,
  Copy,
  Check,
  X,
  ExternalLink,
  Database,
  FileCode,
  Download
} from "lucide-react";

interface NotionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  scopeSummary: string;
  estimateTotal: number;
  currency?: string;
  tasks: InternalTask[];
  onDirectNotionExport?: (format: "DATABASE" | "PAGE") => Promise<void>;
}

export const NotionExportModal: React.FC<NotionExportModalProps> = ({
  isOpen,
  onClose,
  projectTitle,
  scopeSummary,
  estimateTotal,
  currency = "USD",
  tasks,
  onDirectNotionExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<"DATABASE" | "PAGE">("DATABASE");
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const result: NotionExportResult = NotionExportAdapter.exportToNotion({
    projectTitle,
    scopeSummary,
    estimateTotal,
    currency,
    tasks,
    format: selectedFormat
  });

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(result.markdownContent);
    setCopiedType("markdown");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyJson = () => {
    const payload = selectedFormat === "DATABASE" ? result.databaseRows : result.blocks;
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedType("json");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDirectPush = async () => {
    if (!onDirectNotionExport) return;
    try {
      setIsExporting(true);
      await onDirectNotionExport(selectedFormat);
      onClose();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Export to Notion Workspace</h3>
              <p className="text-xs text-slate-500">Generate Notion-compatible databases, pages, and API blocks.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector */}
        <div className="space-y-2 text-xs">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">Choose Notion Export Format:</label>
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setSelectedFormat("DATABASE")}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                selectedFormat === "DATABASE"
                  ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <Database className="w-4 h-4 text-amber-500" /> Notion Database
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Structured rows with status, priority tags, estimated hours, and milestone relations.
              </p>
            </div>

            <div
              onClick={() => setSelectedFormat("PAGE")}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                selectedFormat === "PAGE"
                  ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-500 text-amber-950 dark:text-amber-200 ring-2 ring-amber-500/20"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                <FileCode className="w-4 h-4 text-amber-500" /> Notion Page & Checklist
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">
                Rich text callout blocks, executive scope summary, and interactive to-do checklist items.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Summary */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-300">
            <span>Project:</span>
            <span className="text-slate-900 dark:text-white font-bold">{projectTitle}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Commercial Baseline:</span>
            <span className="font-mono">{currency} {estimateTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tasks to Export:</span>
            <span>{tasks.length} tasks ready for import</span>
          </div>
        </div>

        {/* Copy Tools */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 transition text-slate-700 dark:text-slate-200"
          >
            {copiedType === "markdown" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedType === "markdown" ? "Markdown Copied!" : "Copy Notion Markdown"}
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 transition text-slate-700 dark:text-slate-200"
          >
            {copiedType === "json" ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copiedType === "json" ? "JSON Blocks Copied!" : "Copy Notion JSON"}
          </button>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
          >
            Close
          </button>

          {onDirectNotionExport && (
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDirectPush}
              className="px-5 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-xl font-bold shadow transition flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Push to Connected Notion DB
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
