"use client";

import React, { useState } from "react";
import { WebhookEventType } from "@/lib/validations/delivery-handover";
import {
  Webhook,
  Plus,
  Copy,
  Check,
  Send,
  Activity,
  Trash2,
  Lock,
  ExternalLink
} from "lucide-react";

export interface WebhookSubItem {
  id: string;
  targetUrl: string;
  secret: string;
  eventTypes: WebhookEventType[];
  isActive: boolean;
  createdAt: string;
}

interface WebhookManagementProps {
  subscriptions: WebhookSubItem[];
  onCreateSubscription: (data: { targetUrl: string; eventTypes: WebhookEventType[]; description?: string }) => Promise<void>;
  onDeleteSubscription: (id: string) => Promise<void>;
  onTriggerTestPing: (subscriptionId: string) => Promise<void>;
}

const ALL_EVENTS: Array<{ type: WebhookEventType; label: string; desc: string }> = [
  { type: "project.created", label: "project.created", desc: "Fired when a new workspace project is established" },
  { type: "scope.approved", label: "scope.approved", desc: "Fired when requirements scope is locked" },
  { type: "estimate.created", label: "estimate.created", desc: "Fired when commercial estimate is calculated" },
  { type: "proposal.sent", label: "proposal.sent", desc: "Fired when proposal link is dispatched to client" },
  { type: "proposal.approved", label: "proposal.approved", desc: "Fired upon client digital seal sign-off" },
  { type: "change_request.created", label: "change_request.created", desc: "Fired when a scope change order is raised" },
  { type: "change_request.approved", label: "change_request.approved", desc: "Fired when change order is approved" },
  { type: "task.created", label: "task.created", desc: "Fired when executable engineering tasks are generated" },
  { type: "milestone.completed", label: "milestone.completed", desc: "Fired when a delivery milestone is marked done" }
];

export const WebhookManagementPanel: React.FC<WebhookManagementProps> = ({
  subscriptions,
  onCreateSubscription,
  onDeleteSubscription,
  onTriggerTestPing
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>([
    "proposal.approved",
    "scope.approved",
    "milestone.completed"
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEvent = (event: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCopySecret = (secret: string, id: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim() || selectedEvents.length === 0) return;

    try {
      setIsSubmitting(true);
      await onCreateSubscription({ targetUrl, eventTypes: selectedEvents });
      setShowCreateModal(false);
      setTargetUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-500" /> Outbound Webhook Subscriptions
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch cryptographically signed HMAC SHA-256 JSON payloads to external systems and automation pipelines.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add Webhook Endpoint
        </button>
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No webhook endpoints configured. Click &quot;Add Webhook Endpoint&quot; to connect external automation workflows.
          </div>
        ) : (
          subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {sub.targetUrl}
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Created: {sub.createdAt}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTriggerTestPing(sub.id)}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-indigo-500" /> Send Test Event
                  </button>
                  <button
                    onClick={() => onDeleteSubscription(sub.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                    title="Delete Webhook"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subscribed Event Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {sub.eventTypes.map((ev) => (
                  <span
                    key={ev}
                    className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-750"
                  >
                    {ev}
                  </span>
                ))}
              </div>

              {/* Signing Secret */}
              <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Secret:</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                  {sub.secret.substring(0, 8)}••••••••••••••••••••••••
                </span>
                <button
                  type="button"
                  onClick={() => handleCopySecret(sub.secret, sub.id)}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 ml-1"
                >
                  {copiedId === sub.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedId === sub.id ? "Copied" : "Copy Secret"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 text-xs"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Webhook className="w-5 h-5 text-indigo-500" /> Register Webhook Endpoint
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Destination HTTPS Endpoint URL
              </label>
              <input
                type="url"
                required
                placeholder="https://api.yourcompany.com/webhooks/specforge"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Subscribed Event Types:
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ALL_EVENTS.map((item) => {
                  const isChecked = selectedEvents.includes(item.type);
                  return (
                    <div
                      key={item.type}
                      onClick={() => toggleEvent(item.type)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isChecked
                          ? "bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-indigo-950 dark:text-indigo-200"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div>
                        <div className="font-mono font-bold text-xs">{item.label}</div>
                        <div className="text-[11px] opacity-75">{item.desc}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded text-indigo-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedEvents.length === 0}
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow transition disabled:opacity-50"
              >
                Create Subscription
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
