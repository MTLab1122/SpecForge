"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Unplug,
  Check,
  X,
  Clock,
  Layers,
  ArrowRight
} from "lucide-react";

export type IntegrationProvider = "JIRA" | "LINEAR" | "TRELLO" | "GITHUB" | "NOTION" | "SLACK";

interface ProviderCardInfo {
  provider: IntegrationProvider;
  name: string;
  category: "Issue Tracking" | "Project Management" | "Code & Dev" | "Documentation" | "Team Messaging";
  description: string;
  iconBg: string;
  permittedScopes: string[];
  prohibitedScopes: string[];
}

interface ConnectionState {
  provider: IntegrationProvider;
  status: "CONNECTED" | "DISCONNECTED" | "TOKEN_EXPIRED" | "RATE_LIMITED";
  accountName?: string;
  workspaceName?: string;
  tokenExpiresAt?: string;
  rateLimitRemaining?: number;
  lastSuccessfulExport?: string;
}

interface ExportMappingItem {
  id: string;
  taskId: string;
  taskTitle: string;
  provider: IntegrationProvider;
  externalResourceId: string;
  externalUrl?: string;
  status: "SUCCESS" | "FAILED" | "ALREADY_EXPORTED";
  isApproved: boolean;
  exportedAt: string;
}

export function SafeIntegrationManager({
  organizationId = "org_apex_digital",
  userRole = "MANAGER"
}: {
  organizationId?: string;
  userRole?: string;
}) {
  const providersList: ProviderCardInfo[] = [
    {
      provider: "JIRA",
      name: "Atlassian Jira Cloud",
      category: "Issue Tracking",
      description: "Direct export of approved scope deliverables into Jira Cloud epics and stories.",
      iconBg: "bg-blue-600",
      permittedScopes: ["read:jira-work", "write:jira-work"],
      prohibitedScopes: ["admin:jira", "delete:jira-work", "manage:jira-project"]
    },
    {
      provider: "LINEAR",
      name: "Linear App",
      category: "Issue Tracking",
      description: "Fast synchronized handover to engineering cycles with priority tags.",
      iconBg: "bg-indigo-600",
      permittedScopes: ["read", "issues:create"],
      prohibitedScopes: ["admin", "delete", "write:workspace"]
    },
    {
      provider: "TRELLO",
      name: "Trello Boards",
      category: "Project Management",
      description: "Visual kanban board cards for agency client delivery sprints.",
      iconBg: "bg-sky-600",
      permittedScopes: ["read", "write"],
      prohibitedScopes: ["account:delete", "admin"]
    },
    {
      provider: "GITHUB",
      name: "GitHub Issues",
      category: "Code & Dev",
      description: "Creates issues and milestones in client repositories with zero repo modification rights.",
      iconBg: "bg-slate-700",
      permittedScopes: ["public_repo", "issues:write"],
      prohibitedScopes: ["delete_repo", "admin:org", "repo (full write)"]
    },
    {
      provider: "NOTION",
      name: "Notion Databases",
      category: "Documentation",
      description: "Client workspace documentation tables with rate cards and acceptance criteria.",
      iconBg: "bg-stone-700",
      permittedScopes: ["pages:write", "databases:write"],
      prohibitedScopes: ["workspace:admin", "delete:all"]
    },
    {
      provider: "SLACK",
      name: "Slack Webhooks",
      category: "Team Messaging",
      description: "Real-time delivery milestone alerts to designated agency channel.",
      iconBg: "bg-fuchsia-600",
      permittedScopes: ["chat:write", "incoming-webhook"],
      prohibitedScopes: ["admin.*", "admin.users:write"]
    }
  ];

  const [connections, setConnections] = useState<Record<IntegrationProvider, ConnectionState>>({
    JIRA: {
      provider: "JIRA",
      status: "CONNECTED",
      accountName: "jira-bot@apexdigital.com",
      workspaceName: "apex-digital.atlassian.net",
      tokenExpiresAt: "In 84 days",
      rateLimitRemaining: 4890,
      lastSuccessfulExport: "12 mins ago"
    },
    LINEAR: {
      provider: "LINEAR",
      status: "CONNECTED",
      accountName: "linear-integrator@apexdigital.com",
      workspaceName: "Apex Team (ENG)",
      tokenExpiresAt: "In 89 days",
      rateLimitRemaining: 1450,
      lastSuccessfulExport: "1 hour ago"
    },
    TRELLO: {
      provider: "TRELLO",
      status: "DISCONNECTED"
    },
    GITHUB: {
      provider: "GITHUB",
      status: "CONNECTED",
      accountName: "github-actions@apexdigital.com",
      workspaceName: "apexdigital/client-portal",
      tokenExpiresAt: "In 30 days",
      rateLimitRemaining: 4980,
      lastSuccessfulExport: "Yesterday"
    },
    NOTION: {
      provider: "NOTION",
      status: "DISCONNECTED"
    },
    SLACK: {
      provider: "SLACK",
      status: "CONNECTED",
      accountName: "#agency-announcements",
      workspaceName: "Apex Digital Slack",
      tokenExpiresAt: "Permanent Webhook",
      rateLimitRemaining: 9999,
      lastSuccessfulExport: "30 mins ago"
    }
  });

  const [exportMappings, setExportMappings] = useState<ExportMappingItem[]>([
    {
      id: "map_1",
      taskId: "TSK-101",
      taskTitle: "Setup Postgres Connection Pool & Prisma Migration",
      provider: "JIRA",
      externalResourceId: "SPEC-412",
      externalUrl: "https://apex-digital.atlassian.net/browse/SPEC-412",
      status: "SUCCESS",
      isApproved: true,
      exportedAt: "12 mins ago"
    },
    {
      id: "map_2",
      taskId: "TSK-102",
      taskTitle: "Configure NextAuth Multi-Factor Auth Flow",
      provider: "LINEAR",
      externalResourceId: "LIN-204",
      externalUrl: "https://linear.app/apex/issue/LIN-204",
      status: "SUCCESS",
      isApproved: true,
      exportedAt: "1 hour ago"
    },
    {
      id: "map_3",
      taskId: "TSK-103",
      taskTitle: "Build Stripe Webhook Cryptographic Verification",
      provider: "GITHUB",
      externalResourceId: "#88",
      externalUrl: "https://github.com/apexdigital/client-portal/issues/88",
      status: "SUCCESS",
      isApproved: true,
      exportedAt: "Yesterday"
    }
  ]);

  const [activeModalProvider, setActiveModalProvider] = useState<ProviderCardInfo | null>(null);
  const [testTaskTitle, setTestTaskTitle] = useState("Architect Asynchronous Durable Job Queue");
  const [testTaskApproved, setTestTaskApproved] = useState(true);
  const [selectedExportProvider, setSelectedExportProvider] = useState<IntegrationProvider>("JIRA");
  const [bannerMessage, setBannerMessage] = useState<{ type: "SUCCESS" | "ERROR"; text: string } | null>(null);

  const handleConnectProvider = (provider: IntegrationProvider) => {
    setConnections((prev) => ({
      ...prev,
      [provider]: {
        provider,
        status: "CONNECTED",
        accountName: `service-account@${organizationId}.com`,
        workspaceName: `${provider.toLowerCase()}-workspace`,
        tokenExpiresAt: "In 90 days",
        rateLimitRemaining: 5000,
        lastSuccessfulExport: "Never"
      }
    }));
    setActiveModalProvider(null);
    setBannerMessage({
      type: "SUCCESS",
      text: `${provider} connected successfully under least-privilege OAuth scopes.`
    });
  };

  const handleDisconnectProvider = (provider: IntegrationProvider) => {
    setConnections((prev) => ({
      ...prev,
      [provider]: {
        provider,
        status: "DISCONNECTED"
      }
    }));
    setBannerMessage({
      type: "SUCCESS",
      text: `${provider} credentials revoked and disconnected.`
    });
  };

  const handleExportTask = () => {
    setBannerMessage(null);

    // 1. Approval Guard
    if (!testTaskApproved) {
      setBannerMessage({
        type: "ERROR",
        text: "Approval Guard Denied: Task cannot be exported because it has not been approved. Client or manager approval of scope is required prior to external handover."
      });
      return;
    }

    const conn = connections[selectedExportProvider];
    if (!conn || conn.status !== "CONNECTED") {
      setBannerMessage({
        type: "ERROR",
        text: `Cannot export task: ${selectedExportProvider} is not connected. Please connect the integration first.`
      });
      return;
    }

    // 2. Check if already exported (Idempotency)
    const existing = exportMappings.find(
      (m) => m.taskTitle === testTaskTitle && m.provider === selectedExportProvider
    );

    if (existing) {
      setBannerMessage({
        type: "SUCCESS",
        text: `Idempotent Export Hit: Task is already exported to ${selectedExportProvider} as ${existing.externalResourceId}. Duplicate issue creation prevented.`
      });
      return;
    }

    // Export new task
    const seed = Math.floor(100 + Math.random() * 900);
    const newMapping: ExportMappingItem = {
      id: `map_${Date.now()}`,
      taskId: `TSK-${Math.floor(200 + Math.random() * 800)}`,
      taskTitle: testTaskTitle,
      provider: selectedExportProvider,
      externalResourceId: `${selectedExportProvider === "GITHUB" ? "#" : selectedExportProvider.slice(0, 3) + "-"}${seed}`,
      externalUrl: `https://${selectedExportProvider.toLowerCase()}.com/task/${seed}`,
      status: "SUCCESS",
      isApproved: true,
      exportedAt: "Just now"
    };

    setExportMappings((prev) => [newMapping, ...prev]);
    setBannerMessage({
      type: "SUCCESS",
      text: `Task successfully exported to ${selectedExportProvider} as ${newMapping.externalResourceId}!`
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight">Safe Integration Platform</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Reliable task handover across Jira, Linear, Trello, GitHub, Notion, and Slack with least-privilege scopes and strict idempotency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-indigo-300 border border-indigo-500/20">
            Tenant: {organizationId}
          </span>
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-mono text-emerald-300 border border-emerald-500/20">
            Role: {userRole}
          </span>
        </div>
      </div>

      {/* Banner */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-lg text-sm flex items-start gap-3 border ${
            bannerMessage.type === "SUCCESS"
              ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
              : "bg-rose-950/60 border-rose-800 text-rose-200"
          }`}
        >
          {bannerMessage.type === "SUCCESS" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          )}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* 6 Integration Adapters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providersList.map((item) => {
          const conn = connections[item.provider];
          const isConnected = conn.status === "CONNECTED";

          return (
            <div
              key={item.provider}
              className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between gap-4 hover:border-slate-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${item.iconBg}`}>
                      {item.provider.slice(0, 2)}
                    </span>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-200">{item.name}</h3>
                      <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div>
                    {isConnected ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>

                {/* Health Metrics if Connected */}
                {isConnected && (
                  <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800/80 text-[11px] space-y-1.5 font-mono text-slate-300">
                    <div className="flex justify-between text-slate-400">
                      <span>Account:</span>
                      <span className="text-slate-200 truncate max-w-[160px]">{conn.accountName}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Token Expiry:</span>
                      <span className="text-emerald-400">{conn.tokenExpiresAt}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Rate Limit:</span>
                      <span className="text-indigo-400">{conn.rateLimitRemaining} req left</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => setActiveModalProvider(item)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition"
                >
                  <Lock className="w-3 h-3" /> Scopes
                </button>
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnectProvider(item.provider)}
                    className="px-3 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 text-slate-300 rounded text-xs font-medium flex items-center gap-1 transition"
                  >
                    <Unplug className="w-3 h-3" /> Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnectProvider(item.provider)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 transition"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Export Simulator with Approval Check */}
      <div className="p-5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Export Approved Task to External Provider
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict approval guard: Tasks without client or manager approval cannot be exported.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Simulate Approval:</span>
            <button
              onClick={() => setTestTaskApproved(!testTaskApproved)}
              className={`px-3 py-1 rounded text-xs font-medium border transition ${
                testTaskApproved
                  ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                  : "bg-rose-950 border-rose-800 text-rose-300"
              }`}
            >
              {testTaskApproved ? "APPROVED (Ready for Handover)" : "UNAPPROVED (Blocked)"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
            <input
              type="text"
              value={testTaskTitle}
              onChange={(e) => setTestTaskTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Integration</label>
            <select
              value={selectedExportProvider}
              onChange={(e) => setSelectedExportProvider(e.target.value as IntegrationProvider)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {providersList.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Idempotency key stored: duplicate calls will not create duplicate issues.
          </span>
          <button
            onClick={handleExportTask}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition"
          >
            Export Task <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Export History & Mapping Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Export History & Synchronized Mappings</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Internal Task ID</th>
                <th className="px-4 py-3">Task Title</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">External Issue Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">External Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {exportMappings.map((m) => (
                <tr key={m.id} className="hover:bg-slate-900/50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.taskId}</td>
                  <td className="px-4 py-3 font-medium text-xs text-slate-200">{m.taskTitle}</td>
                  <td className="px-4 py-3 font-mono text-xs text-indigo-300">{m.provider}</td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400 font-semibold">
                    {m.externalResourceId}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> Synced
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.externalUrl && (
                      <a
                        href={m.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-medium transition"
                      >
                        View External <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scope Limitation Modal */}
      {activeModalProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-base text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" /> OAuth Scope Boundaries: {activeModalProvider.name}
              </h3>
              <button
                onClick={() => setActiveModalProvider(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-emerald-400 flex items-center gap-1 mb-1.5">
                  <Check className="w-4 h-4 text-emerald-400" /> Permitted Minimal Scopes (Least Privilege):
                </span>
                <ul className="list-disc pl-5 text-slate-300 space-y-1 font-mono">
                  {activeModalProvider.permittedScopes.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="font-semibold text-rose-400 flex items-center gap-1 mb-1.5">
                  <X className="w-4 h-4 text-rose-400" /> Strictly Prohibited Destructive Scopes:
                </span>
                <ul className="list-disc pl-5 text-slate-400 space-y-1 font-mono">
                  {activeModalProvider.prohibitedScopes.map((s) => (
                    <li key={s}>{s} (Rejected by Security Policy)</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModalProvider(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

