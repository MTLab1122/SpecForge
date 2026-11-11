"use client";

import React from "react";
import type { ProjectAnalyticsResponse } from "@/lib/validations/analytics";
import {
  FolderGit2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Gauge,
  FileCheck,
  RotateCcw
} from "lucide-react";

interface ProjectHealthAnalyticsViewProps {
  metrics: ProjectAnalyticsResponse;
  isLoading?: boolean;
}

export const ProjectHealthAnalyticsView: React.FC<ProjectHealthAnalyticsViewProps> = ({
  metrics,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const isVariancePositive = metrics.estimateAccuracyVariancePercent > 0;
  const paymentPercentage =
    metrics.invoicedAmount > 0
      ? Math.round((metrics.paidAmount / metrics.invoicedAmount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Project Header Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <FolderGit2 className="w-4 h-4" />
            <span>Active Project Diagnostics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.projectTitle}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            ID: {metrics.projectId}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Scope Complete: {metrics.scopeCompletenessScore}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Turnaround: {metrics.approvalTurnaroundHours}h</span>
          </div>
        </div>
      </div>

      {/* 3 Health Cards: Completeness, Accuracy Variance, Turnaround */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scope Completeness Card */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scope Completeness
              </span>
              <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {metrics.scopeCompletenessScore}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              User stories verified with full acceptance criteria.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${metrics.scopeCompletenessScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Estimate Accuracy Variance */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Estimate Variance
              </span>
              {isVariancePositive ? (
                <TrendingUp className="w-4 h-4 text-amber-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              )}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {isVariancePositive ? `+${metrics.estimateAccuracyVariancePercent}%` : `${metrics.estimateAccuracyVariancePercent}%`}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Actual logged effort vs estimated forecast hours.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Accuracy Status</span>
            <span
              className={`font-semibold ${
                Math.abs(metrics.estimateAccuracyVariancePercent) <= 10
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {Math.abs(metrics.estimateAccuracyVariancePercent) <= 10
                ? "Highly Accurate (±10%)"
                : "Variance Advisory"}
            </span>
          </div>
        </div>

        {/* Approval Turnaround Velocity */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Approval Turnaround
              </span>
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {metrics.approvalTurnaroundHours} Hours
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Time elapsed from proposal sent to client sign-off.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Industry Avg Benchmark</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">120 - 168 Hours</span>
          </div>
        </div>
      </div>

      {/* Delivery Progress & Change Request Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Progress Bar & Tasks */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Delivery Execution Progress
              </h3>
            </div>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {metrics.deliveryProgressPercent}%
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Handed-over engineering tasks completed across synced systems (Jira, Linear, GitHub).
          </p>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${metrics.deliveryProgressPercent}%` }}
            />
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Approved Scope</span>
            <span>Handover Sprint Execution</span>
            <span>Client Handover Ready</span>
          </div>
        </div>

        {/* Change Request Frequency & Cost Impact */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Scope Change Requests
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-semibold">
              {metrics.changeRequestCount} Orders Filed
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Modifications requested after initial baseline scope approval.
          </p>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Change Cost Impact</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {metrics.currency} {metrics.changeRequestCostImpact.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Scope Creep Defense</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">100% Monetized</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Settlement Ledger */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Milestone Financial Status
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {paymentPercentage}% Settled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
            <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Invoiced</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              {metrics.currency} {metrics.invoicedAmount.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Paid to Date</span>
            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {metrics.currency} {metrics.paidAmount.toLocaleString()}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Outstanding Balance</span>
            <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {metrics.currency} {metrics.outstandingAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Stacked Payment Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${paymentPercentage}%` }}
          />
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${100 - paymentPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
