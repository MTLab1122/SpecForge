"use client";

import React, { useState } from "react";
import type { SystemOverviewKpis } from "@/lib/admin/admin-service";
import {
  ShieldAlert,
  Users,
  Building2,
  Headphones,
  Flag,
  Megaphone,
  Download,
  Activity,
  DollarSign,
  Cpu,
  Layers,
  ArrowRight
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "users"
  | "workspaces"
  | "support"
  | "flags"
  | "announcements"
  | "exports";

interface AdminDashboardShellProps {
  kpis: SystemOverviewKpis;
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export const AdminDashboardShell: React.FC<AdminDashboardShellProps> = ({
  kpis,
  activeTab,
  onTabChange,
  children
}) => {
  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "overview", label: "Operations Overview", icon: Activity },
    { id: "users", label: "User Accounts", icon: Users },
    { id: "workspaces", label: "Workspaces & Plans", icon: Building2 },
    { id: "support", label: "Support Helpdesk", icon: Headphones },
    { id: "flags", label: "Feature Flags", icon: Flag },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "exports", label: "Data Exports", icon: Download }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Super-Admin Banner */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                    System Control Panel
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 font-mono font-bold">
                    SUPER_ADMIN PRIVILEGED
                  </span>
                </div>
                <h1 className="text-lg font-bold text-white">
                  SpecForge Institutional Management Console
                </h1>
              </div>
            </div>

            {/* Quick KPI Strip */}
            <div className="flex items-center flex-wrap gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase">Workspaces</span>
                <span className="font-bold text-white">{kpis.totalOrganizations}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase">Active Users</span>
                <span className="font-bold text-white">{kpis.activeUsers}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase">Monthly Run Rate</span>
                <span className="font-bold text-emerald-400">${kpis.monthlyRunRateUsd.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
                <span className="text-slate-400 block text-[10px] uppercase">Open Tickets</span>
                <span className="font-bold text-amber-400">{kpis.openSupportTickets}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 mt-3 overflow-x-auto border-t border-slate-800 pt-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
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

