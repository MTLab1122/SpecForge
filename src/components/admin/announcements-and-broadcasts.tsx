"use client";

import React, { useState } from "react";
import type { AnnouncementItem, AnnouncementType } from "@/lib/admin/announcements-engine";
import {
  Megaphone,
  Mail,
  Sliders,
  Calendar,
  CheckCircle2,
  Plus,
  X,
  ExternalLink
} from "lucide-react";

interface AnnouncementsAndBroadcastsProps {
  announcements: AnnouncementItem[];
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onCreateAnnouncement: (data: {
    title: string;
    content: string;
    type: AnnouncementType;
    targetPlan?: string;
    actionUrl?: string;
    actionLabel?: string;
  }) => Promise<void>;
}

export const AnnouncementsAndBroadcasts: React.FC<AnnouncementsAndBroadcastsProps> = ({
  announcements,
  onToggleActive,
  onCreateAnnouncement
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState<AnnouncementType>("BANNER");
  const [formTargetPlan, setFormTargetPlan] = useState("");
  const [formActionUrl, setFormActionUrl] = useState("");
  const [formActionLabel, setFormActionLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;
    try {
      setIsSubmitting(true);
      await onCreateAnnouncement({
        title: formTitle,
        content: formContent,
        type: formType,
        targetPlan: formTargetPlan || undefined,
        actionUrl: formActionUrl || undefined,
        actionLabel: formActionLabel || undefined
      });
      setShowCreateModal(false);
      setFormTitle("");
      setFormContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            <Megaphone className="w-4 h-4" />
            <span>Platform Broadcasts</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            In-App Announcements & Changelog Broadcasts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver product updates, feature rollouts, and targeted news to all or specific customer tiers.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {announcements.map((ann) => (
          <div key={ann.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {ann.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {ann.type}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {ann.targetPlan ? `Plan: ${ann.targetPlan}` : "All Plans"}
                </span>
              </div>

              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {ann.content}
              </p>

              {ann.actionUrl && (
                <div className="flex items-center gap-1 text-indigo-600 font-semibold">
                  <span>Action: {ann.actionLabel || "Learn More"}</span>
                  <ExternalLink className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onToggleActive(ann.id, !ann.isActive)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  ann.isActive
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-100 text-slate-500 dark:bg-slate-800"
                }`}
              >
                {ann.isActive ? "Active (Broadcasting)" : "Paused"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create Announcement */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Compose New Announcement
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Major Update: 1-Click Linear & Jira Task Handover"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Body Text</label>
                <textarea
                  rows={3}
                  placeholder="Detailed description of the new capability or maintenance announcement..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Presentation Format</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  >
                    <option value="BANNER">Top Banner Alert</option>
                    <option value="MODAL">Center Modal Popup</option>
                    <option value="CHANGELOG">Changelog Feed</option>
                    <option value="EMAIL">Transactional Broadcast</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Target Audience Plan</label>
                  <select
                    value={formTargetPlan}
                    onChange={(e) => setFormTargetPlan(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  >
                    <option value="">All Tiers (Universal)</option>
                    <option value="AGENCY">Agency Tier Only</option>
                    <option value="ENTERPRISE">Enterprise Tier Only</option>
                    <option value="PROFESSIONAL">Professional Tier Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Action URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="/integrations"
                    value={formActionUrl}
                    onChange={(e) => setFormActionUrl(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Button Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="Configure Now"
                    value={formActionLabel}
                    onChange={(e) => setFormActionLabel(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                >
                  {isSubmitting ? "Publishing..." : "Publish Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

