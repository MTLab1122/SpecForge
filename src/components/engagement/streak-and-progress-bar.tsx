"use client";

import React, { useState } from "react";
import type { AchievementBadge } from "@/lib/engagement/streaks-and-achievements";
import {
  Flame,
  Award,
  Sparkles,
  Calculator,
  FileCheck,
  Rocket,
  Repeat,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

interface StreakAndProgressBarProps {
  currentStreak: number;
  longestStreak: number;
  activeProjectStage?: string;
  projectCompletionPercent?: number;
  badges: AchievementBadge[];
  onOpenBadgesModal?: () => void;
}

export const StreakAndProgressBar: React.FC<StreakAndProgressBarProps> = ({
  currentStreak,
  longestStreak,
  activeProjectStage = "ESTIMATION",
  projectCompletionPercent = 65,
  badges,
  onOpenBadgesModal
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case "Sparkles": return <Sparkles className="w-4 h-4 text-amber-500" />;
      case "Calculator": return <Calculator className="w-4 h-4 text-blue-500" />;
      case "FileCheck": return <FileCheck className="w-4 h-4 text-emerald-500" />;
      case "Award": return <Award className="w-4 h-4 text-indigo-500" />;
      case "Rocket": return <Rocket className="w-4 h-4 text-purple-500" />;
      case "Repeat": return <Repeat className="w-4 h-4 text-teal-500" />;
      default: return <Flame className="w-4 h-4 text-orange-500" />;
    }
  };

  const unlockedCount = badges.filter((b) => b.earnedAt).length;

  return (
    <div className="space-y-4 font-sans">
      {/* Top Combined Bar: Streak & Project Progress */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Streak Counter */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 flex items-center justify-center shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                {currentStreak}-Week Streak!
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                Personal Best: {longestStreak} wks
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Active discovery & estimation logged this week. Keep momentum alive!
            </p>
          </div>
        </div>

        {/* Project Completion Progress Bar */}
        <div className="flex-1 max-w-md space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active Project Progress: {activeProjectStage.replace("_", " ")}
            </span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {projectCompletionPercent}%
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${projectCompletionPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Brief</span>
            <span>Scope</span>
            <span>Estimate</span>
            <span>Proposal</span>
            <span>Approval</span>
            <span>Handover</span>
          </div>
        </div>

        {/* Badges Tally Pill */}
        <button
          onClick={onOpenBadgesModal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>{unlockedCount} of {badges.length} Badges</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Mini Badges Shelf */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {badges.map((b) => {
          const isUnlocked = Boolean(b.earnedAt);
          return (
            <div
              key={b.id}
              onClick={() => setSelectedBadge(b)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                isUnlocked
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xs hover:border-indigo-400"
                  : "bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/40 text-slate-400 opacity-60"
              }`}
            >
              {getBadgeIcon(b.iconName)}
              <span>{b.title}</span>
              {isUnlocked && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Badge Details Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
              <Award className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                {selectedBadge.category} Achievement
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {selectedBadge.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs">
              <span className="text-slate-500">Status: </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {selectedBadge.earnedAt ? `Unlocked on ${new Date(selectedBadge.earnedAt).toLocaleDateString()}` : "Locked"}
              </span>
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
