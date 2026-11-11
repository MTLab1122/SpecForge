"use client";

import React, { useState } from "react";
import type { FeatureFlagDefinition } from "@/lib/admin/feature-flags-engine";
import {
  Flag,
  ToggleLeft,
  ToggleRight,
  Sliders,
  Sparkles,
  Users,
  ShieldAlert,
  Plus,
  X,
  Check
} from "lucide-react";

interface FeatureFlagsManagerProps {
  flags: FeatureFlagDefinition[];
  onToggleFlag: (key: string, isEnabled: boolean) => Promise<void>;
  onUpdateFlagConfig: (key: string, updates: Partial<FeatureFlagDefinition>) => Promise<void>;
}

export const FeatureFlagsManager: React.FC<FeatureFlagsManagerProps> = ({
  flags,
  onToggleFlag,
  onUpdateFlagConfig
}) => {
  const [editingFlag, setEditingFlag] = useState<FeatureFlagDefinition | null>(null);
  const [rolloutPct, setRolloutPct] = useState(100);
  const [targetTiers, setTargetTiers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = (flag: FeatureFlagDefinition) => {
    setEditingFlag(flag);
    setRolloutPct(flag.rolloutPercentage);
    setTargetTiers(flag.targetTiers);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlag) return;
    try {
      setIsSaving(true);
      await onUpdateFlagConfig(editingFlag.key, {
        rolloutPercentage: rolloutPct,
        targetTiers
      });
      setEditingFlag(null);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTier = (tier: string) => {
    setTargetTiers((prev) =>
      prev.includes(tier) ? prev.filter((t) => t !== tier) : [...prev, tier]
    );
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Flag className="w-4 h-4" />
            <span>Gradual Rollouts & Kill Switches</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Feature Flags & A/B Experiments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Safely control feature rollouts by percentage hash, subscription tiers, and tenant overrides.
          </p>
        </div>
      </div>

      {/* Flags List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {flag.name}
                  </h4>
                  <span className="font-mono text-[11px] text-slate-400">
                    {flag.key}
                  </span>
                </div>

                <button
                  onClick={() => onToggleFlag(flag.key, !flag.isEnabled)}
                  className={`p-1 rounded-full transition-colors ${
                    flag.isEnabled ? "text-emerald-600" : "text-slate-400"
                  }`}
                  title={flag.isEnabled ? "Disable flag" : "Enable flag"}
                >
                  {flag.isEnabled ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-500">{flag.description}</p>
            </div>

            {/* Targeting Badges */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Rollout Audience:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {flag.rolloutPercentage}% of Users
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tier Restriction:</span>
                <div className="flex gap-1">
                  {flag.targetTiers.length === 0 ? (
                    <span className="text-[10px] text-slate-500">All Tiers</span>
                  ) : (
                    flag.targetTiers.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold"
                      >
                        {t}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {flag.isABTest && (
                <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 font-semibold">
                  <span>A/B Experiment:</span>
                  <span>Active 50/50 Split</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleOpenEdit(flag)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Rollout</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Edit Rollout Configuration */}
      {editingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Rollout Parameters: {editingFlag.name}
              </h3>
              <button onClick={() => setEditingFlag(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Gradual Rollout Percentage
                  </span>
                  <span className="font-mono font-bold text-indigo-600">{rolloutPct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={rolloutPct}
                  onChange={(e) => setRolloutPct(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Subscription Tier Access Whitelist
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["TRIAL", "PROFESSIONAL", "AGENCY", "ENTERPRISE"].map((tier) => {
                    const isSelected = targetTiers.includes(tier);
                    return (
                      <button
                        type="button"
                        key={tier}
                        onClick={() => toggleTier(tier)}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold"
                            : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600"
                        }`}
                      >
                        <span>{tier}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFlag(null)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                >
                  {isSaving ? "Saving..." : "Save Parameters"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

