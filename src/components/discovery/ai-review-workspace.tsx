"use client";

import React, { useState } from "react";
import { 
  ConfidenceLevelEnum, 
  ReviewStateEnum, 
  ExtractionQualityModeEnum 
} from "@/lib/validations/trustworthy-ai";

export interface RequirementItem {
  id: string;
  category: "GOAL" | "USER_PERSONA" | "CORE_FEATURE" | "CONSTRAINT" | "RISK" | "DEPENDENCY";
  title: string;
  description: string;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number; // 0.00 to 1.00
  reviewState: "REVIEW_REQUIRED" | "ACCEPTED" | "EDITED" | "REJECTED" | "MARKED_AS_ASSUMPTION";
  isAssumption: boolean;
  assumptionConfirmed: boolean;
  sourceCitation?: string;
  citationStartOffset?: number;
  citationEndOffset?: number;
  aiRationale?: string;
  reviewComments?: string;
  version: number;
}

interface AiReviewWorkspaceProps {
  projectId: string;
  initialItems: RequirementItem[];
  rawSourceText: string;
  currentScopeVersion: number;
  availableVersions: { versionNumber: number; summary: string; createdAt: string; author: string }[];
  onFinalizeScope: () => void;
}

export function AiReviewWorkspace({
  projectId,
  initialItems,
  rawSourceText,
  currentScopeVersion,
  availableVersions,
  onFinalizeScope
}: AiReviewWorkspaceProps) {
  const [items, setItems] = useState<RequirementItem[]>(initialItems);
  const [filterConfidence, setFilterConfidence] = useState<string>("ALL");
  const [filterState, setFilterState] = useState<string>("ALL");
  const [qualityMode, setQualityMode] = useState<"FAST" | "BALANCED" | "THOROUGH">("BALANCED");
  const [activeCitationItem, setActiveCitationItem] = useState<RequirementItem | null>(null);
  const [editingItem, setEditingItem] = useState<RequirementItem | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenPrompt, setRegenPrompt] = useState<string>("");
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [feedbackRating, setFeedbackRating] = useState<string | null>(null);
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");

  // Quality mode credit and token mapping
  const MODE_CONFIG = {
    FAST: { model: "gemini-1.5-flash-8b", credits: 1, duration: "~3s", desc: "Best for quick notes & pasted briefs" },
    BALANCED: { model: "gemini-1.5-flash", credits: 3, duration: "~7s", desc: "Standard schema extraction with sentence offsets" },
    THOROUGH: { model: "gemini-1.5-pro", credits: 6, duration: "~15s", desc: "Deep multi-document analysis & conflict audit" }
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterConfidence !== "ALL" && item.confidenceLevel !== filterConfidence) return false;
    if (filterState === "ASSUMPTIONS_ONLY" && !item.isAssumption) return false;
    if (filterState === "UNREVIEWED" && item.reviewState !== "REVIEW_REQUIRED") return false;
    if (filterState !== "ALL" && filterState !== "ASSUMPTIONS_ONLY" && filterState !== "UNREVIEWED" && item.reviewState !== filterState) return false;
    return true;
  });

  const unreviewedCount = items.filter((i) => i.reviewState === "REVIEW_REQUIRED").length;
  const unconfirmedAssumptionsCount = items.filter((i) => i.isAssumption && !i.assumptionConfirmed).length;

  const handleAction = async (itemId: string, action: "ACCEPT" | "REJECT" | "MARK_AS_ASSUMPTION") => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (action === "ACCEPT") {
          return { ...item, reviewState: "ACCEPTED", assumptionConfirmed: true };
        }
        if (action === "REJECT") {
          return { ...item, reviewState: "REJECTED" };
        }
        if (action === "MARK_AS_ASSUMPTION") {
          return { ...item, isAssumption: true, reviewState: "MARKED_AS_ASSUMPTION", assumptionConfirmed: false };
        }
        return item;
      })
    );

    await fetch(`/api/v1/requirements/${itemId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementId: itemId, action })
    });
  };

  const handleConfirmAssumption = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, assumptionConfirmed: true, reviewState: "ACCEPTED" } : item
      )
    );
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id ? { ...editingItem, reviewState: "EDITED" } : item
      )
    );
    setEditingItem(null);
  };

  const handleRegenerateItem = async (itemId: string) => {
    setRegeneratingId(null);
    // Optimistic mock regeneration
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          description: `${item.description} [Refined based on user prompt: "${regenPrompt}"]`,
          version: item.version + 1,
          reviewState: "REVIEW_REQUIRED"
        };
      })
    );
    setRegenPrompt("");
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Model Routing, Quality Level & Credit Cost */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                AI Model Routing & Cost Control
              </span>
              <span className="text-xs text-slate-400">• Version {currentScopeVersion}.0</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Select Extraction Quality Mode
            </h3>
            <p className="text-xs text-slate-500">
              Metered token usage with transparent credit preview before processing.
            </p>
          </div>

          {/* Quality Mode Selector */}
          <div className="flex items-center gap-2">
            {(["FAST", "BALANCED", "THOROUGH"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setQualityMode(mode)}
                className={`px-3 py-2 rounded-xl text-left border transition ${
                  qualityMode === mode
                    ? "border-blue-600 bg-blue-50/70 shadow-2xs"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{mode}</span>
                  <span className="text-[10px] font-extrabold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                    {MODE_CONFIG[mode].credits} {MODE_CONFIG[mode].credits === 1 ? "Credit" : "Credits"}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{MODE_CONFIG[mode].duration} • {MODE_CONFIG[mode].model}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Version History & Diff Trigger */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">History:</span>
            <select
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none"
              defaultValue={currentScopeVersion}
            >
              {availableVersions.map((v) => (
                <option key={v.versionNumber} value={v.versionNumber}>
                  v{v.versionNumber}.0 - {v.summary} ({v.author})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDiffModal(true)}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              Compare Versions ↔
            </button>
          </div>
        </div>
      </div>

      {/* Warning Gate Banner: Unreviewed Items & Assumptions */}
      {(unreviewedCount > 0 || unconfirmedAssumptionsCount > 0) && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                Human Review Required Before Finalizing Scope
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {unreviewedCount > 0 && `${unreviewedCount} item(s) pending review. `}
                {unconfirmedAssumptionsCount > 0 && `${unconfirmedAssumptionsCount} unconfirmed assumption(s) detected. `}
                Commercially safe scopes require human judgment before commercial estimates or client proposals can be created.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterState("UNREVIEWED")}
            className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 shrink-0"
          >
            Review Pending ({unreviewedCount})
          </button>
        </div>
      )}

      {/* Main Workspace Split: Source Document (Left) & Extraction Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Pane: Source Text Viewer with Highlight Sync */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col h-[700px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Source Brief Inspector</h3>
              <p className="text-[11px] text-slate-400">Click any requirement to highlight its citation offset</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {rawSourceText.length} chars
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 font-mono text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
            {activeCitationItem && activeCitationItem.sourceCitation ? (
              <div>
                <span>{rawSourceText.slice(0, activeCitationItem.citationStartOffset || 0)}</span>
                <mark className="bg-amber-200 text-amber-950 font-bold px-1 py-0.5 rounded border border-amber-300">
                  {activeCitationItem.sourceCitation}
                </mark>
                <span>{rawSourceText.slice(activeCitationItem.citationEndOffset || (activeCitationItem.citationStartOffset || 0) + activeCitationItem.sourceCitation.length)}</span>
              </div>
            ) : (
              <span>{rawSourceText}</span>
            )}
          </div>
        </div>

        {/* Right Pane: Filterable AI Requirement Cards */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Filter:</span>
              <select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="ALL">All Confidence</option>
                <option value="HIGH">High Confidence (≥ 0.85)</option>
                <option value="MEDIUM">Medium Confidence</option>
                <option value="LOW">Low Confidence (&lt; 0.65)</option>
              </select>

              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700"
              >
                <option value="ALL">All States</option>
                <option value="UNREVIEWED">Review Required</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="ASSUMPTIONS_ONLY">Assumptions Only</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <span className="text-xs text-slate-400">
              Showing {filteredItems.length} of {items.length} items
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveCitationItem(item)}
                className={`p-4 rounded-xl border-2 transition cursor-pointer ${
                  activeCitationItem?.id === item.id
                    ? "border-blue-600 bg-blue-50/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Card Header: Category, Confidence Pill & Provenance */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-100 text-slate-700">
                      {item.category}
                    </span>

                    {/* Confidence Pill */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      item.confidenceLevel === "HIGH" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      item.confidenceLevel === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      "bg-rose-50 text-rose-700 border-rose-200"
                    }`}>
                      {item.confidenceLevel} ({Math.round(item.confidenceScore * 100)}%)
                    </span>

                    {/* Assumption or Citation Badge */}
                    {item.isAssumption ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                        ASSUMPTION
                      </span>
                    ) : item.sourceCitation ? (
                      <span className="text-[10px] font-semibold text-blue-600 flex items-center gap-1">
                        <span>🔗</span> Source Grounded
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-600">
                        ⚠️ No Source Offset
                      </span>
                    )}
                  </div>

                  {/* Review State Pill */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.reviewState === "ACCEPTED" ? "bg-emerald-100 text-emerald-800" :
                    item.reviewState === "EDITED" ? "bg-blue-100 text-blue-800" :
                    item.reviewState === "REJECTED" ? "bg-rose-100 text-rose-800" :
                    "bg-amber-100 text-amber-800"
                  }`}>
                    {item.reviewState}
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.description}</p>

                {/* Source Citation Callout */}
                {item.sourceCitation && (
                  <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-150 text-[11px] text-slate-500 italic">
                    &quot;{item.sourceCitation}&quot;
                  </div>
                )}

                {/* AI Rationale Drawer */}
                {item.aiRationale && (
                  <div className="mt-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">Why extracted:</span> {item.aiRationale}
                  </div>
                )}

                {/* Assumption Confirmation Prompt */}
                {item.isAssumption && !item.assumptionConfirmed && (
                  <div className="mt-3 p-2.5 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <span className="text-xs text-purple-900 font-medium">
                      Confirm this assumption before freezing scope?
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmAssumption(item.id);
                      }}
                      className="px-2.5 py-1 rounded bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-700"
                    >
                      Confirm Assumption ✓
                    </button>
                  </div>
                )}

                {/* Actions Toolbar: Accept, Edit, Reject, Mark Assumption, Regenerate */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(item.id, "ACCEPT");
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Accept ✓
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      Edit ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(item.id, "MARK_AS_ASSUMPTION");
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
                    >
                      Mark Assumption 📌
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(item.id, "REJECT");
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                    >
                      Reject ✕
                    </button>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRegeneratingId(item.id);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>🔄</span>
                    <span>Regenerate Item</span>
                  </button>
                </div>

                {/* Individual Item Regeneration Prompt Box */}
                {regeneratingId === item.id && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                    <label className="text-xs font-bold text-blue-900">
                      Guidance for Regenerating this Item:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Split into two distinct sub-features, focus on security..."
                      value={regenPrompt}
                      onChange={(e) => setRegenPrompt(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setRegeneratingId(null)}
                        className="text-xs text-slate-500 px-2 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleRegenerateItem(item.id)}
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                      >
                        Regenerate (1 Credit)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Finalize Scope Button */}
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {unreviewedCount === 0 && unconfirmedAssumptionsCount === 0
                ? "✓ All items reviewed. Ready to freeze scope."
                : "⚠️ Review all items before proceeding."}
            </span>

            <button
              onClick={onFinalizeScope}
              disabled={unreviewedCount > 0 || unconfirmedAssumptionsCount > 0}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold shadow-xs transition ${
                unreviewedCount === 0 && unconfirmedAssumptionsCount === 0
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              Freeze Scope & Proceed to Estimation →
            </button>
          </div>
        </div>
      </div>

      {/* AI Feedback Widget */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900">How accurate was this AI extraction?</h4>
          <p className="text-xs text-slate-500">Your feedback continuously improves domain-specific requirement heuristics.</p>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: "HELPFUL", label: "Helpful 👍" },
            { id: "PARTIALLY_HELPFUL", label: "Partially Helpful 🤏" },
            { id: "NOT_HELPFUL", label: "Not Helpful 👎" }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setFeedbackRating(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                feedbackRating === r.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-2xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Extracted Requirement</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">Title</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={4}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                Save Changes (Mark Edited)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
