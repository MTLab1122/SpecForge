"use client";

import React, { useState, useEffect } from "react";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ProgressChecklist } from "@/components/onboarding/progress-checklist";
import { CommandPalette } from "@/components/navigation/command-palette";
import { KeyboardShortcutsModal } from "@/components/ui/keyboard-shortcuts-modal";
import { ContextualHelpDrawer } from "@/components/help/contextual-help";
import { ProductTour } from "@/components/onboarding/product-tour";
import { ContinueWhereLeftOff, ProjectResumeItem } from "@/components/dashboard/continue-where-left-off";
import { RecentProjectsList, RecentProject } from "@/components/dashboard/recent-projects";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivationChecklistStatus } from "@/lib/validations/onboarding";

export default function DashboardPage() {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<ActivationChecklistStatus | null>(null);
  const [resumeItem, setResumeItem] = useState<ProjectResumeItem | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Fetch checklist state
        const checkRes = await fetch("/api/v1/onboarding/checklist");
        const checkData = await checkRes.json();
        if (checkData.success) {
          setChecklist(checkData.data);
          // If first step incomplete, trigger onboarding
          if (checkData.data.completedStepsCount <= 1 && !localStorage.getItem("specforge_onboarding_done")) {
            setShowOnboarding(true);
          }
        }

        // 2. Fetch recent activity & continue state
        const actRes = await fetch("/api/v1/dashboard/recent-activity");
        const actData = await actRes.json();
        if (actData.success) {
          setResumeItem(actData.data.continueWhereLeftOff);
          setRecentProjects(actData.data.recentProjects);
        }
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("specforge_onboarding_done", "true");
    setShowOnboarding(false);
    // Reload state
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Global Command Palette & Shortcuts */}
      <CommandPalette />
      <KeyboardShortcutsModal />
      <ContextualHelpDrawer />
      {!showOnboarding && <ProductTour />}

      {/* Onboarding Wizard Modal if not finished */}
      {showOnboarding && (
        <OnboardingWizard
          userId="usr_demo_founder_1"
          organizationId="org_demo_workspace_1"
          onComplete={handleOnboardingComplete}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Main Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900">SpecForge</span>
              <span className="text-[11px] text-slate-400 block -mt-0.5">Discovery & Scope OS</span>
            </div>
          </div>

          {/* Quick Search & Command Palette trigger */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs transition"
            >
              <svg className="h-3.5 w-3.5 shrink-0" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Search or Jump to...</span>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            <button
              onClick={() => setShowOnboarding(true)}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2 py-1"
            >
              Reset Tour
            </button>
          </div>
        </div>
      </header>

      {/* Page Body Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6 space-y-6">
        {/* Welcome & Activation Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Workspace Overview</h1>
            <p className="text-xs text-slate-500 mt-1">
              Turn messy client briefs into approved scopes, estimates, and tasks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/projects/new"
              data-tour="brief-upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              <span>+ New Project</span>
            </a>
          </div>
        </div>

        {/* 1. Continue Where You Left Off State */}
        <ContinueWhereLeftOff item={resumeItem} />

        {/* 2. Grid: Activation Checklist (Left) & Recent Projects (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Checklist Column */}
          <div className="lg:col-span-1 space-y-4">
            {checklist && (
              <ProgressChecklist checklist={checklist} />
            )}

            {/* Next Recommended Action Card */}
            {checklist && !checklist.isActivated && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  Recommended Next Step
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {checklist.nextRecommendedStep.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {checklist.nextRecommendedStep.description}
                </p>
                <a
                  href={checklist.nextRecommendedStep.actionUrl}
                  className="inline-block mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-2xs transition"
                >
                  Complete in ~{checklist.nextRecommendedStep.estimatedMinutes} min →
                </a>
              </div>
            )}
          </div>

          {/* Recent Projects & Quick Access Column */}
          <div className="lg:col-span-2 space-y-6">
            {recentProjects.length > 0 ? (
              <RecentProjectsList 
                projects={recentProjects}
                onCreateNew={() => (window.location.href = "/projects/new")}
              />
            ) : (
              <EmptyState
                icon="🚀"
                title="No active projects yet"
                description="Upload a client's WhatsApp voice note, meeting notes, or PDF brief to generate your first structured scope in under 10 minutes."
                primaryAction={{
                  label: "Create First Project",
                  href: "/projects/new"
                }}
                sampleAction={{
                  label: "Load Fintech Mobile MVP Sandbox",
                  onClick: () => setShowOnboarding(true)
                }}
                tips={[
                  "Drop audio notes up to 10 minutes for automated speech-to-text",
                  "AI extractions cite exact sentence offsets to prevent hallucinations",
                  "Proposals are sent through a white-labeled read-only client portal"
                ]}
              />
            )}

            {/* Discovery & Scope OS Workflow Banner */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Core Delivery Pipeline</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div data-tour="brief-upload" className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-lg">📥</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">1. Discovery</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Text, PDF, 10m Audio</div>
                </div>
                <div data-tour="ai-extraction" className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-lg">🔍</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">2. Extraction</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Features & Citations</div>
                </div>
                <div data-tour="estimate-matrix" className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-lg">📊</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">3. Estimation</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Rate Cards & P80</div>
                </div>
                <div data-tour="client-portal" className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-lg">✍️</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">4. Approval</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Digital Audit Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
