"use client";

import React, { useState } from "react";
import type { SystemTemplate, TemplateCategory } from "@/lib/engagement/templates-and-assets";
import {
  Layers,
  Search,
  Sparkles,
  Calculator,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ArrowRight,
  X
} from "lucide-react";

interface TemplatesLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SystemTemplate[];
  onApplyTemplate: (template: SystemTemplate) => Promise<void>;
  onDuplicateProject?: () => void;
  isApplying?: boolean;
}

export const TemplatesLibraryModal: React.FC<TemplatesLibraryModalProps> = ({
  isOpen,
  onClose,
  templates,
  onApplyTemplate,
  onDuplicateProject,
  isApplying = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<SystemTemplate | null>(null);

  if (!isOpen) return null;

  const categories: Array<{ id: TemplateCategory | "ALL"; label: string }> = [
    { id: "ALL", label: "All Templates" },
    { id: "DISCOVERY", label: "Discovery Blueprints" },
    { id: "ESTIMATE", label: "Estimate Scenarios" },
    { id: "PROPOSAL", label: "Proposal Pitches" },
    { id: "SCOPE", label: "Scope Modules" },
    { id: "TASK", label: "Delivery Tasks" }
  ];

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                SpecForge Blueprint & Reusable Templates Library
              </h3>
              <p className="text-xs text-slate-500">
                Kickstart client discovery and proposal delivery in seconds using proven agency architectures.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls: Search & Category Pills */}
        <div className="py-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search templates (e.g. SaaS, E-Commerce, Fixed-Price, Mobile)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === c.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {tmpl.badge}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {tmpl.category}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tmpl.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
                >
                  Preview Blueprint
                </button>
                <button
                  onClick={() => onApplyTemplate(tmpl)}
                  disabled={isApplying}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow transition-colors disabled:opacity-50"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Duplicate Option */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Need to reuse your exact past work?
          </div>
          {onDuplicateProject && (
            <button
              onClick={onDuplicateProject}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate from Existing Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Blueprint Preview Sub-modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {previewTemplate.title}
              </h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {previewTemplate.description}
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-mono space-y-2 max-h-60 overflow-y-auto">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Included Specification:</div>
              {previewTemplate.structure.features?.map((f, i) => (
                <div key={i} className="text-slate-700 dark:text-slate-300">
                  • [{f.priority}] {f.title}
                </div>
              ))}
              {previewTemplate.structure.rolesEstimated?.map((r, i) => (
                <div key={i} className="text-slate-700 dark:text-slate-300">
                  • {r.role}: {r.hours}h @ ${r.rate}/hr
                </div>
              ))}
              {previewTemplate.structure.tasksBoilerplate?.map((t, i) => (
                <div key={i} className="text-slate-700 dark:text-slate-300">
                  • Task: {t.title} ({t.estimatedHours}h)
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onApplyTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg"
              >
                Apply This Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
