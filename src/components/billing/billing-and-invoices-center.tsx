"use client";

import React, { useState, useEffect } from "react";
import type {
  SubscriptionTier,
  CreditUsageSummary,
  InvoiceRecord,
  PlanAccessResult
} from "@/lib/billing/billing-service";
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
  Download,
  FileText,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Calendar
} from "lucide-react";

interface BillingAndInvoicesCenterProps {
  organizationId: string;
}

export const BillingAndInvoicesCenter: React.FC<BillingAndInvoicesCenterProps> = ({
  organizationId
}) => {
  const [summary, setSummary] = useState<CreditUsageSummary | null>(null);
  const [access, setAccess] = useState<PlanAccessResult | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/billing?organizationId=${organizationId}`);
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary);
        setAccess(data.access);
      }

      const invRes = await fetch(`/api/v1/billing/invoices?organizationId=${organizationId}`, {
        headers: { "x-org-id": organizationId }
      });
      const invData = await invRes.json();
      if (invData.success) {
        setInvoices(invData.invoices);
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to load billing information" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [organizationId]);

  const handlePlanAction = async (targetTier: SubscriptionTier, action: "UPGRADE" | "DOWNGRADE" | "CANCEL") => {
    try {
      setActionInProgress(`${action}_${targetTier}`);
      const res = await fetch("/api/v1/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": organizationId
        },
        body: JSON.stringify({
          organizationId,
          targetTier,
          action
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Successfully executed plan ${action.toLowerCase()} to ${targetTier}.`
        });
        await fetchBillingData();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Action failed." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error processing plan change." });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleTopUp = async (amount: number) => {
    try {
      setActionInProgress(`topup_${amount}`);
      const res = await fetch("/api/v1/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-org-id": organizationId
        },
        body: JSON.stringify({
          organizationId,
          action: "TOP_UP",
          creditsToAdd: amount
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: "success",
          text: `Added +${amount} instant AI generation credits!`
        });
        await fetchBillingData();
      } else {
        setStatusMessage({ type: "error", text: data.error || "Top-up failed." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Error processing top-up." });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      setActionInProgress(`download_${invoiceId}`);
      const res = await fetch(`/api/v1/billing/invoices/${invoiceId}?organizationId=${organizationId}`, {
        headers: { "x-org-id": organizationId }
      });
      const data = await res.json();
      if (data.success && data.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        setStatusMessage({ type: "error", text: data.error || "Failed to download receipt." });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Download error." });
    } finally {
      setActionInProgress(null);
      setTimeout(() => setStatusMessage(null), 5000);
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

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-indigo-600" />
        <span>Loading subscription & invoice details...</span>
      </div>
    );
  }

  const currentTierRank = getTierOrder(summary.tier);
  const renewalDateFormatted = new Date(summary.renewsAt).toLocaleDateString("en-US", {
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
            <Zap className="w-3.5 h-3.5" /> Reliable Billing & Webhooks
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Subscription, Quotas & Invoices
          </h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Autonomous Stripe webhook synchronization, 7-day grace period protection, and row-level
            multi-tenant invoice history.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[220px]">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">Workspace Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-white capitalize">{summary.tier}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase ${
                  summary.status === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : summary.status === "PAST_DUE"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                }`}
              >
                {summary.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Period End: {renewalDateFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Grace Period or Status Warning Banners */}
      {summary.status === "PAST_DUE" && summary.inGracePeriod && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Payment Overdue — 7-Day Grace Period Active</p>
            <p className="text-xs opacity-90">
              Your recent subscription invoice payment could not be completed. Your workspace remains fully
              operational until{" "}
              <strong>
                {summary.gracePeriodEndsAt ? new Date(summary.gracePeriodEndsAt).toLocaleDateString() : "the end of grace"}
              </strong>
              . Please update your payment card to avoid service disruption. Your project data is safely preserved.
            </p>
          </div>
        </div>
      )}

      {summary.status === "CANCELLED" && (
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-sm flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Subscription Scheduled to Cancel</p>
            <p className="text-xs opacity-90">
              Your subscription is cancelled and will transition to the Free Trial tier at the end of the billing period
              ({renewalDateFormatted}). Zero customer data will be deleted.
            </p>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium flex items-center gap-2 animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          }`}
        >
          {statusMessage.type === "success" ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* AI Credit Usage & Top-Up Widget */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Monthly AI Generation Credits & Quota
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Credits reset every billing cycle. Unused top-up quota persists across billing renewals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTopUp(250)}
              disabled={actionInProgress !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> +250 Top-Up ($5)
            </button>
            <button
              onClick={() => handleTopUp(500)}
              disabled={actionInProgress !== null}
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
              <span>{summary.creditsUsed} Credits Consumed</span>
              <span>
                {summary.remainingCredits} Remaining of {summary.monthlyQuota} Quota
              </span>
            </div>
            {/* Progress Track */}
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.utilizationPercent > 85
                    ? "bg-rose-500"
                    : summary.utilizationPercent > 65
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${Math.min(100, summary.utilizationPercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>0%</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {summary.utilizationPercent}% Quota Consumed
              </span>
              <span>100%</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Remaining</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {summary.remainingCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Available Prompts / Tasks</span>
          </div>
        </div>
      </div>

      {/* Plan Tier Matrix */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Available Subscription Tiers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Switch plans anytime. Webhook listeners automatically reconcile subscription status and quota.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLAN_TIERS.map((plan) => {
            const isCurrent = summary.tier === plan.id;
            const targetRank = getTierOrder(plan.id);
            const isUpgrade = targetRank > currentTierRank;

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
                      Current Plan
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
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {plan.monthlyAiCredits} / mo
                      </span>
                    </div>
                    <div className="flex justify-between font-medium text-slate-700 dark:text-slate-300">
                      <span>Seats:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {plan.maxSeats === 1 ? "1 Solo Seat" : `${plan.maxSeats} Team Seats`}
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
                      onClick={() => handlePlanAction(plan.id, "UPGRADE")}
                      disabled={actionInProgress !== null}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {actionInProgress === `UPGRADE_${plan.id}` ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          Upgrade to {plan.name} <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePlanAction(plan.id, "DOWNGRADE")}
                      disabled={actionInProgress !== null}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {actionInProgress === `DOWNGRADE_${plan.id}` ? (
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

      {/* Invoice & Payment History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Invoice & Payment History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Secure PDF receipts generated per billing cycle. Row-level multi-tenant isolation enforced.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Strict Tenant Boundary</span>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No invoices on record for this workspace yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Invoice Number</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {inv.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-500 capitalize">
                      {inv.billingReason?.replace("_", " ") || "Subscription Renewal"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      ${inv.amountDueUsd.toFixed(2)} {inv.currency}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : inv.status === "FAILED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv.id)}
                        disabled={actionInProgress === `download_${inv.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                      >
                        {actionInProgress === `download_${inv.id}` ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" /> PDF
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancellation Option Footer */}
      {summary.tier !== "TRIAL" && (
        <div className="pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
          <span>Need to cancel or pause your plan? Customer data is never deleted on cancellation.</span>
          <button
            onClick={() => handlePlanAction("TRIAL", "CANCEL")}
            disabled={actionInProgress !== null}
            className="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer font-medium"
          >
            Cancel Subscription
          </button>
        </div>
      )}
    </div>
  );
};

