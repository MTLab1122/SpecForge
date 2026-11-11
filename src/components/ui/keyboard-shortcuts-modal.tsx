"use client";

import React, { useState, useEffect } from "react";

interface ShortcutGroup {
  group: string;
  items: { key: string; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    group: "Navigation & Global",
    items: [
      { key: "⌘ + K / Ctrl + K", description: "Open Command Palette / Search" },
      { key: "?", description: "Open Keyboard Shortcuts Help" },
      { key: "Esc", description: "Close Active Modal, Drawer, or Palette" },
      { key: "G then D", description: "Go to Dashboard" },
      { key: "G then P", description: "Go to Projects Directory" },
      { key: "G then C", description: "Go to Clients CRM" }
    ]
  },
  {
    group: "Project & Discovery Actions",
    items: [
      { key: "N", description: "Create New Project" },
      { key: "U", description: "Upload New Client Brief / Audio Note" },
      { key: "E", description: "Open AI Extraction Review" },
      { key: "S", description: "Open Scope Tree Builder" },
      { key: "M", description: "Open Estimate Matrix & Rate Card" }
    ]
  },
  {
    group: "Review & Commercial",
    items: [
      { key: "P", description: "Open Proposal Preview & Link Generator" },
      { key: "T", description: "Export Approved Tasks (Jira/Linear/GitHub)" },
      { key: "C", description: "Create Mid-Project Change Request" }
    ]
  }
];

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in an input or textarea, don't trigger '?'
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === "?" && !e.shiftKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-shortcuts-modal", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-shortcuts-modal", handleCustomOpen);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              ⌨
            </span>
            <h2 className="text-base font-bold text-slate-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Esc to close
          </button>
        </div>

        <div className="p-6 max-h-[480px] overflow-y-auto space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.group} className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <span className="text-xs text-slate-700 font-medium">{item.description}</span>
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-800 shadow-2xs">
                      {item.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
          <span>Tip: Press <kbd className="font-mono bg-white border border-slate-300 px-1 rounded text-slate-700">?</kbd> anywhere in SpecForge to show this menu.</span>
        </div>
      </div>
    </div>
  );
}
