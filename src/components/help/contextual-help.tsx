"use client";

import React, { useState } from "react";

interface HelpTopic {
  id: string;
  title: string;
  category: "DISCOVERY" | "SCOPE" | "ESTIMATION" | "PROPOSALS" | "CLIENT_PORTAL";
  summary: string;
  content: string;
}

const HELP_DATABASE: HelpTopic[] = [
  {
    id: "provenance-explained",
    title: "Understanding AI Suggestions vs User Confirmed",
    category: "DISCOVERY",
    summary: "Every extracted requirement begins as an AI suggestion until verified.",
    content: "SpecForge tags all automatically extracted goals, personas, and features with an amber AI_SUGGESTION badge. Clicking 'Confirm' updates the item to USER_CONFIRMED, which records your human review in the project audit log and links the item to the frozen scope."
  },
  {
    id: "p80-contingency",
    title: "How P80 Risk Contingency Modeling Works",
    category: "ESTIMATION",
    summary: "Protect your agency from scope under-estimation using Monte Carlo buffers.",
    content: "P80 estimation calculates the 80th-percentile effort curve based on your feature complexity scores (Low, Medium, High). Adding a 15% to 25% risk contingency protects your profitability against third-party API delays, client revisions, and unexpected architecture hurdles."
  },
  {
    id: "assumptions-vs-exclusions",
    title: "Assumptions vs Exclusions (Out of Scope)",
    category: "SCOPE",
    summary: "The two most critical sections for defending against scope creep.",
    content: "• Assumptions state what you expect to be true (e.g. 'Client will provide all production API keys 5 days prior to sprint start').\n• Exclusions explicitly state what is NOT included (e.g. 'Native tablet support and custom legacy database migration are out of scope')."
  },
  {
    id: "client-portal-security",
    title: "How the Client Approval Portal Operates",
    category: "CLIENT_PORTAL",
    summary: "Secure, read-only client sign-off with cryptographic audit seals.",
    content: "When you generate a proposal, SpecForge creates an unguessable share token. Clients can leave paragraph-level comments and click 'Approve Scope'. This generates a SHA-256 cryptographic digest of the exact scope version, client IP address, and timestamp. Clients cannot modify your scope directly."
  }
];

export function ContextualHelpDrawer() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredTopics = HELP_DATABASE.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Floating Trigger Button in Bottom Right */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg hover:bg-slate-800 transition"
      >
        <span className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">
          ?
        </span>
        <span>Need Help?</span>
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs">
          <div className="w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Contextual Assistant</h3>
                <p className="text-xs text-slate-500">Quick guides & workflow help</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setSelectedTopic(null);
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Close ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedTopic ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedTopic(null)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    ← Back to Topics
                  </button>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {selectedTopic.category}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-2">{selectedTopic.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{selectedTopic.summary}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {selectedTopic.content}
                  </div>
                </div>
              ) : (
                filteredTopics.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {topic.category}
                      </span>
                      <span className="text-xs text-blue-600 font-semibold">Read →</span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 mt-1">{topic.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{topic.summary}</div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[11px] text-slate-400">
                SpecForge In-App Help • No tab switching required
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
