"use client";

import React, { useState } from "react";
import { SanitizedProposalView } from "@/lib/client-portal/presentation-engine";
import { SectionApprovalStatus } from "@/lib/validations/client-portal";
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  Sparkles
} from "lucide-react";

interface SectionReviewState {
  sectionKey: string;
  title: string;
  status: "APPROVED" | "CHANGES_REQUESTED";
  notes?: string;
}

interface SectionalApprovalMatrixProps {
  proposal: SanitizedProposalView;
  onSubmitSectionalReview: (data: {
    clientName: string;
    clientEmail: string;
    signerTitle?: string;
    sections: Array<{ sectionKey: string; status: "APPROVED" | "CHANGES_REQUESTED"; notes?: string }>;
  }) => Promise<void>;
  onApproveAllInFull: () => void;
}

export const SectionalApprovalMatrix: React.FC<SectionalApprovalMatrixProps> = ({
  proposal,
  onSubmitSectionalReview,
  onApproveAllInFull
}) => {
  // Aggregate all reviewable sections: deliverables + milestones + investment + terms
  const allSections = React.useMemo(() => {
    const list: Array<{ key: string; title: string; category: string; description: string }> = [];

    proposal.deliverables.forEach((d) => {
      list.push({
        key: d.sectionKey,
        title: d.title,
        category: "Deliverable",
        description: d.description
      });
    });

    proposal.milestones.forEach((m) => {
      list.push({
        key: m.sectionKey,
        title: `${m.title} (${m.targetWeek})`,
        category: "Milestone & Payment",
        description: `Deliverables: ${m.deliverablesSummary.join(", ")} · ${proposal.investmentSummary.currency} ${m.amount.toLocaleString()}`
      });
    });

    list.push({
      key: "terms_and_warranty",
      title: "Commercial Terms & 30-Day Warranty",
      category: "Legal & Governance",
      description: "Standard project assumptions, client responsibilities, and post-launch bug remediation warranty."
    });

    return list;
  }, [proposal]);

  const [reviews, setReviews] = useState<Record<string, { status: "APPROVED" | "CHANGES_REQUESTED"; notes?: string }>>(() => {
    const initial: Record<string, { status: "APPROVED" | "CHANGES_REQUESTED"; notes?: string }> = {};
    allSections.forEach((s) => {
      initial[s.key] = { status: "APPROVED" };
    });
    return initial;
  });

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const approvedCount = Object.values(reviews).filter((r) => r.status === "APPROVED").length;
  const changesRequestedCount = Object.values(reviews).filter((r) => r.status === "CHANGES_REQUESTED").length;
  const totalCount = allSections.length;
  const percentApproved = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const handleStatusChange = (sectionKey: string, status: "APPROVED" | "CHANGES_REQUESTED") => {
    setReviews((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        status
      }
    }));
  };

  const handleNotesChange = (sectionKey: string, notes: string) => {
    setReviews((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        notes
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) return;

    try {
      setIsSubmitting(true);
      const formattedSections = Object.entries(reviews).map(([sectionKey, val]) => ({
        sectionKey,
        status: val.status,
        notes: val.notes
      }));

      await onSubmitSectionalReview({
        clientName,
        clientEmail,
        signerTitle: signerTitle || undefined,
        sections: formattedSections
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Progress Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" /> Section-by-Section Scope Approval
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Review and approve components individually, or flag specific sections that require adjustment.
            </p>
          </div>

          <button
            type="button"
            onClick={onApproveAllInFull}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow"
          >
            <Sparkles className="w-4 h-4" /> Approve All in Full
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">
              Section Readiness: <strong>{approvedCount} of {totalCount} Approved</strong>
            </span>
            <span className="font-mono text-indigo-600 dark:text-indigo-400">{percentApproved}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${percentApproved}%` }} />
            {changesRequestedCount > 0 && (
              <div
                className="bg-amber-500 h-full transition-all"
                style={{ width: `${(changesRequestedCount / totalCount) * 100}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Sections Review Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {allSections.map((section) => {
            const current = reviews[section.key] || { status: "APPROVED" };
            const isApproved = current.status === "APPROVED";

            return (
              <div
                key={section.key}
                className={`p-5 rounded-2xl border transition-all ${
                  isApproved
                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {section.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{section.description}</p>
                  </div>

                  {/* Radio Choice Buttons */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(section.key, "APPROVED")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        isApproved
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(section.key, "CHANGES_REQUESTED")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        !isApproved
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" /> Needs Changes
                    </button>
                  </div>
                </div>

                {/* Sub-form when Changes Requested */}
                {!isApproved && (
                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-800/60">
                    <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Specific adjustments requested for this section:
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Please clarify if user permissions include multi-factor auth for this milestone."
                      value={current.notes || ""}
                      onChange={(e) => handleNotesChange(section.key, e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Signatory Details & Submit Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Signatory Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Corporate Email</label>
              <input
                type="email"
                required
                placeholder="jane@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role / Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. VP of Product"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Submitting records your structured review decisions into the project audit trail.
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Submit Sectional Review
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
