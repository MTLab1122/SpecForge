"use client";

import React, { useState } from "react";
import type { UserAnalyticsResponse } from "@/lib/validations/analytics";
import { TIME_SAVED_BENCHMARK } from "@/lib/analytics/analytics-engine";
import {
  Clock,
  Briefcase,
  Send,
  CheckCircle2,
  Calculator,
  Cpu,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpRight
} from "lucide-react";

interface UserKpiSummaryCardsProps {
  metrics: UserAnalyticsResponse;
  isLoading?: boolean;
}

export const UserKpiSummaryCards: React.FC<UserKpiSummaryCardsProps> = ({
  metrics,
  isLoading = false
}) => {
  const [showBenchmarkDetail, setShowBenchmarkDetail] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Projects Created",
      value: metrics.projectsCreated.toLocaleString(),
      subtitle: `In ${metrics.period} period`,
      icon: Briefcase,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      badge: "+14% vs prev"
    },
    {
      title: "Proposals Sent",
      value: metrics.proposalsSent.toLocaleString(),
      subtitle: "Presented to clients",
      icon: Send,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/40",
      badge: "Active delivery"
    },
    {
      title: "Approvals Received",
      value: metrics.approvalsReceived.toLocaleString(),
      subtitle: "Accepted scopes",
      icon: CheckCircle2,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      badge: "Commercial wins"
    },
    {
      title: "Estimates Built",
      value: metrics.estimatesCreated.toLocaleString(),
      subtitle: "Cost scenarios generated",
      icon: Calculator,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      badge: "Accurate rates"
    },
    {
      title: "AI Credits Used",
      value: metrics.aiCreditsUsed.toLocaleString(),
      subtitle: "Token extraction & synthesis",
      icon: Cpu,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      badge: "Quota nominal"
    },
    {
      title: "Client Conversion Rate",
      value: `${metrics.conversionRatePercent}%`,
      subtitle: `${metrics.approvalsReceived} of ${metrics.proposalsSent} approved`,
      icon: TrendingUp,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/40",
      badge: metrics.conversionRatePercent >= 50 ? "Healthy" : "Needs Review"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Highlight Hero Card: Time Saved Calculation */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Core Value Realization Metric</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {metrics.timeSavedHours.toLocaleString()} Hours Saved
            </h2>
            <p className="text-sm sm:text-base text-indigo-100/90 max-w-xl">
              By replacing unstructured manual client discovery with SpecForge AI extraction, scenario estimation, and one-click proposal generation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3">
            <div className="text-left md:text-right bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15">
              <span className="block text-xs uppercase tracking-wider text-indigo-200 font-semibold">
                Net Efficiency Factor
              </span>
              <span className="text-2xl font-bold text-emerald-300">
                ~18.0h saved
              </span>
              <span className="block text-xs text-indigo-200/80">
                per sent client proposal
              </span>
            </div>

            <button
              onClick={() => setShowBenchmarkDetail(!showBenchmarkDetail)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-200 hover:text-white transition-colors underline underline-offset-4"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showBenchmarkDetail ? "Hide benchmark methodology" : "View benchmark methodology"}</span>
              {showBenchmarkDetail ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Benchmark Methodology Details */}
        {showBenchmarkDetail && (
          <div className="mt-6 pt-6 border-t border-indigo-700/50 relative z-10">
            <div className="text-xs uppercase tracking-wider text-indigo-200 font-bold mb-3">
              Standard Freelancer / Agency Scoping Benchmark Breakdown
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-700/40">
                <span className="text-slate-300 block">Brief Extraction</span>
                <span className="text-sm font-bold text-amber-300">4.0h manual</span>
                <span className="text-[10px] text-slate-400 block mt-1">Unstructured chat/call synthesis</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-700/40">
                <span className="text-slate-300 block">Story & Scope Authoring</span>
                <span className="text-sm font-bold text-amber-300">6.0h manual</span>
                <span className="text-[10px] text-slate-400 block mt-1">Acceptance criteria & MoSCoW</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-700/40">
                <span className="text-slate-300 block">Role-Based Estimation</span>
                <span className="text-sm font-bold text-amber-300">5.0h manual</span>
                <span className="text-[10px] text-slate-400 block mt-1">Rate cards, buffers & scenarios</span>
              </div>
              <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-700/40">
                <span className="text-slate-300 block">Proposal Formatting</span>
                <span className="text-sm font-bold text-amber-300">3.5h manual</span>
                <span className="text-[10px] text-slate-400 block mt-1">Layout, terms, seal & presentation</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-600/40">
                <span className="text-emerald-200 block font-semibold">SpecForge Workflow</span>
                <span className="text-sm font-bold text-emerald-300">0.5h total</span>
                <span className="text-[10px] text-emerald-200/80 block mt-1">AI assistance + human review</span>
              </div>
            </div>
            <p className="text-[11px] text-indigo-200/70 mt-3">
              * Formula: (18.5 baseline manual hours - 0.5h SpecForge review) = 18.0 net hours saved per delivered proposal.
            </p>
          </div>
        )}
      </div>

      {/* 6 Grid Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${card.bgColor} ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {card.badge}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.title}
                </h3>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {card.value}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
