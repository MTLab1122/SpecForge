"use client";

import React, { useState } from "react";
import { ClientUpdateType } from "@/lib/validations/client-portal";
import {
  Activity,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Sparkles,
  ExternalLink,
  Plus,
  Send
} from "lucide-react";

export interface ProgressUpdateItem {
  id: string;
  updateType: ClientUpdateType;
  title: string;
  summaryMarkdown: string;
  scheduleHealth: "ON_TRACK" | "NEEDS_ATTENTION" | "AT_RISK";
  milestonesCompleted?: Array<{ title: string; completedDate: string; notes?: string }>;
  upcomingDeliverables?: Array<{ title: string; targetDate: string; owner?: string }>;
  blockersNotes?: string;
  sentAt?: string;
}

interface ClientProgressUpdateFeedProps {
  projectId: string;
  updates: ProgressUpdateItem[];
  isAgencyAdmin?: boolean;
  onCreateUpdate?: (data: any) => Promise<void>;
}

export const ClientProgressUpdateFeed: React.FC<ClientProgressUpdateFeedProps> = ({
  projectId,
  updates = [],
  isAgencyAdmin = false,
  onCreateUpdate
}) => {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [title, setTitle] = useState("Weekly Sprint Delivery Digest");
  const [summaryMarkdown, setSummaryMarkdown] = useState(
    "Sprint 3 concluded with all planned user stories passing automated acceptance suites. The team has initiated staging deployment for client review."
  );
  const [scheduleHealth, setScheduleHealth] = useState<"ON_TRACK" | "NEEDS_ATTENTION" | "AT_RISK">("ON_TRACK");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUpdates =
    filterType === "ALL" ? updates : updates.filter((u) => u.updateType === filterType);

  const getHealthBadge = (health: ProgressUpdateItem["scheduleHealth"]) => {
    switch (health) {
      case "ON_TRACK":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
      case "NEEDS_ATTENTION":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      case "AT_RISK":
        return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300";
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateUpdate) return;
    try {
      setIsSubmitting(true);
      await onCreateUpdate({
        title,
        summaryMarkdown,
        scheduleHealth,
        updateType: "WEEKLY_DIGEST",
        milestonesCompleted: [{ title: "Sprint 3 Core APIs", completedDate: new Date().toLocaleDateString() }],
        upcomingDeliverables: [{ title: "Staging User Flow Demo", targetDate: "Next Friday" }]
      });
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" /> Client Progress & Delivery Updates
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Regular sprint digests, milestone completions, and deliverable readiness notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAgencyAdmin && onCreateUpdate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Issue Client Digest
            </button>
          )}

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
          >
            <option value="ALL">All Updates ({updates.length})</option>
            <option value="WEEKLY_DIGEST">Weekly Digests</option>
            <option value="MILESTONE_COMPLETED">Milestones Completed</option>
            <option value="DELIVERABLE_READY">Deliverables Ready</option>
            <option value="CHANGE_REQUEST">Change Requests</option>
          </select>
        </div>
      </div>

      {/* Updates Stream */}
      <div className="space-y-4">
        {filteredUpdates.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            No progress updates posted yet. Updates will appear as development milestones advance.
          </div>
        ) : (
          filteredUpdates.map((update) => (
            <div
              key={update.id}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      update.updateType === "MILESTONE_COMPLETED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : update.updateType === "DELIVERABLE_READY"
                        ? "bg-blue-100 text-blue-800 border-blue-300"
                        : "bg-indigo-100 text-indigo-800 border-indigo-300"
                    }`}
                  >
                    {update.updateType.replace("_", " ")}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{update.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getHealthBadge(update.scheduleHealth)}`}>
                    {update.scheduleHealth.replace("_", " ")}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">{update.sentAt || "Recent"}</span>
                </div>
              </div>

              {/* Body */}
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {update.summaryMarkdown}
              </p>

              {/* Milestones Completed Sub-section */}
              {update.milestonesCompleted && update.milestonesCompleted.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Milestones Completed in this Sprint:
                  </h4>
                  <div className="space-y-1">
                    {update.milestonesCompleted.map((m, idx) => (
                      <div key={idx} className="text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span>{m.title}</span>
                        <span className="text-[11px] opacity-75">{m.completedDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Deliverables */}
              {update.upcomingDeliverables && update.upcomingDeliverables.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" /> Upcoming Deliverables & Key Dates:
                  </h4>
                  <div className="space-y-1">
                    {update.upcomingDeliverables.map((u, idx) => (
                      <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                        <span>{u.title}</span>
                        <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          {u.targetDate}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blockers or Attention Needed */}
              {update.blockersNotes && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Attention Needed:</strong> {update.blockersNotes}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Update Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Issue Client Progress Digest</h3>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Update Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Schedule Health</label>
              <select
                value={scheduleHealth}
                onChange={(e) => setScheduleHealth(e.target.value as any)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
              >
                <option value="ON_TRACK">On Track</option>
                <option value="NEEDS_ATTENTION">Needs Attention</option>
                <option value="AT_RISK">At Risk</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Summary (Non-Technical Markdown)</label>
              <textarea
                rows={4}
                required
                value={summaryMarkdown}
                onChange={(e) => setSummaryMarkdown(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow transition"
              >
                <Send className="w-3.5 h-3.5" /> Publish to Portal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
