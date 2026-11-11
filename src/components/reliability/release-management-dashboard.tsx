"use client";

import React, { useState } from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Server,
  Zap,
  Lock,
  RefreshCw,
  GitCommit,
  Check
} from "lucide-react";
import type {
  EnvironmentConfig,
  CiCdExecutionResult,
  ReleaseChecklist,
  RollbackExecutionResult
} from "../../lib/reliability/safe-release-manager.ts";
import type { FeatureFlagDefinition } from "../../lib/admin/feature-flags-engine.ts";

interface ReleaseManagementDashboardProps {
  environments: EnvironmentConfig[];
  latestPipeline?: CiCdExecutionResult | null;
  featureFlags: FeatureFlagDefinition[];
  releaseChecklist: ReleaseChecklist;
  isReleaseFreezeActive: boolean;
  onRunCiCd: (env: "STAGING" | "PRODUCTION") => Promise<CiCdExecutionResult>;
  onKillSwitchFlag: (key: string, reason: string) => Promise<void>;
  onTriggerRollback: (tier: "FEATURE_FLAG" | "APPLICATION_VERSION" | "DATABASE_RESTORE", flagKey?: string) => Promise<void>;
}

export const ReleaseManagementDashboard: React.FC<ReleaseManagementDashboardProps> = ({
  environments,
  latestPipeline,
  featureFlags,
  releaseChecklist,
  isReleaseFreezeActive,
  onRunCiCd,
  onKillSwitchFlag,
  onTriggerRollback
}) => {
  const [pipelineState, setPipelineState] = useState<CiCdExecutionResult | null>(latestPipeline || null);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);

  const handleRunPipeline = async (env: "STAGING" | "PRODUCTION") => {
    setIsRunningPipeline(true);
    try {
      const res = await onRunCiCd(env);
      setPipelineState(res);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const checklistItems = [
    { key: "testsPassed", label: "Automated unit & integration tests passed", val: releaseChecklist.testsPassed },
    { key: "securityReviewPassed", label: "Security vulnerability & dependency scan passed", val: releaseChecklist.securityReviewPassed },
    { key: "migrationReviewed", label: "Database migration backward-compatible & staging-tested", val: releaseChecklist.migrationReviewed },
    { key: "rollbackPlanReady", label: "Multi-tier application & flag rollback plan verified", val: releaseChecklist.rollbackPlanReady },
    { key: "monitoringReady", label: "Prometheus metrics & telemetry dashboards active", val: releaseChecklist.monitoringReady },
    { key: "alertsConfigured", label: "SLO burn-rate & connection pool saturation alerts active", val: releaseChecklist.alertsConfigured },
    { key: "stakeholdersInformed", label: "Release notes published & customer support briefed", val: releaseChecklist.stakeholdersInformed }
  ];

  return (
    <div className="space-y-8 p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Safe Release & CI/CD Pipeline Control</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Environment gating, 10-stage deployment pipelines, migration safety, feature flag kill-switches, and automated release freeze.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleRunPipeline("STAGING")}
            disabled={isRunningPipeline}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-50 transition"
          >
            Deploy to Staging
          </button>
          <button
            onClick={() => handleRunPipeline("PRODUCTION")}
            disabled={isRunningPipeline || isReleaseFreezeActive}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs disabled:opacity-50 transition shadow-lg shadow-indigo-500/20"
          >
            {isRunningPipeline ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Deploy to Production</span>
          </button>
        </div>
      </div>

      {/* Automated Release Freeze Alert Banner */}
      {isReleaseFreezeActive && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <span className="font-semibold text-rose-200">AUTOMATED RELEASE FREEZE ACTIVE</span>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Production error budget is exhausted or 1-hour burn rate $\ge 14.4\times$. Non-critical production deployments are paused until SLO metrics normalize.
            </p>
          </div>
        </div>
      )}

      {/* Environments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {environments.map((env) => (
          <div
            key={env.environment}
            className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                {env.environment}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                  env.environment === "PRODUCTION"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : env.environment === "STAGING"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {env.environment}
              </span>
            </div>
            <div className="text-xs space-y-1.5 text-slate-400">
              <div className="flex justify-between">
                <span>Auth Enforced:</span>
                <span className="text-slate-200">{env.authEnforced ? "Yes" : "Mocked"}</span>
              </div>
              <div className="flex justify-between">
                <span>Release Signing:</span>
                <span className="text-slate-200">{env.requireSignedCertificate ? "Enforced" : "Disabled"}</span>
              </div>
              <div className="flex justify-between">
                <span>Error Budget Gate:</span>
                <span className="text-slate-200">{env.errorBudgetEnforced ? "Active" : "Bypassed"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 10-Stage CI/CD Pipeline Visualizer */}
      {pipelineState && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <GitCommit className="w-4 h-4 text-indigo-400" />
              <span>CI/CD Pipeline ({pipelineState.commitSha.slice(0, 7)})</span>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                pipelineState.success
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {pipelineState.success ? "10/10 STAGES PASSED" : "PIPELINE FAILED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {pipelineState.stages.map((st, i) => (
              <div
                key={st.stage}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px]">Step {i + 1}</span>
                  {st.status === "PASSED" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : st.status === "FAILED" ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <span className="text-[10px] text-slate-500">SKIP</span>
                  )}
                </div>
                <div className="font-medium text-slate-300 truncate">{st.stage}</div>
                <div className="text-[10px] text-slate-500 font-mono">{st.durationMs}ms</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-Point Release Checklist & Feature Flags Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Point Checklist */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            7-Point Production Release Checklist
          </h3>
          <div className="space-y-2.5">
            {checklistItems.map((item) => (
              <div
                key={item.key}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <span className="text-slate-300">{item.label}</span>
                {item.val ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                    <Check className="w-3.5 h-3.5" /> Passed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Failed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags & Emergency Kill Switches */}
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Feature Flags & Emergency Kill Switches
          </h3>
          <div className="space-y-3">
            {featureFlags.map((flag) => (
              <div
                key={flag.key}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{flag.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({flag.rolloutPercentage}%)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{flag.description}</p>
                </div>
                {flag.isEnabled ? (
                  <button
                    onClick={() => onKillSwitchFlag(flag.key, "Operator manual kill switch")}
                    className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition"
                  >
                    Kill Switch
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-[11px] font-medium">
                    Disabled
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

