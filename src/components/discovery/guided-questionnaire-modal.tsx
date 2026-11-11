"use client";

import React, { useState } from "react";
import { DISCOVERY_TEMPLATES, DiscoveryTemplate } from "@/lib/discovery/templates";
import { SubmitDiscoveryQuestionnaireInput } from "@/lib/validations/structured-discovery";

interface GuidedQuestionnaireModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitDiscoveryQuestionnaireInput) => void;
}

export function GuidedQuestionnaireModal({
  projectId,
  isOpen,
  onClose,
  onSubmit
}: GuidedQuestionnaireModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("tpl_web_app");
  const [formData, setFormData] = useState<SubmitDiscoveryQuestionnaireInput>({
    projectId,
    businessGoal: "",
    targetUsers: "",
    coreProblem: "",
    mustHaveFeatures: ["User Authentication", "Dashboard", "Core Service Workflow"],
    niceToHaveFeatures: ["Dark Mode", "Export Data"],
    technicalConstraints: "Next.js, TypeScript, PostgreSQL",
    designConstraints: "Modern, minimalist UI",
    integrationRequirements: "Email (Resend), Sentry",
    complianceRequirements: "Standard Privacy & Terms",
    budgetRange: "$5,000 - $12,000",
    successMetrics: "1,000 active users, < 1s latency"
  });

  const [activeStep, setActiveStep] = useState<number>(1);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<string[]>([]);

  if (!isOpen) return null;

  // Apply template defaults
  const handleApplyTemplate = (tplId: string) => {
    setSelectedTemplate(tplId);
    const tpl = DISCOVERY_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    setFormData((prev) => ({
      ...prev,
      businessGoal: tpl.questionnaireDefaults.businessGoal,
      targetUsers: tpl.questionnaireDefaults.targetUsers,
      coreProblem: tpl.questionnaireDefaults.coreProblem,
      mustHaveFeatures: tpl.questionnaireDefaults.mustHaveFeatures,
      niceToHaveFeatures: tpl.questionnaireDefaults.niceToHaveFeatures,
      technicalConstraints: tpl.questionnaireDefaults.technicalConstraints,
      designConstraints: tpl.questionnaireDefaults.designConstraints,
      integrationRequirements: tpl.questionnaireDefaults.integrationRequirements,
      complianceRequirements: tpl.questionnaireDefaults.complianceRequirements,
      budgetRange: tpl.questionnaireDefaults.budgetRange,
      successMetrics: tpl.questionnaireDefaults.successMetrics
    }));

    // Generate intelligent follow-up suggestions based on category
    if (tpl.category === "E-commerce") {
      setSuggestedFollowUps([
        "Which payment gateways must be supported at launch (e.g. Stripe, JazzCash, PayPal)?",
        "Do you require real-time warehouse inventory synchronization?"
      ]);
    } else if (tpl.category === "Mobile Application") {
      setSuggestedFollowUps([
        "Do you need offline data sync and local SQLite storage?",
        "Are push notifications required for marketing or transactional alerts?"
      ]);
    } else if (tpl.category === "SaaS") {
      setSuggestedFollowUps([
        "How will subscription tiers and team seats be priced?",
        "Is SAML/SSO or enterprise domain allowlisting required in MVP?"
      ]);
    } else {
      setSuggestedFollowUps([
        "What existing systems or databases must be migrated or integrated?",
        "Are there specific regulatory or data residency requirements?"
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Structured Discovery Architecture
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">
              Guided Discovery Questionnaire & Templates
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 px-2 py-1"
          >
            Esc to Close ✕
          </button>
        </div>

        {/* Template Quick-Select Carousel */}
        <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-150 overflow-x-auto flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 shrink-0 mr-1">Load Template:</span>
          {DISCOVERY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleApplyTemplate(tpl.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 border transition flex items-center gap-1.5 ${
                selectedTemplate === tpl.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{tpl.icon}</span>
              <span>{tpl.category}</span>
            </button>
          ))}
        </div>

        {/* Questionnaire Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Core Problem & Business Goal */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Business Foundation & Goals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Business Goal</label>
                <textarea
                  rows={3}
                  value={formData.businessGoal}
                  onChange={(e) => setFormData({ ...formData, businessGoal: e.target.value })}
                  placeholder="What is the primary business outcome the client expects to achieve?"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Target Users & Personas</label>
                <textarea
                  rows={3}
                  value={formData.targetUsers}
                  onChange={(e) => setFormData({ ...formData, targetUsers: e.target.value })}
                  placeholder="Who are the primary end users? What are their key job roles?"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Core Problem Solved</label>
              <textarea
                rows={2}
                value={formData.coreProblem}
                onChange={(e) => setFormData({ ...formData, coreProblem: e.target.value })}
                placeholder="What acute pain point or workflow bottleneck does this system replace?"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Step 2: Must-Have vs Nice-to-Have Features */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Scope Boundaries (Must-Have vs Nice-to-Have)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Must-Have Features (Comma separated)
                </label>
                <textarea
                  rows={3}
                  value={formData.mustHaveFeatures.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      mustHaveFeatures: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nice-to-Have / Out of Scope for MVP
                </label>
                <textarea
                  rows={3}
                  value={formData.niceToHaveFeatures.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      niceToHaveFeatures: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    })
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Technical & Operational Constraints */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3. Constraints, Integrations & Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Technical Constraints</label>
                <input
                  type="text"
                  value={formData.technicalConstraints}
                  onChange={(e) => setFormData({ ...formData, technicalConstraints: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Third-Party Integrations</label>
                <input
                  type="text"
                  value={formData.integrationRequirements}
                  onChange={(e) => setFormData({ ...formData, integrationRequirements: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Compliance & Security</label>
                <input
                  type="text"
                  value={formData.complianceRequirements}
                  onChange={(e) => setFormData({ ...formData, complianceRequirements: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Budget Range</label>
                <input
                  type="text"
                  value={formData.budgetRange}
                  onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Success Metrics & KPIs</label>
                <input
                  type="text"
                  value={formData.successMetrics}
                  onChange={(e) => setFormData({ ...formData, successMetrics: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Intelligent Follow-Up Suggestions Drawer */}
          {suggestedFollowUps.length > 0 && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <span>🤖</span>
                <span>Intelligent Follow-Up Questions Detected</span>
              </span>
              <div className="space-y-1.5">
                {suggestedFollowUps.map((q, i) => (
                  <div key={i} className="text-xs text-purple-900 flex items-start gap-2">
                    <span className="font-bold text-purple-600">•</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Save & Populate */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              Populate Discovery Package & Generate Scope →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

