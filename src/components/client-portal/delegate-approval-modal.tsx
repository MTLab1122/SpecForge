"use client";

import React, { useState } from "react";
import {
  Share2,
  X,
  UserCheck,
  Send,
  Mail,
  ShieldAlert,
  CheckCircle2
} from "lucide-react";

interface DelegateApprovalModalProps {
  proposalId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelegation: (data: {
    delegatedByName: string;
    delegatedByEmail: string;
    recipientName: string;
    recipientEmail: string;
    recipientRole: string;
    notes?: string;
  }) => Promise<void>;
}

export const DelegateApprovalModal: React.FC<DelegateApprovalModalProps> = ({
  proposalId,
  isOpen,
  onClose,
  onConfirmDelegation
}) => {
  const [delegatedByName, setDelegatedByName] = useState("");
  const [delegatedByEmail, setDelegatedByEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientRole, setRecipientRole] = useState("Finance Approver");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmDelegation({
        delegatedByName,
        delegatedByEmail,
        recipientName,
        recipientEmail,
        recipientRole,
        notes: notes || undefined
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delegate approval.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Share2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delegate Proposal Review</h3>
              <p className="text-xs text-slate-500">Invite a co-signer, legal counsel, or financial decision maker.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Delegation Dispatched!</h4>
            <p className="text-xs text-slate-500">
              A secure review invitation has been sent to <strong>{recipientEmail}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={delegatedByName}
                  onChange={(e) => setDelegatedByName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Email</label>
                <input
                  type="email"
                  required
                  placeholder="john@client.com"
                  value={delegatedByEmail}
                  onChange={(e) => setDelegatedByEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Smith"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Recipient Email</label>
                <input
                  type="email"
                  required
                  placeholder="robert@client.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Stakeholder Role / Capacity</label>
              <select
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
              >
                <option value="Finance Approver">Finance Approver / CFO</option>
                <option value="Technical Stakeholder">Technical Stakeholder / CTO</option>
                <option value="Legal Counsel">General Counsel / Legal Signatory</option>
                <option value="Executive Sponsor">Executive Sponsor / Board Member</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Context Notes for Stakeholder (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Hi Robert, please review Milestone 2 payment terms and complete sign-off."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow transition"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch Delegation
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
