"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  sampleAction?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
}

export function EmptyState({
  icon = "📁",
  title,
  description,
  primaryAction,
  secondaryAction,
  sampleAction,
  tips
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center max-w-lg mx-auto my-6">
      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-2xl mx-auto mb-4">
        {icon}
      </div>

      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>

      {/* Primary & Secondary Actions */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
        {primaryAction && (
          primaryAction.href ? (
            <Link
              href={primaryAction.href}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {primaryAction.label}
            </Link>
          ) : (
            <button
              onClick={primaryAction.onClick}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
            >
              {primaryAction.label}
            </button>
          )
        )}

        {secondaryAction && (
          secondaryAction.href ? (
            <Link
              href={secondaryAction.href}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              {secondaryAction.label}
            </Link>
          ) : (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
            >
              {secondaryAction.label}
            </button>
          )
        )}
      </div>

      {/* Load Sample Data Button */}
      {sampleAction && (
        <div className="mt-4 pt-4 border-t border-slate-200/60">
          <button
            onClick={sampleAction.onClick}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1 mx-auto"
          >
            <span>✨</span>
            <span>{sampleAction.label}</span>
          </button>
        </div>
      )}

      {/* Helpful Tips Checklist */}
      {tips && tips.length > 0 && (
        <div className="mt-5 text-left bg-white rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pro Tips</div>
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-blue-600 font-bold shrink-0">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
