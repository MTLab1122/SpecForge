"use client";

import React, { useState } from "react";
import { ScopeDiffResult } from "@/lib/discovery/scope-comparator";

interface ScopeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: ScopeDiffResult | null;
  onRestoreVersion?: (versionNumber: number) => void;
}

export function ScopeComparisonModal({
  isOpen,
  onClose,
  diff,
  onRestoreVersion
}: ScopeComparisonModalProps) {
  if (!isOpen || !diff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Audit & Versioning
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Scope Version Diff: v{diff.versionA}.0 ↔ v{diff.versionB}.0
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            Esc to Close ✕
          </button>
        </div>

        {/* Commercial Impact Summary Strip */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Features Delta</span>
              <span className={`text-base font-extrabold ${diff.impactSummary.netFeaturesDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {diff.impactSummary.netFeaturesDelta >= 0 ? `+${diff.impactSummary.netFeaturesDelta}` : diff.impactSummary.netFeaturesDelta}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Effort Delta</span>
              <span className={`text-base font-extrabold ${diff.impactSummary.netHoursDelta >= 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {diff.impactSummary.netHoursDelta >= 0 ? `+${diff.impactSummary.netHoursDelta}` : diff.impactSummary.netHoursDelta} hrs
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost Delta</span>
              <span className={`text-base font-extrabold ${diff.impactSummary.netCostDelta >= 0 ? "text-blue-700" : "text-emerald-700"}`}>
                {diff.impactSummary.currency} {diff.impactSummary.netCostDelta >= 0 ? `+${diff.impactSummary.netCostDelta.toLocaleString()}` : diff.impactSummary.netCostDelta.toLocaleString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Timeline Impact</span>
              <span className="text-base font-extrabold text-slate-800">
                {diff.impactSummary.timelineDaysDelta >= 0 ? `+${diff.impactSummary.timelineDaysDelta}` : diff.impactSummary.timelineDaysDelta} days
              </span>
            </div>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Added Items (Green) */}
          {diff.addedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                  +
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Added in v{diff.versionB}.0 ({diff.addedItems.length})
                </h4>
              </div>
              <div className="space-y-2">
                {diff.addedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      +{item.estimatedHours} hrs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modified Items (Blue) */}
          {diff.modifiedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                  ✎
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Modified Between Versions ({diff.modifiedItems.length})
                </h4>
              </div>
              <div className="space-y-2">
                {diff.modifiedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                      {item.hoursDelta !== 0 && (
                        <span className="text-xs font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                          {item.hoursDelta >= 0 ? `+${item.hoursDelta}` : item.hoursDelta} hrs
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-white border border-slate-200 text-slate-500">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">v{diff.versionA}.0</span>
                        {item.oldDescription}
                      </div>
                      <div className="p-2 rounded bg-white border border-blue-200 text-slate-800 font-medium">
                        <span className="text-[10px] font-bold uppercase text-blue-600 block mb-1">v{diff.versionB}.0</span>
                        {item.newDescription}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Removed Items (Red) */}
          {diff.removedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center">
                  -
                </span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Removed in v{diff.versionB}.0 ({diff.removedItems.length})
                </h4>
              </div>
              <div className="space-y-2">
                {diff.removedItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 line-through">{item.title}</h5>
                    </div>
                    <span className="text-xs font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                      -{item.estimatedHours} hrs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Close Diff
          </button>

          {onRestoreVersion && (
            <button
              onClick={() => {
                onRestoreVersion(diff.versionA);
                onClose();
              }}
              className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
            >
              Rollback to v{diff.versionA}.0 ↺
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

