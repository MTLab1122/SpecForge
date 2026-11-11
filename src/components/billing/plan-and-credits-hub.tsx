"use client";

import React, { useState } from "react";
import type { SubscriptionTier, SubscriptionStatus, CreditUsageSummary, PlanTierConfig } from "@/lib/billing/billing-service";
import { PLAN_TIERS } from "@/lib/billing/billing-service";
import {
  Sparkles,
  Zap,
  Check,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  Clock,
  Layers,
  ChevronRight
} from "lucide-react";

interface PlanAndCreditsHubProps {
  currentSummary: CreditUsageSummary;
  onPlanChange: (targetTier: SubscriptionTier, action: "UPGRADE" | "DOWNGRADE" | "CANCEL") => Promise<void>;
  onTopUp: (credits: number) => Promise<void>;
}

export const PlanAndCreditsHub: React.FC<PlanAndCreditsHubProps> = ({
  currentSummary,
  onPlanChange,
  onTopUp
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAction = async (targetTier: SubscriptionTier, action: "UPGRADE" | "DOWNGRADE" | "CANCEL") => {
    try {
      setLoadingAction(`${action}_${targetTier}`);
      await onPlanChange(targetTier, action);
      setSuccessMessage(`Successfully updated subscription to ${targetTier}!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTopUpAction = async (amount: number) => {
    try {
      setLoadingAction(`topup_${amount}`);
      await onTopUp(amount);
      setSuccessMessage(`Added +${amount} instant AI credits!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setLoadingAction(null);
    }
  };

  const getTierOrder = (tier: SubscriptionTier): number => {
    switch (tier) {
      case "TRIAL": return 0;
      case "PROFESSIONAL": return 1;
      case "AGENCY": return 2;
      case "ENTERPRISE": return 3;
    }
  };

  const currentTierRank = getTierOrder(currentSummary.tier);
  const renewalDateFormatted = new Date(currentSummary.renewsAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-4 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5" /> Subscription & Quota Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Plans & AI Credit Allocation
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Scale seamlessly from solo discovery sprints to multi-seat agency delivery.
            Upgrade, downgrade, or cancel at any moment with zero locked contracts.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[200px]">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Active Plan</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-white capitalize">{currentSummary.tier}</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                {currentSummary.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Renews on {renewalDateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium flex items-center gap-2 animate-fade-in">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* AI Credit Usage & Top-Up Widget */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Monthly AI Generation Credits
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Credits reset every billing cycle. Unused quota does not expire while active.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTopUpAction(250)}
              disabled={loadingAction !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> +250 Top-Up ($5)
            </button>
            <button
              onClick={() => handleTopUpAction(500)}
              disabled={loadingAction !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> +500 Top-Up ($9)
            </button>
          </div>
        </div>

        {/* Meter & Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300">
              <span>{currentSummary.creditsUsed} Credits Used</span>
              <span>{currentSummary.remainingCredits} Remaining of {currentSummary.monthlyQuota}</span>
            </div>
            {/* Progress Track */}
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  currentSummary.utilizationPercent > 85
                    ? "bg-rose-500"
                    : currentSummary.utilizationPercent > 65
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${Math.min(100, currentSummary.utilizationPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>0%</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentSummary.utilizationPercent}% Quota Consumed
              </span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Remaining</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {currentSummary.remainingCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">AI queries / prompts</span>
          </div>
        </div>
      </div>

      {/* Plan Tier Matrix */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Transparent, Predictable Pricing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch plans at any time. Prorated adjustments are applied directly to your account.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_TIERS.map((plan) => {
            const isCurrent = currentSummary.tier === plan.id;
            const targetRank = getTierOrder(plan.id);
            const isUpgrade = targetRank > currentTierRank;
            const isDowngrade = targetRank < currentTierRank;

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative ${
                  plan.recommended
                    ? "bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/30 dark:to-slate-900 border-2 border-indigo-500 shadow-lg shadow-indigo-500/10"
                    : isCurrent
                    ? "bg-white dark:bg-slate-900 border-2 border-emerald-500 shadow-md"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                }`}
              >
                {/* Badges */}
                <div className="absolute -top-3 right-6 flex items-center gap-1.5">
                  {plan.recommended && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-600 text-white shadow-xs">
                      Most Popular
                    </span>
                  )}
                  {isCurrent && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-600 text-white shadow-xs">
                      Active Plan
                    </span>
                  )}
                </div>

                {/* Plan Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        ${plan.priceUsdMonthly}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ month</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                      <span>Included AI Credits:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{plan.monthlyAiCredits} / mo</span>
                    </div>
                    <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                      <span>Team Seats:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {plan.maxSeats === 1 ? "1 Solo Seat" : `${plan.maxSeats} Seats`}
                      </span>
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2.5 pt-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed text-center"
                    >
                      Active Plan
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleAction(plan.id, "UPGRADE")}
                      disabled={loadingAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {loadingAction === `UPGRADE_${plan.id}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          Upgrade to {plan.name} <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(plan.id, "DOWNGRADE")}
                      disabled={loadingAction !== null}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {loadingAction === `DOWNGRADE_${plan.id}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        `Downgrade to ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancellation Option Footer */}
      {currentSummary.tier !== "TRIAL" && (
        <div className="pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
          <span>Need to pause or cancel your subscription?</span>
          <button
            onClick={() => handleAction("TRIAL", "CANCEL")}
            disabled={loadingAction !== null}
            className="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer font-medium"
          >
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  );
};
