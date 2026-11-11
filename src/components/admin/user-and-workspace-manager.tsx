"use client";

import React, { useState } from "react";
import type { ManagedUserView, ManagedWorkspaceView } from "@/lib/admin/admin-service";
import {
  Users,
  Building2,
  Search,
  Key,
  Shield,
  Ban,
  CheckCircle2,
  Sparkles,
  CreditCard,
  X,
  ExternalLink
} from "lucide-react";

interface UserAndWorkspaceManagerProps {
  users: ManagedUserView[];
  workspaces: ManagedWorkspaceView[];
  onToggleUserSuspension: (userId: string, isSuspended: boolean, reason: string) => Promise<void>;
  onUpdateWorkspacePlan: (
    organizationId: string,
    tier: "TRIAL" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE",
    bonusCredits: number,
    reason: string
  ) => Promise<void>;
  onGenerateDebugSession: (targetUserId: string, organizationId: string, reason: string) => Promise<string>;
}

export const UserAndWorkspaceManager: React.FC<UserAndWorkspaceManagerProps> = ({
  users,
  workspaces,
  onToggleUserSuspension,
  onUpdateWorkspacePlan,
  onGenerateDebugSession
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"users" | "workspaces">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  // Plan update modal state
  const [selectedWorkspace, setSelectedWorkspace] = useState<ManagedWorkspaceView | null>(null);
  const [targetTier, setTargetTier] = useState<"TRIAL" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE">("AGENCY");
  const [bonusCredits, setBonusCredits] = useState(250);
  const [planReason, setPlanReason] = useState("");
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  // Debug session modal state
  const [debugUser, setDebugUser] = useState<ManagedUserView | null>(null);
  const [debugReason, setDebugReason] = useState("");
  const [generatedDebugToken, setGeneratedDebugToken] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesTier = tierFilter === "ALL" || u.subscriptionTier === tierFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.organizationName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const filteredWorkspaces = workspaces.filter((w) => {
    const matchesTier = tierFilter === "ALL" || w.subscriptionTier === tierFilter;
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;
    try {
      setIsUpdatingPlan(true);
      await onUpdateWorkspacePlan(selectedWorkspace.id, targetTier, bonusCredits, planReason);
      setSelectedWorkspace(null);
      setPlanReason("");
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  const handleStartDebug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugUser) return;
    const token = await onGenerateDebugSession(debugUser.id, debugUser.organizationId, debugReason);
    setGeneratedDebugToken(token);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Controls & Subtab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setActiveSubTab("users")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
              activeSubTab === "users" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
            }`}
          >
            Users Directory ({users.length})
          </button>
          <button
            onClick={() => setActiveSubTab("workspaces")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
              activeSubTab === "workspaces" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
            }`}
          >
            Workspaces & Plans ({workspaces.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, workspace..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Tiers</option>
            <option value="TRIAL">Trial</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="AGENCY">Agency</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      </div>

      {/* View 1: Users Directory */}
      {activeSubTab === "users" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Organization</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Plan</th>
                <th className="py-2.5 px-3">AI Credits</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 dark:text-white block">{u.fullName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{u.email}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {u.organizationName}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                      {u.subscriptionTier}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono">{u.aiCreditsUsed} / {u.aiCreditQuota}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.isSuspended
                          ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {u.isSuspended ? "SUSPENDED" : "ACTIVE"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-1">
                    <button
                      onClick={() => setDebugUser(u)}
                      className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Generate debug session"
                    >
                      Impersonate
                    </button>
                    <button
                      onClick={() =>
                        onToggleUserSuspension(u.id, !u.isSuspended, "Admin console security override")
                      }
                      className={`px-2 py-1 text-[11px] rounded border ${
                        u.isSuspended
                          ? "border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                          : "border-red-300 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {u.isSuspended ? "Reactivate" : "Suspend"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Workspaces Directory */}
      {activeSubTab === "workspaces" && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
                <th className="py-2.5 px-3">Workspace</th>
                <th className="py-2.5 px-3">Slug</th>
                <th className="py-2.5 px-3">Seats</th>
                <th className="py-2.5 px-3">Projects</th>
                <th className="py-2.5 px-3">Plan Tier</th>
                <th className="py-2.5 px-3">Monthly AI Quota</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredWorkspaces.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {w.name}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {w.slug}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {w.memberCount} seats
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {w.projectCount} projects
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                      {w.subscriptionTier}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {w.monthlyAiQuota} credits
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedWorkspace(w)}
                      className="px-2.5 py-1 text-[11px] rounded border border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold"
                    >
                      Manage Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Manage Workspace Plan */}
      {selectedWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Modify Subscription Plan: {selectedWorkspace.name}
              </h3>
              <button onClick={() => setSelectedWorkspace(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Target Plan Tier</label>
                <select
                  value={targetTier}
                  onChange={(e) => setTargetTier(e.target.value as any)}
                  className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                >
                  <option value="TRIAL">Trial (100 credits/mo)</option>
                  <option value="PROFESSIONAL">Professional (250 credits/mo)</option>
                  <option value="AGENCY">Agency (1,000 credits/mo)</option>
                  <option value="ENTERPRISE">Enterprise (5,000 credits/mo)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Bonus AI Credits Allocation</label>
                <input
                  type="number"
                  value={bonusCredits}
                  onChange={(e) => setBonusCredits(Number(e.target.value))}
                  className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Audit Log Justification Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Founder pilot courtesy upgrade or customer success tier match"
                  value={planReason}
                  onChange={(e) => setPlanReason(e.target.value)}
                  className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedWorkspace(null)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPlan}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                >
                  {isUpdatingPlan ? "Saving..." : "Apply Plan Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate Impersonation Debug Token */}
      {debugUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Generate Debug Session: {debugUser.fullName}
              </h3>
              <button
                onClick={() => {
                  setDebugUser(null);
                  setGeneratedDebugToken(null);
                }}
                className="p-1 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedDebugToken ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg">
                  15-minute time-limited impersonation token generated:
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-[11px] break-all">
                  {generatedDebugToken}
                </div>
                <button
                  onClick={() => {
                    setDebugUser(null);
                    setGeneratedDebugToken(null);
                  }}
                  className="w-full py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleStartDebug} className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Allows support engineers to diagnose issues from the customer perspective. Action is audited.
                </p>
                <div>
                  <label className="font-semibold block mb-1">Reason for Impersonation</label>
                  <input
                    type="text"
                    placeholder="e.g. Investigating failed Jira webhook token for ticket SF-1042"
                    value={debugReason}
                    onChange={(e) => setDebugReason(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDebugUser(null)}
                    className="px-3 py-1.5 text-slate-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow"
                  >
                    Generate Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

