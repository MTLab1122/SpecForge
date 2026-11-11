"use client";

import React, { useState } from "react";
import type { FeedbackSubmissionItem, FeedbackType } from "@/lib/engagement/feedback-service";
import {
  MessageSquarePlus,
  ThumbsUp,
  Bug,
  Sparkles,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  X,
  Send,
  CheckCircle2
} from "lucide-react";

interface FeedbackAndNpsWidgetProps {
  featureRequests: FeedbackSubmissionItem[];
  onSubmitFeedback: (data: {
    type: FeedbackType;
    score?: number;
    title?: string;
    content: string;
    category?: string;
    severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }) => Promise<void>;
  onUpvoteFeature: (id: string) => Promise<void>;
}

export const FeedbackAndNpsWidget: React.FC<FeedbackAndNpsWidgetProps> = ({
  featureRequests,
  onSubmitFeedback,
  onUpvoteFeature
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"nps" | "features" | "bug" | "exit">("nps");

  // NPS State
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");

  // Feature Request State
  const [featureTitle, setFeatureTitle] = useState("");
  const [featureContent, setFeatureContent] = useState("");
  const [featureCategory, setFeatureCategory] = useState("INTEGRATION");

  // Bug State
  const [bugTitle, setBugTitle] = useState("");
  const [bugContent, setBugContent] = useState("");
  const [bugSeverity, setBugSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");

  // Exit State
  const [exitReason, setExitReason] = useState("TOO_EXPENSIVE");
  const [exitComment, setExitComment] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmitNps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (npsScore === null) return;
    try {
      setIsSubmitting(true);
      await onSubmitFeedback({
        type: "NPS",
        score: npsScore,
        content: npsComment
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!featureTitle || !featureContent) return;
    try {
      setIsSubmitting(true);
      await onSubmitFeedback({
        type: "FEATURE_REQUEST",
        title: featureTitle,
        content: featureContent,
        category: featureCategory
      });
      setFeatureTitle("");
      setFeatureContent("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bugTitle || !bugContent) return;
    try {
      setIsSubmitting(true);
      await onSubmitFeedback({
        type: "BUG",
        title: bugTitle,
        content: bugContent,
        severity: bugSeverity
      });
      setBugTitle("");
      setBugContent("");
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onSubmitFeedback({
        type: "EXIT_SURVEY",
        category: exitReason,
        content: exitComment
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs shadow-xl hover:scale-105 transition-all"
      >
        <MessageSquarePlus className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
        <span>Feedback & Requests</span>
      </button>

      {/* Feedback Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Help Us Build SpecForge
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab("nps")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  activeTab === "nps" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
                }`}
              >
                NPS Survey
              </button>
              <button
                onClick={() => setActiveTab("features")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  activeTab === "features" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
                }`}
              >
                Feature Requests
              </button>
              <button
                onClick={() => setActiveTab("bug")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  activeTab === "bug" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
                }`}
              >
                Report Bug
              </button>
              <button
                onClick={() => setActiveTab("exit")}
                className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
                  activeTab === "exit" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs" : "text-slate-500"
                }`}
              >
                Exit Survey
              </button>
            </div>

            {submitSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Thank you! Your feedback has been received.</span>
              </div>
            )}

            {/* Tab 1: NPS Survey */}
            {activeTab === "nps" && (
              <form onSubmit={handleSubmitNps} className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    How likely are you to recommend SpecForge to a freelance peer or agency colleague?
                  </span>
                  <div className="grid grid-cols-11 gap-1 mt-3">
                    {Array.from({ length: 11 }).map((_, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => setNpsScore(i)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          npsScore === i
                            ? i >= 9
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : i >= 7
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-red-500 text-white border-red-500"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 (Not at all likely)</span>
                    <span>10 (Extremely likely)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    What is the primary reason for your score?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you love or what we need to improve..."
                    value={npsComment}
                    onChange={(e) => setNpsComment(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={npsScore === null || isSubmitting}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit NPS Rating"}
                </button>
              </form>
            )}

            {/* Tab 2: Feature Requests */}
            {activeTab === "features" && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                {/* Submit New Idea */}
                <form onSubmit={handleSubmitFeature} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Submit New Feature Idea
                  </span>
                  <input
                    type="text"
                    placeholder="Feature title..."
                    value={featureTitle}
                    onChange={(e) => setFeatureTitle(e.target.value)}
                    className="w-full p-2 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    required
                  />
                  <textarea
                    rows={2}
                    placeholder="Describe how this feature improves your workflow..."
                    value={featureContent}
                    onChange={(e) => setFeatureContent(e.target.value)}
                    className="w-full p-2 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow"
                  >
                    Post Request
                  </button>
                </form>

                {/* Upvote Board */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Community Upvote Board
                  </span>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    {featureRequests.map((fr) => (
                      <div key={fr.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {fr.title}
                          </span>
                          <p className="text-slate-500 line-clamp-1">{fr.content}</p>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            Status: {fr.status}
                          </span>
                        </div>
                        <button
                          onClick={() => onUpvoteFeature(fr.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-bold">{fr.upvotes}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Report Bug */}
            {activeTab === "bug" && (
              <form onSubmit={handleSubmitBug} className="space-y-3 flex-1 overflow-y-auto text-xs">
                <div>
                  <label className="font-semibold block mb-1">Issue Summary</label>
                  <input
                    type="text"
                    placeholder="e.g. Exported Jira tasks missing acceptance criteria"
                    value={bugTitle}
                    onChange={(e) => setBugTitle(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Severity</label>
                  <select
                    value={bugSeverity}
                    onChange={(e) => setBugSeverity(e.target.value as any)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="LOW">Low (Cosmetic / Typo)</option>
                    <option value="MEDIUM">Medium (Minor disruption)</option>
                    <option value="HIGH">High (Feature not functioning)</option>
                    <option value="CRITICAL">Critical (Data loss / blocker)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Steps to Reproduce</label>
                  <textarea
                    rows={3}
                    placeholder="1. Go to...\n2. Click on...\n3. Observed error..."
                    value={bugContent}
                    onChange={(e) => setBugContent(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow"
                >
                  Submit Bug Report
                </button>
              </form>
            )}

            {/* Tab 4: Exit Survey */}
            {activeTab === "exit" && (
              <form onSubmit={handleSubmitExit} className="space-y-3 flex-1 overflow-y-auto text-xs">
                <div>
                  <label className="font-semibold block mb-1">Why are you pausing or canceling?</label>
                  <select
                    value={exitReason}
                    onChange={(e) => setExitReason(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="TOO_EXPENSIVE">Pricing is too high for my current workload</option>
                    <option value="MISSING_INTEGRATION">Missing an essential PM integration</option>
                    <option value="PROJECT_CONCLUDED">Client discovery project finished</option>
                    <option value="USING_MANUAL_DOCS">Prefer manual Google Docs / Notion</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Anything that could have kept you?</label>
                  <textarea
                    rows={3}
                    placeholder="Help us understand how we can improve..."
                    value={exitComment}
                    onChange={(e) => setExitComment(e.target.value)}
                    className="w-full p-2 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-lg"
                >
                  Submit Exit Survey
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
