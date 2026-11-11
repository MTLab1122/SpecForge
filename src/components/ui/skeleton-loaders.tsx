import React from "react";

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`}
  />
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-6xl mx-auto p-6 font-sans">
    {/* Banner Skeleton */}
    <div className="h-44 w-full rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />

    {/* Metric Cards Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </div>

      <div className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const ScopeBuilderSkeleton: React.FC = () => (
  <div className="space-y-6 max-w-5xl mx-auto p-6 font-sans">
    <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-10 w-32 rounded-xl" />
    </div>

    {/* Category Tabs Skeleton */}
    <div className="flex gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-xl" />
      ))}
    </div>

    {/* Requirements List Skeleton */}
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex gap-4">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-24 ml-auto" />
    </div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-lg ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

