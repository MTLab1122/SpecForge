"use client";

import React, { useState } from "react";
import type { ReferralDashboardMetrics } from "@/lib/engagement/referrals-engine";
import {
  Gift,
  Users,
  Copy,
  Check,
  Mail,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Share2
} from "lucide-react";

interface ReferralRewardsHubProps {
  metrics: ReferralDashboardMetrics;
  onSendEmailInvite: (email: string) => Promise<void>;
  isSendingInvite?: boolean;
}

export const ReferralRewardsHub: React.FC<ReferralRewardsHubProps> = ({
  metrics,
  onSendEmailInvite,
  isSendingInvite = false
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(metrics.referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      setInviteStatus(null);
      await onSendEmailInvite(inviteEmail);
      setInviteStatus(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
    } catch (err: any) {
      setInviteStatus(err.message || "Failed to send invitation.");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5" />
            <span>Community Referral Rewards</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Give +100 AI Credits, Get +250 Credits
          </h2>
          <p className="text-sm text-indigo-100/90 leading-relaxed">
            Invite fellow freelance developers, product managers, or agency founders to SpecForge. When they register, they get 100 bonus AI credits, and you earn 250 credits to unlock automated discovery extraction.
          </p>

          {/* Referral Link Copy Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-lg">
            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-xs font-mono truncate text-indigo-100">
              {metrics.referralUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-900 font-semibold text-xs shadow hover:bg-indigo-50 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? "Copied Link!" : "Copy Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Total Invites Sent</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.totalInvited}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Peers contacted</span>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Registered Peers</span>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {metrics.registeredCount}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Active workspaces created</span>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">AI Credits Earned</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            +{metrics.totalAiCreditsEarned}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Deposited into account</span>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold uppercase text-slate-500">Referral Conversion</span>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {metrics.conversionRatePercent}%
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Invite-to-registration rate</span>
        </div>
      </div>

      {/* Direct Email Invite Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Send an Email Invitation
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            We will email them your invite code with an automatic +100 bonus credit voucher.
          </p>
        </div>

        <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2 max-w-lg">
          <input
            type="email"
            placeholder="colleague@agency.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={isSendingInvite}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isSendingInvite ? "Sending..." : "Send Invite"}</span>
          </button>
        </form>

        {inviteStatus && (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {inviteStatus}
          </p>
        )}
      </div>
    </div>
  );
};
