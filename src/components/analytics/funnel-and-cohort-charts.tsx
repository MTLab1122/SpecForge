"use client";

import React, { useState } from "react";
import type { FunnelStage, CohortRow } from "@/lib/validations/analytics";
import {
  Users,
  TrendingUp,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  BarChart2,
  AlertCircle
} from "lucide-react";

interface FunnelAndCohortChartsProps {
  funnelStages: FunnelStage[];
  cohortData: {
    cohorts: CohortRow[];
    wauMauRatio: { wau: number; mau: number; stickinessPercent: number };
    featureAdoption: Record<string, number>;
  };
  isLoading?: boolean;
}

export const FunnelAndCohortCharts: React.FC<FunnelAndCohortChartsProps> = ({
  funnelStages,
  cohortData,
  isLoading = false
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"funnel" | "cohorts">("funnel");

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  // Retention heatmap color helper
  const getRetentionColor = (pct: number) => {
    if (pct >= 60) return "bg-emerald-600 text-white font-semibold";
    if (pct >= 45) return "bg-emerald-500/80 text-white";
    if (pct >= 35) return "bg-emerald-500/40 text-emerald-950 dark:text-emerald-100";
    if (pct >= 20) return "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200";
    return "bg-slate-100 dark:bg-slate-900 text-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Subtab Toggle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Growth & Product Adoption Intelligence
          </h2>
        </div>

        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab("funnel")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "funnel"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            8-Stage Activation Funnel
          </button>
          <button
            onClick={() => setActiveSubTab("cohorts")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "cohorts"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Cohort Retention & Stickiness
          </button>
        </div>
      </div>

      {/* 8-Stage Activation Funnel View */}
      {activeSubTab === "funnel" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              End-to-End User Activation to Commercial Payment Funnel
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tracks user progression from onboarding registration through initial milestone payment settlement.
            </p>
          </div>

          <div className="space-y-4">
            {funnelStages.map((stage, idx) => {
              const maxUsers = funnelStages[0].userCount || 1000;
              const barWidthPct = Math.max(8, Math.round((stage.userCount / maxUsers) * 100));

              return (
                <div
                  key={stage.stageKey}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {stage.stageName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {stage.userCount.toLocaleString()} users
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-semibold">
                        {stage.conversionPercent}% overall
                      </span>
                      {idx > 0 && stage.dropoffPercent > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px]">
                          -{stage.dropoffPercent}% step drop
                        </span>
                      )}
                      {stage.medianDurationHours !== undefined && (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px] hidden md:inline">
                          ~{stage.medianDurationHours}h avg
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Funnel Progress Visual Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort Retention & Stickiness View */}
      {activeSubTab === "cohorts" && (
        <div className="space-y-6">
          {/* Stickiness Summary Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Weekly Active Users (WAU)
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {cohortData.wauMauRatio.wau.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Active past 7 days</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Monthly Active Users (MAU)
              </span>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {cohortData.wauMauRatio.mau.toLocaleString()}
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Active past 30 days</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                WAU / MAU Stickiness Ratio
              </span>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {cohortData.wauMauRatio.stickinessPercent}%
              </div>
              <span className="text-xs text-slate-400 mt-1 block">Industry benchmark &gt; 35%</span>
            </div>
          </div>

          {/* Retention Matrix Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Signup Cohort Retention Matrix
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Percentage of registered users returning to SpecForge in subsequent weeks.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Cohort</th>
                    <th className="py-2.5 px-3">Signups</th>
                    <th className="py-2.5 px-3 text-center">W0</th>
                    <th className="py-2.5 px-3 text-center">W1</th>
                    <th className="py-2.5 px-3 text-center">W2</th>
                    <th className="py-2.5 px-3 text-center">W3</th>
                    <th className="py-2.5 px-3 text-center">W4</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {cohortData.cohorts.map((cohort) => (
                    <tr key={cohort.cohortPeriod} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                        {cohort.cohortPeriod}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {cohort.newUsersCount}
                      </td>
                      {cohort.retentionByWeek.map((pct, wIdx) => (
                        <td key={wIdx} className="py-2 px-2 text-center">
                          <span
                            className={`inline-block w-12 py-1 rounded text-center text-xs transition-colors ${getRetentionColor(
                              pct
                            )}`}
                          >
                            {pct}%
                          </span>
                        </td>
                      ))}
                      {/* Empty cells if cohort is young */}
                      {Array.from({ length: Math.max(0, 5 - cohort.retentionByWeek.length) }).map(
                        (_, emptyIdx) => (
                          <td key={`empty-${emptyIdx}`} className="py-2 px-2 text-center text-slate-400">
                            -
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feature Adoption Breakdown */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Core Feature Adoption Penetration
            </h3>
            <div className="space-y-3">
              {Object.entries(cohortData.featureAdoption).map(([featureName, adoptionPct]) => (
                <div key={featureName} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{featureName}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{adoptionPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${adoptionPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
