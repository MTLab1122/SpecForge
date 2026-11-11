"use client";

import React from "react";
import type { AgencyAnalyticsResponse } from "@/lib/validations/analytics";
import {
  DollarSign,
  Briefcase,
  Users,
  Activity,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Layers,
  Clock,
  ArrowUpRight
} from "lucide-react";

interface AgencyFinancialUtilizationPanelProps {
  metrics: AgencyAnalyticsResponse;
  isLoading?: boolean;
}

export const AgencyFinancialUtilizationPanel: React.FC<AgencyFinancialUtilizationPanelProps> = ({
  metrics,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  // Determine utilization health color
  const getUtilizationColor = (util: number) => {
    if (util > 95) return "text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";
    if (util >= 70) return "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800";
    return "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800";
  };

  return (
    <div className="space-y-6">
      {/* 4 Financial & Agency Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue Pipeline */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Revenue Pipeline
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${metrics.revenuePipeline.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active proposals in negotiation
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Active Proposals</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">In Review / Sent</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Outstanding Receivables
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${metrics.outstandingReceivables.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Invoiced milestone balance pending
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Awaiting Settlement</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">Ledger balance</span>
          </div>
        </div>

        {/* Blended Hourly Realization */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Blended Realization Rate
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              ${metrics.blendedHourlyRealization}/hr
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Effective billable hourly yield
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Benchmark Target</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">$100 - $150/hr</span>
          </div>
        </div>

        {/* Average Project Profit Margin */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Avg. Project Profit Margin
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {metrics.averageProjectProfitMargin}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              After rate buffer & role costs
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Healthy Margin Target</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400">&gt; 35%</span>
          </div>
        </div>
      </div>

      {/* Team Utilization & Workload Capacity Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Team Workload & Capacity Utilization
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Tracks billable committed hours against overall agency capacity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>{metrics.activeClients} Active Clients</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{metrics.activeProjects} Active Projects</span>
            </div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                Current Agency Utilization
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.teamUtilizationPercent}%
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getUtilizationColor(metrics.teamUtilizationPercent)}`}>
              {metrics.teamUtilizationPercent > 90
                ? "Near Full Capacity"
                : metrics.teamUtilizationPercent >= 70
                ? "Optimal Bandwidth"
                : "Available Capacity"}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.teamUtilizationPercent > 90
                  ? "bg-amber-500"
                  : metrics.teamUtilizationPercent >= 70
                  ? "bg-indigo-600"
                  : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(5, metrics.teamUtilizationPercent))}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>0% (Idle)</span>
            <span>70% (Target Minimum)</span>
            <span>85% (Optimal)</span>
            <span>100% (Maximum Burnout Risk)</span>
          </div>
        </div>

        {/* Strategic Guidance Box */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-start gap-3">
          <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Agency Operations Recommendation
            </p>
            <p>
              {metrics.teamUtilizationPercent >= 85
                ? "Team capacity is tightly booked. Consider raising rate cards or extending proposed delivery handover milestones for new incoming briefs."
                : metrics.teamUtilizationPercent >= 65
                ? "Team workload is balanced with healthy buffer for scope change requests and discovery sprints."
                : "You have open developer capacity. Accelerate draft proposals to pending clients to fill production runway."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
