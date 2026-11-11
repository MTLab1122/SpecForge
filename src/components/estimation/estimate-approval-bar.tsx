"use client";

import React, { useState } from "react";
import {
  EstimateApprovalStatus
} from "@/lib/validations/commercial-estimation";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import {
  CheckCircle,
  Clock,
  UserCheck,
  Send,
  History,
  RotateCcw,
  ShieldAlert,
  FileCheck2,
  Lock,
  XCircle
} from "lucide-react";

interface EstimateApprovalBarProps {
  estimateId: string;
  currentStatus: EstimateApprovalStatus;
  grandTotalCost: number;
  managerThreshold?: number;
  currentUserRole?: string; // "OWNER" | "ADMIN" | "MANAGER" | "EDITOR" | "CLIENT"
  approvedByName?: string;
  approvedAt?: string;
  revisionHistory?: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    timestamp: string;
    notes?: string;
  }>;
  onActionSubmit: (action: "SUBMIT_FOR_REVIEW" | "MANAGER_APPROVE" | "CLIENT_APPROVE" | "REJECT" | "REVISE", notes?: string) => Promise<void>;
}

export const EstimateApprovalBar: React.FC<EstimateApprovalBarProps> = ({
  estimateId,
  currentStatus,
  grandTotalCost,
  managerThreshold = 10000,
  currentUserRole = "EDITOR",
  approvedByName,
  approvedAt,
  revisionHistory = [],
  onActionSubmit
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [modalAction, setModalAction] = useState<"REJECT" | "REVISE">("REVISE");
  const [actionNotes, setActionNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiresManagerApproval = grandTotalCost >= managerThreshold;
  const isManagerOrAdmin = ["OWNER", "ADMIN", "MANAGER"].includes(currentUserRole);

  const steps: Array<{
    status: EstimateApprovalStatus;
    label: string;
    icon: any;
    desc: string;
  }> = [
    { status: "DRAFT", label: "Draft Assembly", icon: Clock, desc: "Author compiling work breakdown & rate cards" },
    { status: "INTERNAL_REVIEW", label: "Internal Review", icon: UserCheck, desc: "Peer & technical validation" },
    { status: "MANAGER_APPROVED", label: "Manager Sign-off", icon: FileCheck2, desc: requiresManagerApproval ? "Mandatory (> $10k)" : "Optional standard sign-off" },
    { status: "CLIENT_APPROVED", label: "Client Approved", icon: CheckCircle, desc: "Binding commercial scope acceptance" }
  ];

  const getStepState = (stepStatus: EstimateApprovalStatus) => {
    const order: EstimateApprovalStatus[] = ["DRAFT", "INTERNAL_REVIEW", "MANAGER_APPROVED", "CLIENT_APPROVED"];
    const currentIndex = order.indexOf(currentStatus);
    const stepIndex = order.indexOf(stepStatus);

    if (currentStatus === "REJECTED") return stepStatus === "DRAFT" ? "error" : "pending";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "pending";
  };

  const handleAction = async (action: "SUBMIT_FOR_REVIEW" | "MANAGER_APPROVE" | "CLIENT_APPROVE" | "REJECT" | "REVISE", notes?: string) => {
    setErrorMessage(null);
    const permission = CommercialEstimationEngine.canApproveEstimate({
      currentStatus,
      requestedAction: action,
      userRole: currentUserRole,
      grandTotalCost,
      managerApprovalThreshold: managerThreshold
    });

    if (!permission.allowed) {
      setErrorMessage(permission.reason || "Action not permitted by workflow governance.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onActionSubmit(action, notes);
      setShowRevisionModal(false);
      setActionNotes("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process estimate approval transition.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-500" /> Commercial Governance & Approval Workflow
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                currentStatus === "CLIENT_APPROVED"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                  : currentStatus === "MANAGER_APPROVED"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  : currentStatus === "INTERNAL_REVIEW"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  : currentStatus === "REJECTED"
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {currentStatus.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Role: <strong>{currentUserRole}</strong> · Project Grand Total: <strong>${grandTotalCost.toLocaleString()}</strong>
            {requiresManagerApproval && " (Threshold exceeded: Manager Sign-off mandatory before client sign-off)"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <History className="w-3.5 h-3.5" /> Revision Log ({revisionHistory.length})
          </button>
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl">
          <XCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4-Step Stepper Line */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const state = getStepState(step.status);
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className={`p-3.5 rounded-xl border transition-all ${
                state === "completed"
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                  : state === "current"
                  ? "bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500/20"
                  : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    state === "completed"
                      ? "bg-emerald-600 text-white"
                      : state === "current"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {state === "completed" ? "✓" : idx + 1}
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  {step.label}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {/* Submit for Review */}
          {["DRAFT", "REJECTED", "REVISED"].includes(currentStatus) && (
            <button
              disabled={isSubmitting}
              onClick={() => handleAction("SUBMIT_FOR_REVIEW")}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Submit for Internal Review
            </button>
          )}

          {/* Manager Approve */}
          {currentStatus === "INTERNAL_REVIEW" && (
            <button
              disabled={isSubmitting || !isManagerOrAdmin}
              onClick={() => handleAction("MANAGER_APPROVE")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition ${
                isManagerOrAdmin
                  ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                  : "bg-slate-400 cursor-not-allowed opacity-60"
              }`}
              title={!isManagerOrAdmin ? "Requires Owner, Admin, or Manager role" : undefined}
            >
              <FileCheck2 className="w-3.5 h-3.5" /> Approve as Manager
            </button>
          )}

          {/* Client Approve */}
          {(currentStatus === "MANAGER_APPROVED" || (currentStatus === "INTERNAL_REVIEW" && !requiresManagerApproval)) && (
            <button
              disabled={isSubmitting}
              onClick={() => handleAction("CLIENT_APPROVE")}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Client Acceptance Sign-off
            </button>
          )}

          {/* Blocked by threshold reminder */}
          {currentStatus === "INTERNAL_REVIEW" && requiresManagerApproval && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <Lock className="w-3.5 h-3.5" /> Client sign-off locked until Manager approves
            </div>
          )}
        </div>

        {/* Revision & Rejection Controls */}
        <div className="flex items-center gap-2">
          {currentStatus === "INTERNAL_REVIEW" && (
            <button
              onClick={() => {
                setModalAction("REJECT");
                setShowRevisionModal(true);
              }}
              className="px-3 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded-lg border border-rose-200 dark:border-rose-800 transition"
            >
              Request Changes
            </button>
          )}

          {currentStatus === "CLIENT_APPROVED" && (
            <button
              onClick={() => {
                setModalAction("REVISE");
                setShowRevisionModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Create Revision v2
            </button>
          )}
        </div>
      </div>

      {/* Revision Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {modalAction === "REJECT" ? "Request Estimate Changes / Revision" : "Create New Estimate Revision"}
            </h4>
            <p className="text-xs text-slate-500">
              Provide context and line-item changes requested before the estimate can be re-submitted.
            </p>
            <textarea
              rows={3}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g. Scope was reduced by removing legacy CRM export; QA hours adjusted down."
              className="w-full text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRevisionModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(modalAction, actionNotes)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Confirm {modalAction === "REJECT" ? "Rejection" : "Revision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" /> Estimate Approval Audit Trail
              </h4>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            {revisionHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No previous revisions logged for this estimate.</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
                {revisionHistory.map((h, i) => (
                  <div key={h.id || i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-200">
                      <span>{h.action}</span>
                      <span className="text-slate-500 text-[11px]">{h.timestamp}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      By {h.actorName} ({h.actorRole})
                    </div>
                    {h.notes && <p className="text-slate-600 dark:text-slate-400 mt-1 italic">{h.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

