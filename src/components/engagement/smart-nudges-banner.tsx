"use client";

import React, { useState } from "react";
import type { NudgeCandidate } from "@/lib/engagement/smart-nudges-engine";
import {
  Lightbulb,
  Clock,
  Send,
  FileCheck,
  DollarSign,
  AlertCircle,
  X,
  ArrowRight,
  EyeOff
} from "lucide-react";

interface SmartNudgesBannerProps {
  nudges: NudgeCandidate[];
  onActionClick: (nudge: NudgeCandidate) => void;
  onSnooze: (nudgeId: string) => Promise<void>;
  onDismiss: (nudgeId: string) => Promise<void>;
}

export const SmartNudgesBanner: React.FC<SmartNudgesBannerProps> = ({
  nudges,
  onActionClick,
  onSnooze,
  onDismiss
}) => {
  if (nudges.length === 0) return null;

  const activeNudge = nudges[0]; // Show the highest-priority non-spam item

  const getNudgeIcon = (type: NudgeCandidate["nudgeType"]) => {
    switch (type) {
      case "SCOPE_PENDING": return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "PROPOSAL_UNSENT": return <Send className="w-4 h-4 text-indigo-500" />;
      case "APPROVAL_FOLLOW_UP": return <Clock className="w-4 h-4 text-purple-500" />;
      case "INVOICE_PENDING": return <DollarSign className="w-4 h-4 text-emerald-500" />;
      default: return <Lightbulb className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-slate-50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 p-4 sm:p-5 shadow-sm transition-all animate-fade-in font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Nudge Details */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-indigo-100 dark:border-indigo-900 shrink-0">
            {getNudgeIcon(activeNudge.nudgeType)}
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Smart Workflow Recommendation
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {activeNudge.title}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              {activeNudge.message}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button
            onClick={() => onSnooze(activeNudge.id)}
            className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Snooze for 24 hours"
          >
            Snooze 24h
          </button>

          <button
            onClick={() => onActionClick(activeNudge)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
          >
            <span>{activeNudge.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDismiss(activeNudge.id)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Dismiss nudge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
