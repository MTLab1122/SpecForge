"use client";

import React from "react";
import Link from "next/link";

export interface RecentProject {
  id: string;
  name: string;
  clientName: string;
  stage: "DISCOVERY" | "REQUIREMENTS_EXTRACTED" | "SCOPE_DRAFTED" | "ESTIMATION" | "PROPOSAL_SENT" | "CLIENT_APPROVED" | "TASK_DELIVERY";
  updatedTimeAgo: string;
  currency: string;
  targetBudget?: number;
  featuresCount: number;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  onCreateNew: () => void;
}

const STAGE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  DISCOVERY: { label: "Discovery", badgeClass: "bg-purple-50 text-purple-700 border-purple-200" },
  REQUIREMENTS_EXTRACTED: { label: "Extracted", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  SCOPE_DRAFTED: { label: "Scope v1", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  ESTIMATION: { label: "Estimating", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PROPOSAL_SENT: { label: "Proposal Sent", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CLIENT_APPROVED: { label: "Approved ✓", badgeClass: "bg-teal-50 text-teal-700 border-teal-200" },
  TASK_DELIVERY: { label: "In Delivery", badgeClass: "bg-slate-50 text-slate-700 border-slate-200" }
};

export function RecentProjectsList({ projects, onCreateNew }: RecentProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Recent Projects</h3>
          <p className="text-xs text-slate-500">Pick up right where you or your team left off</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition px-2 py-1"
          >
            View All ({projects.length}) →
          </Link>
          <button
            onClick={onCreateNew}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1"
          >
            <span>+</span>
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.slice(0, 6).map((proj) => {
          const stage = STAGE_CONFIG[proj.stage] || { label: proj.stage, badgeClass: "bg-slate-100 text-slate-700" };
          return (
            <Link
              key={proj.id}
              href={`/projects/${proj.id}`}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.badgeClass}`}>
                    {stage.label}
                  </span>
                  <span className="text-[11px] text-slate-400">{proj.updatedTimeAgo}</span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">{proj.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{proj.clientName || "Direct / Internal"}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-200/60">
                <span>{proj.featuresCount} Features</span>
                {proj.targetBudget && (
                  <span className="font-semibold text-slate-800">
                    {proj.currency} {proj.targetBudget.toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
