"use client";

import React, { useState } from "react";
import type {
  JourneySloReport,
  ErrorBudgetStatus,
  IncidentBudgetImpact,
  CriticalJourneyKey
} from "@/lib/reliability/slo-tracker";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Zap,
  Clock,
  Gauge,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Activity,
  Server,
  FileText,
  Filter
} from "lucide-react";

interface SloDashboardProps {
  initialJourneys: JourneySloReport[];
  initialBudget: ErrorBudgetStatus;
  initialIncidents: IncidentBudgetImpact[];
  onToggleFreezeOverride?: (freeze: boolean | null) => Promise<void>;
}

export const SloDashboard: React.FC<SloDashboardProps> = ({
  initialJourneys,
  initialBudget,
  initialIncidents,
  onToggleFreezeOverride
}) => {
  const [journeys, setJourneys] = useState<JourneySloReport[]>(initialJourneys);
  const [budget, setBudget] = useState<ErrorBudgetStatus>(initialBudget);
  const [incidents, setIncidents] = useState<IncidentBudgetImpact[]>(initialIncidents);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASSING" | "WARNING" | "BREACHED">("ALL");
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredJourneys = journeys.filter((j) => {
    if (statusFilter === "ALL") return true;
    return j.status === statusFilter;
  });

  const handleFreezeToggle = async (targetState: boolean | null) => {
    if (!onToggleFreezeOverride) return;
    try {
      setIsUpdating(true);
      await onToggleFreezeOverride(targetState);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: JourneySloReport["status"]) => {
    switch (status) {
      case "PASSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Passing
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" /> Warning
          </span>
        );
      case "BREACHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3 h-3" /> Breached
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 font-sans">
      {/* Top Banner: SRE Reliability Target Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            <Gauge className="w-3.5 h-3.5" /> SRE Production Policy & SLOs
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Reliability Targets & Error Budget Gate
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Continuous tracking across 16 user-facing critical journeys. Enforces a 99.5% monthly availability SLO,
            governing release velocity through automatic deployment freezes when error budgets are exhausted.
          </p>
        </div>

        {/* Release Gate Indicator Card */}
        <div className="z-10 bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 min-w-[280px]">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Deployment Gate</span>
          <div className="flex items-center gap-2 mt-2">
            {budget.releaseGateStatus === "RELEASES_ALLOWED" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                <Unlock className="w-4 h-4" /> Releases Allowed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase animate-pulse">
                <Lock className="w-4 h-4" /> Release Freeze Active
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 mt-2">
            {budget.releaseGateStatus === "RELEASES_ALLOWED"
              ? "Healthy budget. Feature deploys permitted."
              : "Budget exhausted or 14.4x burn rate. Only P0 & security fixes allowed."}
          </p>
        </div>
      </div>

      {/* Error Budget Burn & Multi-Burn-Rate Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Error Budget Gauge Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              Monthly Error Budget
            </h2>
            <span className="text-xs font-medium text-slate-400">99.5% SLO (0.5% Budget)</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-400">Consumed: {budget.consumedBudgetPercent}%</span>
              <span className={budget.remainingBudgetPercent > 20 ? "text-emerald-600" : "text-rose-600"}>
                Remaining: {budget.remainingBudgetPercent}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budget.isExhausted ? "bg-rose-500" : budget.remainingBudgetPercent < 30 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, budget.remainingBudgetPercent)}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            Total permitted downtime: <span className="font-semibold text-slate-700 dark:text-slate-300">216 mins / month</span> (~3h 36m).
          </div>
        </div>

        {/* Burn Rate Velocity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Burn Rate Velocity
            </h2>
            <span className="text-xs font-medium text-slate-400">Multi-Window</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">1-Hour</span>
              <div className={`text-base font-bold mt-0.5 ${budget.burnRate1h >= 14.4 ? "text-rose-500" : "text-slate-800 dark:text-white"}`}>
                {budget.burnRate1h}x
              </div>
              <span className="text-[9px] text-slate-400">Limit: 14.4x</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">6-Hour</span>
              <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                {budget.burnRate6h}x
              </div>
              <span className="text-[9px] text-slate-400">Limit: 6.0x</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">24-Hour</span>
              <div className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                {budget.burnRate24h}x
              </div>
              <span className="text-[9px] text-slate-400">Limit: 3.0x</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {budget.burnRate1h >= 14.4
              ? "CRITICAL: 1h burn consumes 2% of budget per hour. Auto-freeze active."
              : "Burn velocity within safe thresholds (≤ 1.0x baseline)."}
          </p>
        </div>

        {/* 20% Incident Rule Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Incident Budget Policy
            </h2>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">SRE Rule</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200 space-y-1">
            <span className="font-bold">Mandatory Blameless Post-Mortem:</span>
            <p className="text-[11px] text-purple-700 dark:text-purple-300">
              Any single incident consuming <span className="font-bold">&gt;20% of monthly budget</span> (&gt;43.2 mins downtime)
              mandates a documented post-mortem and remediation before resuming feature velocity.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Recent Incidents Logged:</span>
            <span className="font-bold text-slate-900 dark:text-white">{incidents.length}</span>
          </div>
        </div>
      </div>

      {/* Active Alerts Banner if any */}
      {budget.activeAlerts.length > 0 && (
        <div className="space-y-2">
          {budget.activeAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-sm animate-fade-in"
            >
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{alert.title}: </span>
                <span>{alert.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Critical Journeys SLO Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              16 Critical User Journeys (30-Day Window)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              SLO targets calibrated for customer trust and transaction safety.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs">
            {(["ALL", "PASSING", "WARNING", "BREACHED"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  statusFilter === filter
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Critical Journey</th>
                <th className="py-3 px-4">Primary SLI</th>
                <th className="py-3 px-4 text-center">SLO Target</th>
                <th className="py-3 px-4 text-center">30-Day Actual</th>
                <th className="py-3 px-4 text-center">p95 Latency</th>
                <th className="py-3 px-4 text-center">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredJourneys.map((j) => (
                <tr key={j.journeyKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {j.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {j.primarySli}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                    {j.sloTargetPercent}%
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold">
                    <span
                      className={
                        j.currentActualPercent >= j.sloTargetPercent
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {j.currentActualPercent}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {j.p95LatencyMs ? (
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {j.p95LatencyMs}ms {j.latencyTargetMs && `(≤ ${j.latencyTargetMs}ms)`}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(j.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Error Budget Impact Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            Recent Incidents & Budget Consumption
          </h2>
          <span className="text-xs text-slate-400">Monthly Window (216 mins budget)</span>
        </div>

        {incidents.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No production incidents recorded in this window.</p>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.incidentId}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{inc.title}</span>
                    {inc.requiresPostMortem && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        Post-Mortem Required (&gt;20%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Duration: {inc.durationMinutes} mins | ID: {inc.incidentId}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    -{inc.budgetConsumedPercent}% Error Budget
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};