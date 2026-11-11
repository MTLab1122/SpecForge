"use client";

import React from "react";
import { ScopeHealthBreakdown } from "@/lib/discovery/health-scorer";

interface ScopeHealthWidgetProps {
  health: ScopeHealthBreakdown;
  onFixRecommendation?: (recommendation: string) => void;
}

export function ScopeHealthWidget({ health, onFixRecommendation }: ScopeHealthWidgetProps) {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A+":
      case "A":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "B":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "C":
        return "bg-amber-100 text-amber-800 border-amber-300";
      default:
        return "bg-rose-100 text-rose-800 border-rose-300";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Top Overview: Health Gauge & Grade */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 flex items-center justify-center shrink-0">
            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-150"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-blue-600 transition-all duration-500 ease-out"
                strokeDasharray={`${health.overallScore}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-800">
              {health.overallScore}%
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Scope Health Score</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getGradeColor(health.grade)}`}>
                Grade {health.grade}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {health.status === "EXCELLENT" ? "Commercial-grade specification. Ready to lock." :
               health.status === "COMMERCIALLY_SAFE" ? "Good coverage. Minor edge cases remaining." :
               health.status === "NEEDS_ATTENTION" ? "Gaps in acceptance criteria or assumptions." :
               "High scope creep risk. Review recommendations."}
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Status</span>
          <span className="text-xs font-bold text-slate-700">{health.status.replace("_", " ")}</span>
        </div>
      </div>

      {/* 6 Sub-Factor Progress Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
        {[
          { label: "Completeness", score: health.completenessScore },
          { label: "Clarity & Detail", score: health.clarityScore },
          { label: "Conflict Free", score: health.conflictsScore },
          { label: "Acceptance Criteria", score: health.acceptanceCriteriaScore },
          { label: "Assumptions Grounded", score: health.assumptionsScore },
          { label: "Dependencies Mapped", score: health.dependencyScore }
        ].map((factor) => (
          <div key={factor.label} className="p-2.5 rounded-xl border border-slate-150 bg-slate-50/50 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">{factor.label}</span>
              <span className="font-bold text-slate-900">{factor.score}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  factor.score >= 80 ? "bg-emerald-500" :
                  factor.score >= 60 ? "bg-blue-500" :
                  factor.score >= 40 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${factor.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Actionable Recommendations Checklist */}
      {health.actionableRecommendations.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Actionable Scope Improvements ({health.actionableRecommendations.length})</span>
            </span>
          </div>

          <div className="space-y-1.5">
            {health.actionableRecommendations.map((rec, i) => (
              <div key={i} className="flex items-start justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-600 shrink-0">•</span>
                  <span>{rec}</span>
                </div>
                {onFixRecommendation && (
                  <button
                    onClick={() => onFixRecommendation(rec)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 shrink-0 underline"
                  >
                    Fix →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

