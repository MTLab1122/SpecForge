"use client";

import React, { useState } from "react";
import type { DateRangePeriod } from "@/lib/validations/analytics";
import {
  BarChart3,
  TrendingUp,
  Briefcase,
  Users,
  FolderGit2,
  FileSpreadsheet,
  Download,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock
} from "lucide-react";

export type AnalyticsTab = "overview" | "agency" | "projects" | "funnel_cohorts" | "reports";

interface AnalyticsDashboardShellProps {
  currentPeriod: DateRangePeriod;
  onPeriodChange: (period: DateRangePeriod) => void;
  activeTab: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  onQuickExport?: () => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export const AnalyticsDashboardShell: React.FC<AnalyticsDashboardShellProps> = ({
  currentPeriod,
  onPeriodChange,
  activeTab,
  onTabChange,
  onQuickExport,
  isRefreshing = false,
  onRefresh,
  children
}) => {
  const periods: Array<{ label: string; value: DateRangePeriod }> = [
    { label: "Last 7 Days", value: "7D" },
    { label: "Last 30 Days", value: "30D" },
    { label: "Last 90 Days", value: "90D" },
    { label: "Past Year", value: "12M" },
    { label: "All Time", value: "ALL" }
  ];

  const tabs: Array<{ id: AnalyticsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Executive & User KPIs", icon: TrendingUp },
    { id: "agency", label: "Agency Financials & Utilization", icon: Briefcase },
    { id: "projects", label: "Project Health & Turnaround", icon: FolderGit2 },
    { id: "funnel_cohorts", label: "Funnels & Cohort Retention", icon: Users },
    { id: "reports", label: "Reports & Scheduled Digests", icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                <BarChart3 className="w-4 h-4" />
                <span>Performance & Commercial Intelligence</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                SpecForge Product & Business Analytics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Actionable visibility into workflow time-saved, agency utilization, client approval velocity, and funnel conversion.
              </p>
            </div>

            {/* Global Controls: Period Selector & Quick Export */}
            <div className="flex items-center flex-wrap gap-2">
              {/* Period Selector */}
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => onPeriodChange(p.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      currentPeriod === p.value
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Refresh analytics data"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              )}

              {/* Quick Export Trigger */}
              {onQuickExport && (
                <button
                  onClick={onQuickExport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 mt-4 overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
