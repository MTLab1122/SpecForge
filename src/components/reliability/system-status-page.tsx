"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Wrench,
  ShieldCheck,
  Server,
  Zap,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import type {
  PublicStatusSnapshot,
  ComponentHealth,
  OverallSystemStatus
} from "../../lib/reliability/status-page-service.ts";

interface SystemStatusPageProps {
  statusData: PublicStatusSnapshot;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const SystemStatusPage: React.FC<SystemStatusPageProps> = ({
  statusData,
  onRefresh,
  isRefreshing = false
}) => {
  const getOverallBadge = (status: OverallSystemStatus) => {
    switch (status) {
      case "ALL_SYSTEMS_OPERATIONAL":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          label: "All Systems Fully Operational"
        };
      case "SOME_SYSTEMS_DEGRADED":
        return {
          bg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
          label: "Degraded Performance on Some Components"
        };
      case "PARTIAL_SYSTEM_OUTAGE":
        return {
          bg: "bg-orange-500/10 border-orange-500/20 text-orange-400",
          icon: <AlertTriangle className="w-5 h-5 text-orange-400" />,
          label: "Partial Service Outage"
        };
      case "MAJOR_SYSTEM_OUTAGE":
        return {
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-400",
          icon: <XCircle className="w-5 h-5 text-rose-400" />,
          label: "Major System Outage Detected"
        };
    }
  };

  const getComponentBadge = (status: ComponentHealth) => {
    switch (status) {
      case "OPERATIONAL":
        return {
          text: "text-emerald-400",
          bg: "bg-emerald-400/10",
          dot: "bg-emerald-400",
          label: "Operational"
        };
      case "DEGRADED_PERFORMANCE":
        return {
          text: "text-amber-400",
          bg: "bg-amber-400/10",
          dot: "bg-amber-400",
          label: "Degraded"
        };
      case "PARTIAL_OUTAGE":
        return {
          text: "text-orange-400",
          bg: "bg-orange-400/10",
          dot: "bg-orange-400",
          label: "Partial Outage"
        };
      case "MAJOR_OUTAGE":
        return {
          text: "text-rose-400",
          bg: "bg-rose-400/10",
          dot: "bg-rose-400",
          label: "Major Outage"
        };
      case "UNDER_MAINTENANCE":
        return {
          text: "text-blue-400",
          bg: "bg-blue-400/10",
          dot: "bg-blue-400",
          label: "Maintenance"
        };
    }
  };

  const overall = getOverallBadge(statusData.overallStatus);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
              <h1 className="text-2xl font-bold tracking-tight">SpecForge System Status</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Live service availability, incident updates, and scheduled maintenance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Updated: {new Date(statusData.updatedAt).toLocaleTimeString()}
            </span>
            {onRefresh && (
              <button
                onClick={() => onRefresh()}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50 transition"
                title="Refresh Status"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
              </button>
            )}
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-5 rounded-xl border flex items-center gap-4 ${overall.bg}`}>
          {overall.icon}
          <div>
            <h2 className="text-lg font-semibold">{overall.label}</h2>
            <p className="text-xs opacity-90 mt-0.5">
              SLO compliance actively tracked across all production microservices and delivery adapters.
            </p>
          </div>
        </div>

        {/* Active Maintenance Notices */}
        {statusData.maintenanceNotices.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-blue-400" /> Scheduled Maintenance
            </h3>
            {statusData.maintenanceNotices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/20 text-blue-200 text-sm space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-300">{notice.title}</span>
                  <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded text-blue-300 uppercase">
                    {notice.status}
                  </span>
                </div>
                <p className="text-xs text-blue-300/80">{notice.description}</p>
                <div className="text-xs text-blue-400/60 pt-1">
                  Window: {new Date(notice.scheduledStart).toLocaleString()} –{" "}
                  {new Date(notice.scheduledEnd).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Incidents */}
        {statusData.activeIncidents.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Active Incidents
            </h3>
            {statusData.activeIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{inc.title}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {inc.status}
                  </span>
                </div>
                <div className="space-y-2 border-l-2 border-slate-800 pl-4 my-2">
                  {inc.updates.map((upd) => (
                    <div key={upd.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(upd.timestamp).toLocaleTimeString()}</span>
                        <span className="text-indigo-400 uppercase font-semibold">[{upd.status}]</span>
                      </div>
                      <p className="text-slate-300">{upd.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Components Health List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" /> Platform Services
          </h3>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl divide-y divide-slate-800/60 overflow-hidden">
            {statusData.components.map((comp) => {
              const badge = getComponentBadge(comp.status);
              return (
                <div
                  key={comp.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 transition"
                >
                  <div>
                    <span className="font-medium text-slate-200 text-sm">{comp.name}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{comp.description}</p>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <span className="text-xs text-slate-500 font-mono">
                      {comp.uptime90DaysPercent}% 90d
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Incidents (90-Day History) */}
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Past Incident History
          </h3>
          {statusData.pastIncidents.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/60 text-center text-xs text-slate-500">
              No incidents reported in the last 90 days. 100% operational uptime maintained.
            </div>
          ) : (
            <div className="space-y-2">
              {statusData.pastIncidents.map((hist) => (
                <div
                  key={hist.id}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-medium text-slate-300">{hist.title}</span>
                    <p className="text-slate-400">{hist.summary}</p>
                  </div>
                  <div className="text-right text-slate-500 whitespace-nowrap">
                    <div>{new Date(hist.resolvedAt).toLocaleDateString()}</div>
                    <div className="text-emerald-400 text-[11px]">Resolved ({hist.durationMinutes}m)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

