"use client";

import React, { useState } from "react";
import { SanitizedProposalView } from "@/lib/client-portal/presentation-engine";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Activity,
  Share2,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight
} from "lucide-react";

interface ClientPortalShellProps {
  proposal: SanitizedProposalView;
  activeTab: "PROPOSAL" | "SECTIONS" | "COMMENTS" | "UPDATES";
  onTabChange: (tab: "PROPOSAL" | "SECTIONS" | "COMMENTS" | "UPDATES") => void;
  commentCount?: number;
  updateCount?: number;
  children: React.ReactNode;
  onOpenApproveModal?: () => void;
  onOpenRevisionModal?: () => void;
  onOpenDelegateModal?: () => void;
}

export const ClientPortalShell: React.FC<ClientPortalShellProps> = ({
  proposal,
  activeTab,
  onTabChange,
  commentCount = 0,
  updateCount = 0,
  children,
  onOpenApproveModal,
  onOpenRevisionModal,
  onOpenDelegateModal
}) => {
  const isApproved = proposal.status === "APPROVED";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar with Agency Branding */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {proposal.branding.logoUrl ? (
              <img src={proposal.branding.logoUrl} alt={proposal.branding.agencyName} className="h-8 w-auto rounded" />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
                style={{ backgroundColor: proposal.branding.primaryColor }}
              >
                {proposal.branding.agencyName.charAt(0)}
              </div>
            )}
            <div>
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white block">
                {proposal.branding.agencyName}
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                Client Portal · Version {proposal.version}
              </span>
            </div>
          </div>

          {/* Status Badge & Fast Action */}
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                isApproved
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                  : proposal.status === "REVISED"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300"
                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300"
              }`}
            >
              {isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {isApproved ? "Approved & Locked" : proposal.status.replace("_", " ")}
            </span>

            {onOpenDelegateModal && !isApproved && (
              <button
                onClick={onOpenDelegateModal}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
              >
                <Share2 className="w-3.5 h-3.5" /> Delegate Review
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800/80 pt-1 text-xs">
          <button
            onClick={() => onTabChange("PROPOSAL")}
            className={`py-2 px-3 border-b-2 font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "PROPOSAL"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Proposal & Scope
          </button>

          <button
            onClick={() => onTabChange("SECTIONS")}
            className={`py-2 px-3 border-b-2 font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "SECTIONS"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Section Approvals
          </button>

          <button
            onClick={() => onTabChange("COMMENTS")}
            className={`py-2 px-3 border-b-2 font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "COMMENTS"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Client Comments ({commentCount})
          </button>

          <button
            onClick={() => onTabChange("UPDATES")}
            className={`py-2 px-3 border-b-2 font-medium transition flex items-center gap-1.5 shrink-0 ${
              activeTab === "UPDATES"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Weekly Updates ({updateCount})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-12">
        {/* Next Action Notification Banner */}
        <div
          className={`mb-6 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isApproved
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <span
              className={`p-2 rounded-xl shrink-0 ${
                isApproved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
              }`}
            >
              {isApproved ? <ShieldCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </span>
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider opacity-80">Next Step</div>
              <div className="text-sm font-bold mt-0.5">{proposal.nextActionPrompt.actionLabel}</div>
            </div>
          </div>

          {!isApproved && onOpenApproveModal && (
            <div className="flex items-center gap-2 shrink-0">
              {onOpenRevisionModal && (
                <button
                  onClick={onOpenRevisionModal}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  Request Changes
                </button>
              )}
              <button
                onClick={onOpenApproveModal}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
              >
                Approve Full Scope <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Tab Body */}
        {children}
      </main>

      {/* Mobile Sticky Action Bar */}
      {!isApproved && onOpenApproveModal && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          {onOpenRevisionModal && (
            <button
              onClick={onOpenRevisionModal}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700"
            >
              Request Changes
            </button>
          )}
          <button
            onClick={onOpenApproveModal}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl shadow flex items-center justify-center gap-1"
          >
            Approve Scope <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
