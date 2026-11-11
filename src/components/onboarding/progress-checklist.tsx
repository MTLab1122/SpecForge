"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ActivationChecklistStatus } from "@/lib/validations/onboarding";

interface ProgressChecklistProps {
  checklist: ActivationChecklistStatus;
  onRefresh?: () => void;
}

const CHECKLIST_STEPS = [
  { key: "createWorkspace", label: "Create Workspace", link: "/settings", est: "1 min" },
  { key: "addFirstClient", label: "Add First Client", link: "/clients", est: "1 min" },
  { key: "createFirstProject", label: "Create First Project", link: "/projects/new", est: "2 mins" },
  { key: "uploadBrief", label: "Upload or Paste Client Brief", link: "/projects", est: "1 min" },
  { key: "generateRequirements", label: "Generate Requirements (AI)", link: "/projects", est: "2 mins" },
  { key: "reviewAiOutput", label: "Review & Confirm AI Output", link: "/projects", est: "3 mins" },
  { key: "createEstimate", label: "Create Estimate with Rates", link: "/projects", est: "2 mins" },
  { key: "sendProposal", label: "Send Proposal Link to Client", link: "/projects", est: "1 min" },
  { key: "obtainApproval", label: "Obtain Client Sign-Off", link: "/projects", est: "Async" },
  { key: "generateTasks", label: "Generate & Export Tasks", link: "/projects", est: "1 min" }
];

export function ProgressChecklist({ checklist }: ProgressChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const completedCount = CHECKLIST_STEPS.filter(
    (s) => (checklist as any)[s.key] === true
  ).length;
  const percentComplete = Math.round((completedCount / CHECKLIST_STEPS.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
      {/* Header with Progress Ring & Toggle */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition"
      >
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 w-[36px] h-[36px] min-w-[36px] min-h-[36px] shrink-0 flex items-center justify-center">
            <svg className="h-9 w-9 transform -rotate-90" width="36" height="36" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600 transition-all duration-500 ease-out"
                strokeDasharray={`${percentComplete}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-800">
              {percentComplete}%
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Activation Checklist</h3>
              {checklist.isActivated ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Activated ✓
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {completedCount} / 10 Steps
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {checklist.isActivated 
                ? "Full activation achieved! Core workflow completed." 
                : "Complete key steps to activate your workspace."}
            </p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1">
          {isCollapsed ? "Expand ↓" : "Collapse ↑"}
        </button>
      </div>

      {/* Checklist Items */}
      {!isCollapsed && (
        <div className="p-4 space-y-2">
          {CHECKLIST_STEPS.map((step, idx) => {
            const isDone = (checklist as any)[step.key] === true;
            return (
              <div 
                key={step.key}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                  isDone 
                    ? "bg-slate-50/50 border-slate-150 text-slate-500" 
                    : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isDone 
                      ? "bg-emerald-600 text-white" 
                      : "border-2 border-slate-300 text-slate-400"
                  }`}>
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <div>
                    <span className={`text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {step.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">{step.est}</span>
                  {!isDone && (
                    <Link
                      href={step.link}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      Start →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
