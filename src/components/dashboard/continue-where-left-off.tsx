"use client";

import React from "react";
import Link from "next/link";

export interface ProjectResumeItem {
  projectId: string;
  projectName: string;
  clientName: string;
  lastSection: "BRIEF_UPLOAD" | "AI_EXTRACTION" | "SCOPE_BUILDER" | "ESTIMATE_BUILDER" | "PROPOSAL_PREVIEW" | "TASK_BOARD";
  lastAction: string;
  resumeUrl: string;
  completionPercent: number;
  lastAccessedTimeAgo: string;
}

interface ContinueWhereLeftOffProps {
  item: ProjectResumeItem | null;
}

const SECTION_BADGES: Record<string, { label: string; color: string }> = {
  BRIEF_UPLOAD: { label: "Discovery Ingestion", color: "bg-purple-100 text-purple-800 border-purple-200" },
  AI_EXTRACTION: { label: "Review AI Extraction", color: "bg-amber-100 text-amber-800 border-amber-200" },
  SCOPE_BUILDER: { label: "Scope Builder", color: "bg-blue-100 text-blue-800 border-blue-200" },
  ESTIMATE_BUILDER: { label: "Estimation Matrix", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  PROPOSAL_PREVIEW: { label: "Proposal Review", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  TASK_BOARD: { label: "Task Delivery Board", color: "bg-slate-100 text-slate-800 border-slate-200" }
};

export function ContinueWhereLeftOff({ item }: ContinueWhereLeftOffProps) {
  if (!item) return null;

  const badge = SECTION_BADGES[item.lastSection] || { label: "Active Project", color: "bg-slate-100 text-slate-800" };

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
              Continue Where You Left Off
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs text-slate-400">• {item.lastAccessedTimeAgo}</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-1">
            {item.projectName}
            {item.clientName && (
              <span className="text-sm font-normal text-slate-500 ml-2">for {item.clientName}</span>
            )}
          </h3>

          <p className="text-xs text-slate-600">
            Last Action: <span className="font-medium text-slate-800">{item.lastAction}</span>
          </p>

          {/* Mini progress bar */}
          <div className="flex items-center gap-2 pt-1 max-w-xs">
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full" 
                style={{ width: `${item.completionPercent}%` }} 
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-500 shrink-0">
              {item.completionPercent}% Complete
            </span>
          </div>
        </div>

        <Link
          href={item.resumeUrl}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition shrink-0"
        >
          <span>Resume Workflow</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
