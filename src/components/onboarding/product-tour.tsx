"use client";

import React, { useState, useEffect } from "react";

export interface TourStep {
  targetSelector: string; // CSS selector or data attribute
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "[data-tour='brief-upload']",
    title: "1. Upload Client Input",
    description: "Drop PDFs, paste email notes, or record WhatsApp audio (up to 10 mins). SpecForge transcribes and stores the raw source.",
    position: "bottom"
  },
  {
    targetSelector: "[data-tour='ai-extraction']",
    title: "2. Grounded AI Extraction",
    description: "SpecForge extracts Goals, Personas, Features, and Risks. Every suggestion is linked to exact source citations.",
    position: "bottom"
  },
  {
    targetSelector: "[data-tour='scope-builder']",
    title: "3. Scope & User Stories",
    description: "Break features into User Stories and Acceptance Criteria checklists. Freeze versioned scope packages with one click.",
    position: "right"
  },
  {
    targetSelector: "[data-tour='estimate-matrix']",
    title: "4. Rate Cards & Contingency",
    description: "Apply your agency rate cards and P80 contingency buffers to generate defensible, profitable estimates.",
    position: "left"
  },
  {
    targetSelector: "[data-tour='client-portal']",
    title: "5. Digital Client Sign-Off",
    description: "Send a branded, read-only link. Clients leave comments and digitally approve with a cryptographic audit seal.",
    position: "top"
  }
];

interface ProductTourProps {
  tourKey?: string;
  onComplete?: () => void;
}

export function ProductTour({ tourKey = "specforge_main_tour", onComplete }: ProductTourProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(tourKey);
    if (!hasSeenTour) {
      setIsActive(true);
    }
  }, [tourKey]);

  const handleNext = () => {
    if (currentStepIndex < DEFAULT_TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(tourKey, "completed");
    setIsActive(false);
    if (onComplete) onComplete();
  };

  if (!isActive) return null;

  const currentStep = DEFAULT_TOUR_STEPS[currentStepIndex];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Semi-transparent Backdrop with pointer events enabled for modal box */}
      <div className="absolute inset-0 bg-slate-900/40 pointer-events-auto backdrop-blur-2xs" />

      {/* Floating Tour Card */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 pointer-events-auto w-full max-w-md p-4">
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xl p-5 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Quick Tour • Step {currentStepIndex + 1} of {DEFAULT_TOUR_STEPS.length}
            </span>
            <button
              onClick={handleDismiss}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Skip Tour
            </button>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">{currentStep.title}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{currentStep.description}</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {DEFAULT_TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStepIndex ? "w-5 bg-blue-600" : "w-1.5 bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                {currentStepIndex === DEFAULT_TOUR_STEPS.length - 1 ? "Finish Tour" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
