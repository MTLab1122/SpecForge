"use client";

import React, { useState } from "react";

export interface ConflictItem {
  id: string;
  conflictType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  suggestedAction: string;
  resolutionStatus: string;
}

export interface ClarificationItem {
  id: string;
  question: string;
  suggestedContext: string;
  clientResponse: string | null;
  status: "DRAFT" | "SENT_TO_CLIENT" | "ANSWERED" | "INTEGRATED";
  sentAt?: string | null;
  answeredAt?: string | null;
}

interface ConflictClarificationPanelProps {
  conflicts: ConflictItem[];
  clarifications: ClarificationItem[];
  onResolveConflict: (conflictId: string, notes: string) => void;
  onAttachClientResponse: (clarificationId: string, response: string) => void;
}

export function ConflictClarificationPanel({
  conflicts,
  clarifications,
  onResolveConflict,
  onAttachClientResponse
}: ConflictClarificationPanelProps) {
  const [activeTab, setActiveTab] = useState<"CONFLICTS" | "CLARIFICATIONS">("CONFLICTS");
  const [respondingClarId, setRespondingClarId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string>("");

  const openConflicts = conflicts.filter((c) => c.resolutionStatus === "OPEN");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Commercial Safety & Audit Guard</h3>
          <p className="text-xs text-slate-500">Detect scope anomalies and resolve missing client details</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("CONFLICTS")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "CONFLICTS" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Conflicts</span>
            {openConflicts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold">
                {openConflicts.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("CLARIFICATIONS")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "CLARIFICATIONS" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Clarifications</span>
            <span className="text-[10px] text-slate-400 font-semibold">({clarifications.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Conflicts List */}
      {activeTab === "CONFLICTS" && (
        <div className="space-y-3">
          {conflicts.length === 0 ? (
            <div className="py-6 text-center text-xs text-emerald-700 font-medium">
              ✓ No contradictions, duplicate features, or missing acceptance criteria detected.
            </div>
          ) : (
            conflicts.map((conf) => (
              <div
                key={conf.id}
                className={`p-4 rounded-xl border-2 transition ${
                  conf.resolutionStatus === "RESOLVED"
                    ? "bg-slate-50/50 border-slate-200 text-slate-400"
                    : conf.severity === "CRITICAL"
                    ? "border-rose-300 bg-rose-50/40"
                    : conf.severity === "HIGH"
                    ? "border-amber-300 bg-amber-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      conf.severity === "CRITICAL" ? "bg-rose-100 text-rose-800" :
                      conf.severity === "HIGH" ? "bg-amber-100 text-amber-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {conf.severity}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{conf.conflictType}</span>
                  </div>
                  {conf.resolutionStatus === "RESOLVED" && (
                    <span className="text-xs font-bold text-emerald-700">Resolved ✓</span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 mt-2">{conf.title}</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{conf.description}</p>

                {conf.resolutionStatus === "OPEN" && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 italic">
                      Action: {conf.suggestedAction}
                    </span>
                    <button
                      onClick={() => onResolveConflict(conf.id, "Manually verified by Technical Lead")}
                      className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs"
                    >
                      Mark Resolved ✓
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Clarification Requests */}
      {activeTab === "CLARIFICATIONS" && (
        <div className="space-y-3">
          {clarifications.map((clar) => (
            <div
              key={clar.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 text-blue-800">
                  {clar.status}
                </span>
                {clar.clientResponse && (
                  <span className="text-xs font-semibold text-emerald-700">Response Attached ✓</span>
                )}
              </div>

              <div>
                <h5 className="text-xs font-bold text-slate-900">Question for Client:</h5>
                <p className="text-xs text-slate-700 font-medium mt-0.5">{clar.question}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 italic">{clar.suggestedContext}</p>
              </div>

              {clar.clientResponse ? (
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Client Answer:</div>
                  <div className="leading-relaxed">"{clar.clientResponse}"</div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi, quick clarification regarding your project brief:\n\n${clar.question}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Send via WhatsApp 💬
                    </a>
                  </div>

                  <button
                    onClick={() => setRespondingClarId(clar.id)}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Attach Client Answer ✍️
                  </button>
                </div>
              )}

              {/* Attach Response Drawer */}
              {respondingClarId === clar.id && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-blue-200 space-y-2">
                  <label className="text-xs font-bold text-blue-900">Paste Client Response:</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Client confirmed Stripe and JazzCash are required..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none focus:border-blue-600"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setRespondingClarId(null)}
                      className="text-xs text-slate-500 px-2 py-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onAttachClientResponse(clar.id, responseText);
                        setRespondingClarId(null);
                        setResponseText("");
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                    >
                      Save & Trigger Targeted Re-Extraction
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
