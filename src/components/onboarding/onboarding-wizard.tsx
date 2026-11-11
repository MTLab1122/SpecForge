"use client";

import React, { useState } from "react";
import { 
  UserTypeEnum, 
  PrimaryServiceTypeEnum, 
  TypicalProjectTypeEnum, 
  PreferredLanguageEnum, 
  TeamSizeEnum, 
  PrimaryGoalEnum,
  SubmitOnboardingProfileInput 
} from "@/lib/validations/onboarding";
import { analytics } from "@/lib/analytics/tracker";

interface OnboardingWizardProps {
  userId: string;
  organizationId: string;
  onComplete: (data: SubmitOnboardingProfileInput) => void;
  onSkip?: () => void;
}

export function OnboardingWizard({ userId, organizationId, onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<SubmitOnboardingProfileInput>({
    userType: "FREELANCER",
    primaryService: "WEB_DEVELOPMENT",
    typicalProjectType: "MVP_BUILD",
    preferredLanguage: "en",
    teamSize: "1",
    primaryGoal: "FASTER_PROPOSALS",
    createSampleSandbox: true,
    workspaceName: ""
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const result = await res.json();
      if (result.success) {
        analytics.track("onboarding_completed", {
          userId,
          organizationId,
          metadata: {
            userType: formData.userType,
            primaryGoal: formData.primaryGoal,
            sampleCreated: formData.createSampleSandbox
          }
        });
        onComplete(formData);
      }
    } catch (err) {
      console.error("Onboarding submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden transition-all">
        {/* Progress Bar & Header */}
        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Personalize Your Workspace • Step {step} of 6
            </span>
            {onSkip && (
              <button 
                onClick={onSkip} 
                className="text-xs font-medium text-slate-500 hover:text-slate-700 transition"
              >
                Skip for now
              </button>
            )}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="px-8 py-7 min-h-[360px] flex flex-col justify-center">
          {/* Question 1: User Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What best describes your current role?</h2>
                <p className="text-sm text-slate-500 mt-1">We&apos;ll tailor your discovery templates and workflows accordingly.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: "FREELANCER", title: "Freelance Developer", desc: "Independent contractor delivering custom software" },
                  { id: "AGENCY", title: "Software Agency", desc: "Boutique agency or development shop with a team" },
                  { id: "PRODUCT_MANAGER", title: "Product Manager", desc: "Fractional or internal PM managing scopes & backlogs" },
                  { id: "CONSULTANT", title: "Technical Consultant", desc: "Advising clients on architecture, feasibility & RFPs" }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: item.id as any })}
                    className={`p-4 text-left rounded-xl border-2 transition ${
                      formData.userType === item.id 
                        ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">{item.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2: Primary Service */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What is your primary service offering?</h2>
                <p className="text-sm text-slate-500 mt-1">This configures your default feature categorization and rate cards.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: "WEB_DEVELOPMENT", label: "Web Applications (Next.js, React)" },
                  { id: "MOBILE_APPS", label: "Mobile Apps (iOS, Android, Flutter)" },
                  { id: "SAAS_DEVELOPMENT", label: "Full-Stack SaaS Products" },
                  { id: "ECOMMERCE_DEVELOPMENT", label: "E-Commerce Platforms & Shopify" },
                  { id: "UI_UX_PRODUCT_DESIGN", label: "UI/UX Product Design & Discovery" },
                  { id: "TECHNICAL_CONSULTING", label: "Technical Architecture & Audits" }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, primaryService: s.id as any })}
                    className={`p-3.5 text-left rounded-xl border-2 text-sm font-medium transition ${
                      formData.primaryService === s.id 
                        ? "border-blue-600 bg-blue-50/50 text-blue-900" 
                        : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 3: Typical Project Type */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What is your typical project scope?</h2>
                <p className="text-sm text-slate-500 mt-1">We&apos;ll load starter templates that match your common project sizes.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: "MVP_BUILD", title: "New MVP / Greenfield Build", desc: "0-to-1 launch in 4-10 weeks" },
                  { id: "WEBSITE_REDESIGN", title: "Platform Redesign / Modernization", desc: "Overhaul of legacy web presence" },
                  { id: "CUSTOM_SAAS", title: "Multi-Tenant SaaS System", desc: "Complex apps with auth, billing & RBAC" },
                  { id: "MAINTENANCE_RETAINER", title: "Support & Feature Retainer", desc: "Monthly blocks of engineering capacity" }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, typicalProjectType: p.id as any })}
                    className={`p-4 text-left rounded-xl border-2 transition ${
                      formData.typicalProjectType === p.id 
                        ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 4: Preferred Language & Team Size */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Language & Team Capacity</h2>
                <p className="text-sm text-slate-500 mt-1">Select your workspace interface language and current team size.</p>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Preferred Interface Language</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredLanguage: "en" })}
                    className={`p-3 text-center rounded-xl border-2 font-medium text-sm transition ${
                      formData.preferredLanguage === "en" ? "border-blue-600 bg-blue-50/50 text-blue-900" : "border-slate-200 text-slate-700"
                    }`}
                  >
                    English (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, preferredLanguage: "ur" })}
                    className={`p-3 text-center rounded-xl border-2 font-medium text-sm transition ${
                      formData.preferredLanguage === "ur" ? "border-blue-600 bg-blue-50/50 text-blue-900" : "border-slate-200 text-slate-700"
                    }`}
                  >
                    اردو (Urdu Localization)
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Active Team Size</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "1", label: "Solo (1)" },
                    { id: "2_5", label: "2 - 5" },
                    { id: "6_15", label: "6 - 15" },
                    { id: "16_PLUS", label: "16+" }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, teamSize: t.id as any })}
                      className={`p-2.5 text-center rounded-xl border-2 text-sm font-semibold transition ${
                        formData.teamSize === t.id ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Question 5: Primary Goal */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What is your #1 goal with SpecForge?</h2>
                <p className="text-sm text-slate-500 mt-1">We&apos;ll prioritize the relevant widgets on your main dashboard.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { id: "FASTER_PROPOSALS", title: "Faster Proposal Turnaround", desc: "Cut proposal generation time from days to 15 mins" },
                  { id: "BETTER_ESTIMATES", title: "Accurate & Defensible Estimates", desc: "Stop under-bidding with role-based rate cards & P80 buffers" },
                  { id: "SCOPE_CONTROL", title: "Prevent Mid-Project Scope Creep", desc: "Clear boundaries, assumptions, exclusions & change requests" },
                  { id: "CLIENT_APPROVAL", title: "Frictionless Client Sign-Off", desc: "White-labeled digital approval room with immutable audit seals" }
                ].map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, primaryGoal: g.id as any })}
                    className={`p-4 text-left rounded-xl border-2 transition ${
                      formData.primaryGoal === g.id 
                        ? "border-blue-600 bg-blue-50/50 shadow-sm" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-sm">{g.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 6: Workspace Personalization & Sandbox Confirmation */}
          {step === 6 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ready to setup your personalized workspace</h2>
                <p className="text-sm text-slate-500 mt-1">We&apos;ve pre-configured your templates and checklist based on your answers.</p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-950">Pre-load Interactive Sandbox Project</h3>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Includes sample client voice notes, structured requirements, a pre-calculated estimate, and an approved proposal preview.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.createSampleSandbox}
                    onChange={(e) => setFormData({ ...formData, createSampleSandbox: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>Import &quot;Fintech Mobile MVP&quot; sample project for hands-on practice</span>
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Farhan Labs, Apex Digital Agency"
                  value={formData.workspaceName}
                  onChange={(e) => setFormData({ ...formData, workspaceName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || isSubmitting}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              step === 1 ? "invisible" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition flex items-center gap-2"
          >
            {isSubmitting ? (
              <span>Personalizing...</span>
            ) : step === 6 ? (
              <span>Launch Workspace →</span>
            ) : (
              <span>Continue →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
