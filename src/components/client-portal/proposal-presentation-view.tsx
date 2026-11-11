"use client";

import React, { useState } from "react";
import { SanitizedProposalView, ProposalDeliverableItem } from "@/lib/client-portal/presentation-engine";
import {
  CheckCircle2,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  FileCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";

interface ProposalPresentationViewProps {
  proposal: SanitizedProposalView;
  onApproveClick: () => void;
  onRequestRevisionClick: () => void;
  onCommentDeliverable?: (sectionKey: string, deliverableTitle: string) => void;
}

export const ProposalPresentationView: React.FC<ProposalPresentationViewProps> = ({
  proposal,
  onApproveClick,
  onRequestRevisionClick,
  onCommentDeliverable
}) => {
  const [expandedDeliverable, setExpandedDeliverable] = useState<string | null>(null);

  const toggleDeliverable = (id: string) => {
    setExpandedDeliverable((prev) => (prev === id ? null : id));
  };

  const isApproved = proposal.status === "APPROVED";

  return (
    <div className="space-y-8">
      {/* 1. Cover Page Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-xl border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: proposal.branding.primaryColor }}
            >
              Commercial Scope Proposal
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
              Version {proposal.version}.0
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {proposal.title}
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            {proposal.coverPage.subtitle}
          </p>

          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-800/80 text-xs text-slate-300">
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Prepared For</span>
              <strong className="text-white text-sm">{proposal.coverPage.preparedForCompany}</strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Prepared By</span>
              <strong className="text-white text-sm">{proposal.coverPage.preparedByContact}</strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Issue Date</span>
              <strong className="text-white text-sm">{proposal.coverPage.issueDate}</strong>
            </div>
            <div>
              <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Valid Until</span>
              <strong className="text-white text-sm">{proposal.coverPage.validUntilDate}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Plain-Language Executive Scope Summary */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Executive Scope & Strategic Objectives</h2>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {proposal.executiveSummary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {proposal.businessObjectives.map((obj, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{obj}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Deliverables Breakdown */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Layers className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Deliverable Scope Breakdown</h2>
          </div>
          <span className="text-xs text-slate-500">{proposal.deliverables.length} core deliverables</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {proposal.deliverables.map((item, idx) => {
            const isExpanded = expandedDeliverable === item.id;
            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition"
              >
                <div
                  onClick={() => toggleDeliverable(item.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-0.5 rounded-full">
                        Deliverable {idx + 1}
                      </span>
                      <span className="text-xs text-slate-500">{item.category}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{item.description}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {onCommentDeliverable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCommentDeliverable(item.sectionKey, item.title);
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Comment on this item"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                    <span className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/50 space-y-4 text-xs">
                    <div className="pt-3">
                      <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Key Included Capabilities:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.keyFeatures.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 border border-indigo-200/60 dark:border-indigo-800/60">
                      <strong>Client Impact & Benefit:</strong> {item.clientBenefit}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Interactive Timeline & Milestones */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
            <Calendar className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delivery Timeline & Payment Milestones</h2>
            <p className="text-xs text-slate-500 mt-0.5">Structured phases designed for incremental demonstration and validation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proposal.milestones.map((milestone, idx) => (
            <div
              key={milestone.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Milestone {idx + 1}</span>
                  <span className="font-mono">{milestone.targetWeek}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{milestone.title}</h3>
                <div className="space-y-1.5 mt-3 text-xs text-slate-600 dark:text-slate-400">
                  {milestone.deliverablesSummary.map((deliv, dIdx) => (
                    <div key={dIdx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{deliv}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">{milestone.percentageOfTotal}% Allocation</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {proposal.investmentSummary.currency} {milestone.amount.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Commercial Investment Summary */}
      <section className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-300">Commercial Investment</span>
            <div className="text-3xl sm:text-4xl font-black text-white mt-1">
              {proposal.investmentSummary.currency} {proposal.investmentSummary.totalInvestment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-400 mt-1">Guaranteed milestone pricing. No unexpected hourly overages.</p>
          </div>

          <div className="text-xs text-indigo-200 bg-white/10 p-3 rounded-xl max-w-xs border border-white/10">
            <Info className="w-4 h-4 inline mr-1 text-cyan-400" />
            Milestone payments are invoiced only upon client demonstration, review, and sign-off.
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">Payment Schedule Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {proposal.investmentSummary.paymentSchedule.map((sch, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-800 space-y-1">
                <div className="font-semibold text-white">{sch.milestoneTitle} ({sch.percentage}%)</div>
                <div className="text-indigo-300 font-mono font-bold">
                  {proposal.investmentSummary.currency} {sch.amount.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400">{sch.paymentTrigger}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Terms, Assumptions & Client Responsibilities */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 text-xs text-slate-600 dark:text-slate-300">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-500" /> Terms, Assumptions & Warranty
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Standard Project Assumptions:</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400">
              {proposal.assumptionsAndTerms.standardAssumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200">Client Responsibilities:</h4>
            <ul className="space-y-1.5 list-disc list-inside text-slate-600 dark:text-slate-400">
              {proposal.assumptionsAndTerms.clientResponsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
          <strong>Warranty Guarantee:</strong> Deliverables include a <strong>{proposal.assumptionsAndTerms.warrantyAndSupportDays}-day warranty period</strong> post-deployment covering remediation of any bugs or regressions adhering to the agreed specification.
        </div>
      </section>

      {/* 7. Bottom Call to Action Card */}
      {!isApproved && (
        <section className="bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl p-8 border border-indigo-200 dark:border-indigo-800 text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ready to proceed with this scope?</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            You can approve the complete proposal in one click or review and sign off individual sections. If changes are needed, click Request Changes.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onRequestRevisionClick}
              className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Request Changes
            </button>
            <button
              onClick={onApproveClick}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition"
            >
              Approve Full Proposal <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
