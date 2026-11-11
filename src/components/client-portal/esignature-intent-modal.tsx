"use client";

import React, { useState } from "react";
import { SanitizedProposalView } from "@/lib/client-portal/presentation-engine";
import {
  ShieldCheck,
  Lock,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink
} from "lucide-react";

interface ESignatureIntentModalProps {
  proposal: SanitizedProposalView;
  isOpen: boolean;
  onClose: () => void;
  onConfirmApproval: (data: {
    clientName: string;
    clientEmail: string;
    signerTitle?: string;
    signerCompany?: string;
    comments?: string;
  }) => Promise<void>;
}

export const ESignatureIntentModal: React.FC<ESignatureIntentModalProps> = ({
  proposal,
  isOpen,
  onClose,
  onConfirmApproval
}) => {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [signerCompany, setSignerCompany] = useState(proposal.coverPage.preparedForCompany || "");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) {
      setErrorMsg("You must confirm authorization before applying the digital seal.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmApproval({
        clientName,
        clientEmail,
        signerTitle: signerTitle || undefined,
        signerCompany: signerCompany || undefined,
        comments: comments || undefined
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record digital approval seal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Commercial Scope Sign-Off</h3>
              <p className="text-xs text-slate-500">
                {proposal.title} · Version {proposal.version}.0
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Commitment Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Agreed Deliverables:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{proposal.deliverables.length} Deliverable Phases</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Milestone Schedule:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{proposal.milestones.length} Milestones</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-750 font-bold text-sm">
            <span className="text-slate-900 dark:text-white">Total Commercial Investment:</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono">
              {proposal.investmentSummary.currency} {proposal.investmentSummary.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Signatory Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Corporate Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="jane@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Position / Title (Optional)
              </label>
              <input
                type="text"
                placeholder="Chief Technology Officer"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Company / Organization
              </label>
              <input
                type="text"
                placeholder="Acme Corporation"
                value={signerCompany}
                onChange={(e) => setSignerCompany(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sign-Off Notes / Special Directives (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Approved with kickoff targeted for next Monday."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Consent Checkbox */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-slate-800 dark:text-slate-200 leading-relaxed">
                <strong>Authorization Confirmation:</strong> I confirm that I am authorized to approve this project specification, schedule, and commercial investment on behalf of <strong>{signerCompany || "the client organization"}</strong>.
              </span>
            </label>
          </div>

          {/* Statutory Legal Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 text-slate-500 text-[11px] leading-relaxed flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>
              <strong>Digital Intent Seal:</strong> SpecForge records cryptographic proof of approval intent, timestamp, client IP, and document version integrity. This does not constitute statutory legal e-signature advice under ESIGN/eIDAS. Certified signature integrations (e.g. DocuSign) can be connected if required by corporate compliance.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !consentConfirmed}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Apply Digital Seal & Approve
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
