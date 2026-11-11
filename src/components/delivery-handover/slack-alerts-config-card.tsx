"use client";

import React, { useState } from "react";
import { SlackNotificationSchema } from "@/lib/validations/delivery-handover";
import {
  MessageSquare,
  Bell,
  CheckCircle2,
  Send,
  AlertTriangle,
  Sliders
} from "lucide-react";

interface SlackAlertsConfigProps {
  initialWebhookUrl?: string;
  onSaveConfig: (webhookUrl: string, eventSubscriptions: string[]) => Promise<void>;
  onSendTestNotification: (notificationType: "PROJECT_UPDATE" | "APPROVAL_REQUEST" | "CHANGE_REQUEST_ALERT" | "MILESTONE_REMINDER") => Promise<void>;
}

export const SlackAlertsConfigCard: React.FC<SlackAlertsConfigProps> = ({
  initialWebhookUrl = "",
  onSaveConfig,
  onSendTestNotification
}) => {
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [subscriptions, setSubscriptions] = useState<string[]>([
    "APPROVAL_REQUEST",
    "CHANGE_REQUEST_ALERT",
    "MILESTONE_REMINDER"
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [testSent, setTestSent] = useState<string | null>(null);

  const toggleSub = (sub: string) => {
    setSubscriptions((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSaveConfig(webhookUrl, subscriptions);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (type: "PROJECT_UPDATE" | "APPROVAL_REQUEST" | "CHANGE_REQUEST_ALERT" | "MILESTONE_REMINDER") => {
    try {
      setTestSent(type);
      await onSendTestNotification(type);
      setTimeout(() => setTestSent(null), 3000);
    } catch {
      setTestSent(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Slack Team Notification Channel</h3>
            <p className="text-xs text-slate-500">Keep engineering and management aligned on scope approvals and milestone delivery.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Slack Incoming Webhook URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/webhook/slack-notifications"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
          />
        </div>

        {/* Event Toggles */}
        <div className="space-y-2">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            Active Notification Triggers:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { id: "APPROVAL_REQUEST", label: "Proposal Approval Requests", desc: "Alerts when a client portal proposal is submitted or approved." },
              { id: "CHANGE_REQUEST_ALERT", label: "Scope Change Requests", desc: "Alerts team when a change request alters timeline or cost." },
              { id: "MILESTONE_REMINDER", label: "Milestone Delivery Reminders", desc: "Sends heads-up alerts 3 days prior to milestone target dates." },
              { id: "PROJECT_UPDATE", label: "Weekly Progress Digests", desc: "Dispatches weekly non-technical sprint digests to shared channel." }
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => toggleSub(item.id)}
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                  subscriptions.includes(item.id)
                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                    : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={subscriptions.includes(item.id)}
                  onChange={() => {}}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <div>
                  <div className="font-bold text-xs">{item.label}</div>
                  <div className="text-[11px] opacity-75">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls & Test Pings */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Send Sample Ping:</span>
            <button
              type="button"
              disabled={!webhookUrl}
              onClick={() => handleTest("APPROVAL_REQUEST")}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-50"
            >
              {testSent === "APPROVAL_REQUEST" ? "Sent!" : "Approval Alert"}
            </button>
            <button
              type="button"
              disabled={!webhookUrl}
              onClick={() => handleTest("MILESTONE_REMINDER")}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-50"
            >
              {testSent === "MILESTONE_REMINDER" ? "Sent!" : "Milestone Alert"}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Save Slack Settings
          </button>
        </div>
      </form>
    </div>
  );
};
