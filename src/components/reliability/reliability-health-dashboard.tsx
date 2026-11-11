"use client";

import React, { useState } from "react";
import {
  Activity,
  Server,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  RotateCcw
} from "lucide-react";

export interface SystemHealthData {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  uptimeSeconds: number;
  database: { status: "UP" | "DOWN"; latencyMs: number };
  memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
  jobQueue: { pendingJobs: number; deadLetterJobs: number };
  circuitBreakers: Array<{ name: string; state: string }>;
  cache: { size: number; hits: number; misses: number; hitRatePercent: number };
}

export interface DeadLetterJobView {
  id: string;
  jobType: string;
  attempts: number;
  maxAttempts: number;
  errorMessage: string;
  createdAt: string;
}

interface ReliabilityHealthDashboardProps {
  health: SystemHealthData;
  deadLetterJobs: DeadLetterJobView[];
  onReplayDeadLetter: (jobId: string) => Promise<void>;
  onResetCircuitBreaker: (breakerName: string) => Promise<void>;
  onClearCache: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const ReliabilityHealthDashboard: React.FC<ReliabilityHealthDashboardProps> = ({
  health,
  deadLetterJobs,
  onReplayDeadLetter,
  onResetCircuitBreaker,
  onClearCache,
  onRefresh,
  isRefreshing = false
}) => {
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const handleReplay = async (id: string) => {
    try {
      setReplayingId(id);
      await onReplayDeadLetter(id);
    } finally {
      setReplayingId(null);
    }
  };

  const formatUptime = (sec: number) => {
    const hours = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Status Hero */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl ${
              health.status === "HEALTHY"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                : health.status === "DEGRADED"
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
            }`}
          >
            {health.status === "HEALTHY" ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : health.status === "DEGRADED" ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <XCircle className="w-8 h-8" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                System Status: {health.status}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Uptime: {formatUptime(health.uptimeSeconds)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Active health probes, database connection pool, background worker queues, and circuit breaker telemetry.
            </p>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Probe Now</span>
          </button>
        )}
      </div>

      {/* 4 Health Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Health */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Database Pool</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {health.database.status} ({health.database.latencyMs}ms)
          </div>
          <span className="text-xs text-slate-400 mt-1 block">PostgreSQL Primary Cluster</span>
        </div>

        {/* Memory Footprint */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Node.js Heap</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {health.memory.heapUsedMb} MB / {health.memory.heapTotalMb} MB
          </div>
          <span className="text-xs text-slate-400 mt-1 block">RSS: {health.memory.rssMb} MB</span>
        </div>

        {/* Dead-Letter Queue */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Dead-Letter Queue</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {health.jobQueue.deadLetterJobs} Failed Jobs
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Pending triage & replay</span>
        </div>

        {/* Cache Hit Rate */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">Cache Hit Rate</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {health.cache.hitRatePercent}%
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {health.cache.hits} hits / {health.cache.size} cached keys
          </span>
        </div>
      </div>

      {/* External Integration Circuit Breakers */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            External API Circuit Breakers
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic fail-fast and graceful degradation shields protecting against 3rd-party outages.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {health.circuitBreakers.map((cb) => (
            <div
              key={cb.name}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {cb.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    cb.state === "CLOSED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : cb.state === "OPEN"
                      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {cb.state} (Healthy)
                </span>
              </div>

              {cb.state !== "CLOSED" && (
                <button
                  onClick={() => onResetCircuitBreaker(cb.name)}
                  className="p-1.5 text-xs text-slate-500 hover:text-indigo-600 rounded border hover:bg-slate-50"
                  title="Force Reset Breaker"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dead-Letter Queue (DLQ) Inspector */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Dead-Letter Queue (DLQ) Triage Center
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tasks that exceeded maximum exponential backoff retries without resolution.
            </p>
          </div>
          <button
            onClick={onClearCache}
            className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Purge Cache
          </button>
        </div>

        {deadLetterJobs.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Dead-Letter Queue is Empty
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              All asynchronous workers and webhooks are completing within nominal retry parameters.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden">
            {deadLetterJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {job.jobType}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      ID: {job.id}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold">
                      {job.attempts}/{job.maxAttempts} Attempts
                    </span>
                  </div>
                  <p className="text-red-500 font-mono text-[11px]">
                    Error: {job.errorMessage}
                  </p>
                </div>

                <button
                  onClick={() => handleReplay(job.id)}
                  disabled={replayingId === job.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${replayingId === job.id ? "animate-spin" : ""}`} />
                  <span>Replay Job</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
