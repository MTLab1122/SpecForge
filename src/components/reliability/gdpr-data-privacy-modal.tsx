"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Lock,
  X
} from "lucide-react";

interface GdprDataPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportData: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  isExporting?: boolean;
}

export const GdprDataPrivacyModal: React.FC<GdprDataPrivacyModalProps> = ({
  isOpen,
  onClose,
  onExportData,
  onDeleteAccount,
  isExporting = false
}) => {
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!isOpen) return null;

  const REQUIRED_CONFIRM_PHRASE = "DELETE MY ACCOUNT PERMANENTLY";
  const isPhraseMatched = deleteConfirmationText.trim() === REQUIRED_CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!isPhraseMatched) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDeleteAccount();
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || "Account deletion failed");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Data Privacy & Compliance Portal
              </h3>
              <p className="text-xs text-slate-500">
                Exercise your GDPR & CCPA Data Subject Rights.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action 1: Data Portability (Export) */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Data Portability (GDPR Article 20)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            Download a complete, machine-readable JSON archive of all your projects, discovery briefs, scopes, estimates, and audit history.
          </p>
          <button
            onClick={onExportData}
            disabled={isExporting}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isExporting ? "Generating Archive..." : "Download Full JSON Archive"}</span>
          </button>
        </div>

        {/* Action 2: Right to Be Forgotten (Erasure) */}
        <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-3">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">
              Right to Erasure / Delete Account (GDPR Article 17)
            </h4>
          </div>
          <p className="text-xs text-red-600/90 dark:text-red-400/90">
            Permanently purges your credentials, profile, sessions, and personal identifiable information. This action is irreversible.
          </p>

          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
              To proceed, type <span className="font-mono text-red-600">{REQUIRED_CONFIRM_PHRASE}</span> below:
            </label>
            <input
              type="text"
              placeholder={REQUIRED_CONFIRM_PHRASE}
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>

          {deleteError && (
            <span className="text-xs text-red-600 font-semibold block">{deleteError}</span>
          )}

          <button
            onClick={handleDelete}
            disabled={!isPhraseMatched || isDeleting}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Erasing Records..." : "Permanently Erase My Account"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
