"use client";

import React, { useState } from "react";
import type { OperationalExportType } from "@/lib/admin/operational-export-engine";
import {
  Download,
  FileSpreadsheet,
  Users,
  Building2,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Clock
} from "lucide-react";

interface OperationalExportCenterProps {
  onDownloadCsv: (type: OperationalExportType) => Promise<void>;
  isExporting?: boolean;
}

export const OperationalExportCenter: React.FC<OperationalExportCenterProps> = ({
  onDownloadCsv,
  isExporting = false
}) => {
  const [downloadingType, setDownloadingType] = useState<OperationalExportType | null>(null);

  const handleDownload = async (type: OperationalExportType) => {
    try {
      setDownloadingType(type);
      await onDownloadCsv(type);
    } finally {
      setDownloadingType(null);
    }
  };

  const exportCards = [
    {
      type: "USERS" as OperationalExportType,
      title: "Users Master Directory",
      description: "Full export of all registered accounts including emails, roles, organization memberships, and suspension status.",
      icon: Users,
      badge: "Account Data"
    },
    {
      type: "WORKSPACES" as OperationalExportType,
      title: "Workspaces & Plan Ledgers",
      description: "Complete list of active organizations with seat counts, project counts, AI credit consumption, and subscription status.",
      icon: Building2,
      badge: "Billing Data"
    },
    {
      type: "AUDIT_LOGS" as OperationalExportType,
      title: "Institutional Audit Logs",
      description: "Immutable compliance log containing actor IDs, sensitive operations, timestamps, IP addresses, and state changes.",
      icon: ShieldCheck,
      badge: "Security Audit"
    },
    {
      type: "ANALYTICS" as OperationalExportType,
      title: "Platform Growth & Operations",
      description: "Executive report detailing MRR, WAU/MAU stickiness, token burn rate, and support SLA turnaround velocities.",
      icon: TrendingUp,
      badge: "BI Analytics"
    }
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <Download className="w-4 h-4" />
          <span>Operational Business Data Exports</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
          Export System & Compliance Records
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Download clean, RFC 4180 compliant CSV exports formatted for BI analytics and institutional compliance audits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportCards.map((card) => {
          const Icon = card.icon;
          const isCurrentLoading = downloadingType === card.type;

          return (
            <div
              key={card.type}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {card.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Format: RFC 4180 CSV
                </span>
                <button
                  onClick={() => handleDownload(card.type)}
                  disabled={isExporting || isCurrentLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isCurrentLoading ? "Generating..." : "Download CSV"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

