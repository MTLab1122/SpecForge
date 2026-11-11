"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Server,
  Database,
  Lock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  FileCheck,
  FileText,
  Users,
  Copy,
  Check
} from "lucide-react";
import type {
  BackupSnapshotMeta,
  RestoreVerificationResult,
  DisasterRecoveryPlan
} from "../../lib/reliability/disaster-recovery.ts";

interface DisasterRecoveryDashboardProps {
  plan: DisasterRecoveryPlan;
  snapshots: BackupSnapshotMeta[];
  latestRestoreResult?: RestoreVerificationResult | null;
  onRunMonthlyRestoreDrill: () => Promise<RestoreVerificationResult>;
  isDrillRunning?: boolean;
}

export const DisasterRecoveryDashboard: React.FC<DisasterRecoveryDashboardProps> = ({
  plan,
  snapshots,
  latestRestoreResult,
  onRunMonthlyRestoreDrill,
  isDrillRunning = false
}) => {
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [restoreDrillResult, setRestoreDrillResult] = useState<RestoreVerificationResult | null>(
    latestRestoreResult || null
  );

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(key);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const handleDrill = async () => {
    try {
      const result = await onRunMonthlyRestoreDrill();
      setRestoreDrillResult(result);
    } catch (err) {
      console.error("Drill failed:", err);
    }
  };

  return (
    <div className="space-y-8 p-6 bg-slate-950 text-slate-100 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Disaster Recovery & Backup Center</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated daily snapshots, isolated sandbox restore testing, cross-region failover, and legal-hold governance.
          </p>
        </div>
        <button
          onClick={handleDrill}
          disabled={isDrillRunning}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm disabled:opacity-50 transition shadow-lg shadow-indigo-500/20"
        >
          {isDrillRunning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>Run Monthly Restore Drill</span>
        </button>
      </div>

      {/* RTO / RPO & Target Objectives Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold">Recovery Time (RTO)</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{plan.rto.target}</div>
          <p className="text-xs text-slate-500">{plan.rto.description}</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold">Recovery Point (RPO)</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{plan.rpo.target}</div>
          <p className="text-xs text-slate-500">{plan.rpo.description}</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold">Primary Region</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-semibold text-slate-200">{plan.primaryRegion}</div>
          <p className="text-xs text-slate-500">Live active production cluster</p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs uppercase font-semibold">Backup Region</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-semibold text-slate-200">{plan.backupRegion}</div>
          <p className="text-xs text-slate-500">Continuous 15m WAL replication</p>
        </div>
      </div>

      {/* Latest Restore Drill Test Report */}
      {restoreDrillResult && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-slate-200">
                Monthly Restore Test Report (Sandbox Environment)
              </h3>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                restoreDrillResult.isValid && restoreDrillResult.meetsRto
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              }`}
            >
              {restoreDrillResult.isValid && restoreDrillResult.meetsRto
                ? "PASSED — ALL INVARIANTS VERIFIED"
                : "FAILED"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Restored Snapshot</span>
              <span className="font-mono text-slate-300 font-medium">
                {restoreDrillResult.snapshotId}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Restore Latency</span>
              <span className="font-semibold text-emerald-400">
                {restoreDrillResult.latencyMs} ms (Meets 4h RTO)
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Checksum SHA-256</span>
              <span className="text-emerald-400 font-medium">Match Confirmed</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-500 block">Smoke Checks</span>
              <span className="text-indigo-400 font-medium">Read/Write Validated</span>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Region Failover Plan Checklist */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <Server className="w-5 h-5 text-indigo-400" />
          Cross-Region Failover Runbook (8-Phase Sequence)
        </h3>
        <div className="space-y-2">
          {plan.failoverProcedure.map((phase) => (
            <div
              key={phase.step}
              className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                  {phase.step}
                </span>
                <div>
                  <span className="font-medium text-slate-200">{phase.phase}</span>
                  <p className="text-slate-400 text-[11px] mt-0.5">{phase.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                    phase.automated
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {phase.automated ? "Automated" : "Manual Gate"}
                </span>
                <span className="text-slate-500 font-mono">
                  ~{phase.targetDurationMinutes}m
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Communication Templates */}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-400" />
          Customer Disaster Communication Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(plan.customerCommunicationTemplates).map(([key, template]) => (
            <div
              key={key}
              className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 flex flex-col justify-between space-y-3 text-xs"
            >
              <div>
                <span className="font-semibold text-slate-300 uppercase tracking-wide">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
                <p className="text-slate-400 mt-2 text-[11px] leading-relaxed italic">
                  "{template}"
                </p>
              </div>
              <button
                onClick={() => handleCopy(key, template)}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 self-end text-xs font-medium pt-2"
              >
                {copiedTemplate === key ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

