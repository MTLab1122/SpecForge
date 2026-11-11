"use client";

import React, { useState } from "react";
import { SyncLedgerEntry } from "@/lib/integrations/orchestrator";
import {
  History,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  AlertCircle
} from "lucide-react";

interface ExportHistoryProps {
  records: SyncLedgerEntry[];
  onRetry: (syncRecordId: string) => Promise<void>;
}

export const ExportHistoryTable: React.FC<ExportHistoryProps> = ({ records, onRetry }) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    try {
      setRetryingId(id);
      await onRetry(id);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <History className="w-5 h-5" />
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Export & Sync History</h3>
        </div>
        <span className="text-xs text-slate-500">{records.length} sync transactions logged</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Task Deliverable</th>
              <th className="py-3 px-3">Tool</th>
              <th className="py-3 px-3">External ID</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-center">Retries</th>
              <th className="py-3 px-3">Last Sync</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {records.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No task exports recorded yet. Choose tasks above to initiate your first external sync.
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    {rec.taskTitle}
                    {rec.lastError && (
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 line-clamp-1">
                        {rec.lastError}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    {rec.provider}
                  </td>
                  <td className="py-3 px-3 font-mono font-medium">
                    {rec.externalUrl ? (
                      <a
                        href={rec.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {rec.externalId} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">{rec.externalId || "—"}</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        rec.syncStatus === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                          : rec.syncStatus === "FAILED"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                      }`}
                    >
                      {rec.syncStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">
                    {rec.retryCount}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {rec.lastSyncAt}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {rec.syncStatus === "FAILED" && (
                      <button
                        onClick={() => handleRetry(rec.id)}
                        disabled={retryingId === rec.id}
                        className="px-2.5 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1 mx-auto"
                      >
                        <RefreshCw className={`w-3 h-3 ${retryingId === rec.id ? "animate-spin" : ""}`} /> Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
