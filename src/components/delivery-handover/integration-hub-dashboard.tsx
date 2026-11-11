"use client";

import React, { useState } from "react";
import { IntegrationProvider } from "@/lib/validations/delivery-handover";
import { ConnectionHealthResult } from "@/lib/integrations/adapter-interface";
import {
  Plug,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Settings,
  RefreshCw,
  Power,
  ShieldCheck,
  Send,
  FileCode,
  Layers
} from "lucide-react";

interface IntegrationHubProps {
  connections: ConnectionHealthResult[];
  onConnect: (provider: IntegrationProvider, credentials: any) => Promise<void>;
  onDisconnect: (provider: IntegrationProvider) => Promise<void>;
  onTestConnection: (provider: IntegrationProvider) => Promise<void>;
}

const PROVIDER_METADATA: Record<IntegrationProvider, { name: string; category: string; description: string; iconBg: string }> = {
  JIRA: {
    name: "Jira Cloud",
    category: "Issue Tracking",
    description: "Export approved user stories into Jira Cloud issues with full priority, label, and milestone mapping.",
    iconBg: "bg-blue-600 text-white"
  },
  LINEAR: {
    name: "Linear",
    category: "Agile Project Management",
    description: "High-velocity issue creation for modern product teams via Linear GraphQL API.",
    iconBg: "bg-indigo-600 text-white"
  },
  TRELLO: {
    name: "Trello",
    category: "Kanban Board",
    description: "Generate Trello cards organized by delivery sprint lists with checklists and due dates.",
    iconBg: "bg-sky-600 text-white"
  },
  GITHUB: {
    name: "GitHub Issues",
    category: "Developer Repository",
    description: "Directly open GitHub repository issues with markdown acceptance criteria and milestones.",
    iconBg: "bg-slate-900 text-white"
  },
  SLACK: {
    name: "Slack Notifications",
    category: "Team Communication",
    description: "Broadcast milestone delivery digests, approval requests, and scope change alerts.",
    iconBg: "bg-emerald-600 text-white"
  },
  NOTION: {
    name: "Notion Workspace",
    category: "Knowledge Base",
    description: "Export complete scope summaries, estimates, and tasks into Notion databases or pages.",
    iconBg: "bg-amber-600 text-white"
  }
};

export const IntegrationHubDashboard: React.FC<IntegrationHubProps> = ({
  connections,
  onConnect,
  onDisconnect,
  onTestConnection
}) => {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [targetProject, setTargetProject] = useState("");
  const [externalOrgId, setExternalOrgId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const getConnection = (provider: IntegrationProvider) => {
    return connections.find((c) => c.provider === provider) || {
      provider,
      healthy: false,
      status: "DISCONNECTED" as const,
      checkedAt: "Never"
    };
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    try {
      setIsSubmitting(true);
      await onConnect(selectedProvider, {
        apiKey,
        targetProject: targetProject || undefined,
        externalOrgId: externalOrgId || undefined,
        webhookUrl: webhookUrl || undefined
      });
      setSelectedProvider(null);
      setApiKey("");
      setTargetProject("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestPing = async (provider: IntegrationProvider) => {
    try {
      setTestingProvider(provider);
      await onTestConnection(provider);
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Plug className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delivery Handover & Integration Hub</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Connect your agency workspace directly to Jira, Linear, Trello, GitHub, Slack, and Notion with real-time health monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {connections.filter((c) => c.healthy).length} of 6 Connected
          </span>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(Object.keys(PROVIDER_METADATA) as IntegrationProvider[]).map((provider) => {
          const meta = PROVIDER_METADATA[provider];
          const conn = getConnection(provider);
          const isConnected = conn.status === "HEALTHY" || conn.status === "DEGRADED";

          return (
            <div
              key={provider}
              className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 transition hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${meta.iconBg}`}>
                      {provider.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{meta.name}</h3>
                      <span className="text-[11px] text-slate-400">{meta.category}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      conn.status === "HEALTHY"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                        : conn.status === "ERROR"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200"
                    }`}
                  >
                    {conn.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                  {meta.description}
                </p>

                {/* Connection Health & Latency */}
                {isConnected && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Target:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{conn.workspaceName || "Default Workspace"}</strong>
                    </div>
                    {conn.latencyMs && (
                      <div className="flex justify-between">
                        <span>Latency:</span>
                        <span className="font-mono">{conn.latencyMs}ms</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleTestPing(provider)}
                      disabled={testingProvider === provider}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingProvider === provider ? "animate-spin" : ""}`} />
                      Test Ping
                    </button>

                    <button
                      onClick={() => onDisconnect(provider)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Power className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setSelectedProvider(provider)}
                    className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <Plug className="w-3.5 h-3.5" /> Connect {meta.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Integration Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConnectSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plug className="w-5 h-5 text-indigo-500" /> Connect {PROVIDER_METADATA[selectedProvider].name}
            </h3>
            <p className="text-slate-500">
              Provide authorization credentials to enable automated task exports and status syncing.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Token / Personal Access Key <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="ghp_... or lin_api_... or Atlassian token"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            {selectedProvider === "JIRA" && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jira Cloud Domain</label>
                  <input
                    type="text"
                    placeholder="your-company.atlassian.net"
                    value={externalOrgId}
                    onChange={(e) => setExternalOrgId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Project Key</label>
                  <input
                    type="text"
                    placeholder="e.g. PROJ or SPEC"
                    value={targetProject}
                    onChange={(e) => setTargetProject(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase"
                  />
                </div>
              </>
            )}

            {selectedProvider === "LINEAR" && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Linear Team Key</label>
                <input
                  type="text"
                  placeholder="e.g. ENG or PRODUCT"
                  value={targetProject}
                  onChange={(e) => setTargetProject(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 uppercase"
                />
              </div>
            )}

            {selectedProvider === "GITHUB" && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Repository (owner/repo)</label>
                <input
                  type="text"
                  placeholder="e.g. acme-org/client-portal"
                  value={targetProject}
                  onChange={(e) => setTargetProject(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}

            {selectedProvider === "SLACK" && (
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Incoming Webhook URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/webhook/slack-notifications"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedProvider(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow transition disabled:opacity-50"
              >
                Save & Verify Connection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
