"use client";

import React, { useState } from "react";
import { InternalTask, IntegrationProvider } from "@/lib/validations/delivery-handover";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Square
} from "lucide-react";

interface TaskExportOrchestratorProps {
  tasks: InternalTask[];
  availableProviders?: IntegrationProvider[];
  onExecuteExport: (data: {
    provider: IntegrationProvider;
    selectedTaskIds: string[];
    confirmedByUser: boolean;
    targetProjectOrList?: string;
  }) => Promise<void>;
}

export const TaskExportOrchestrator: React.FC<TaskExportOrchestratorProps> = ({
  tasks,
  availableProviders = ["JIRA", "LINEAR", "TRELLO", "GITHUB"],
  onExecuteExport
}) => {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider>("LINEAR");
  const [selectedIds, setSelectedIds] = useState<string[]>(tasks.map((t) => t.id));
  const [targetProjectOrList, setTargetProjectOrList] = useState("");
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const toggleTask = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === tasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tasks.map((t) => t.id));
    }
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userConfirmed || selectedIds.length === 0) return;

    try {
      setIsExporting(true);
      await onExecuteExport({
        provider: selectedProvider,
        selectedTaskIds: selectedIds,
        confirmedByUser: userConfirmed,
        targetProjectOrList: targetProjectOrList || undefined
      });
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 4000);
    } finally {
      setIsExporting(false);
    }
  };

  const totalSelectedHours = tasks
    .filter((t) => selectedIds.includes(t.id))
    .reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" /> Export Approved Tasks to External Tool
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Convert client-approved scope items directly into Jira issues, Linear tickets, Trello cards, or GitHub issues.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          Selected: {selectedIds.length} tasks ({totalSelectedHours}h)
        </div>
      </div>

      <form onSubmit={handleExportSubmit} className="space-y-6 text-xs">
        {/* Step 1: Destination Provider Selector */}
        <div className="space-y-2">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            1. Select Destination Platform:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableProviders.map((prov) => (
              <button
                type="button"
                key={prov}
                onClick={() => setSelectedProvider(prov)}
                className={`p-3 rounded-xl border text-center font-bold transition flex flex-col items-center gap-1 ${
                  selectedProvider === prov
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                }`}
              >
                <span>{prov}</span>
                <span className="text-[10px] font-normal opacity-75">
                  {prov === "JIRA" ? "Jira Cloud" : prov === "LINEAR" ? "Linear App" : prov === "TRELLO" ? "Trello Board" : "GitHub Repo"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Task Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              2. Select Tasks to Export:
            </label>
            <button
              type="button"
              onClick={selectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              {selectedIds.length === tasks.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((task) => {
              const isSelected = selectedIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                    isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10" : "hover:bg-slate-50 dark:hover:bg-slate-850"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-indigo-600">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{task.title}</div>
                      <div className="text-[11px] text-slate-500">
                        Milestone: {task.milestoneTitle || "Phase 1"} · {task.estimatedHours}h
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      task.priority === "CRITICAL"
                        ? "bg-rose-100 text-rose-800"
                        : task.priority === "HIGH"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 3: Explicit User Approval Gate */}
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={userConfirmed}
              onChange={(e) => setUserConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-slate-800 dark:text-slate-200 leading-relaxed">
              <strong>Explicit User Approval:</strong> I confirm that I want to export these <strong>{selectedIds.length} approved tasks</strong> to <strong>{selectedProvider}</strong>. Tasks will be created idempotently to prevent duplicates.
            </span>
          </label>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-slate-400 text-[11px]">
            No external action occurs without explicit confirmation.
          </span>

          <button
            type="submit"
            disabled={!userConfirmed || selectedIds.length === 0 || isExporting}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition disabled:opacity-50"
          >
            {isExporting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isExporting ? "Exporting Tasks..." : `Approve & Export (${selectedIds.length})`}
          </button>
        </div>
      </form>
    </div>
  );
};
