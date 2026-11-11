"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface CommandItem {
  id: string;
  title: string;
  category: "ACTIONS" | "PROJECTS" | "CLIENTS" | "HELP" | "TEMPLATES";
  subtitle?: string;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Registered Actions
  const commands: CommandItem[] = [
    {
      id: "act-new-project",
      title: "Create New Project",
      category: "ACTIONS",
      subtitle: "Start discovery from client brief or audio note",
      shortcut: "N",
      action: () => router.push("/projects/new")
    },
    {
      id: "act-new-client",
      title: "Add New Client",
      category: "ACTIONS",
      subtitle: "Register client profile & WhatsApp contact",
      shortcut: "C",
      action: () => router.push("/clients?action=new")
    },
    {
      id: "act-templates",
      title: "Explore Scope Templates",
      category: "TEMPLATES",
      subtitle: "Browse 7 pre-built industry scope architectures",
      shortcut: "T",
      action: () => router.push("/templates")
    },
    {
      id: "act-rate-cards",
      title: "Configure Agency Rate Cards",
      category: "ACTIONS",
      subtitle: "Setup role-based estimation rates & P80 buffers",
      shortcut: "R",
      action: () => router.push("/settings/rate-cards")
    },
    {
      id: "act-integrations",
      title: "Manage External Integrations",
      category: "ACTIONS",
      subtitle: "Connect Jira, Linear, Trello, or GitHub Issues",
      shortcut: "I",
      action: () => router.push("/integrations")
    },
    {
      id: "proj-sandbox",
      title: "Fintech Mobile MVP (Sandbox)",
      category: "PROJECTS",
      subtitle: "Stage: Proposal Approved • Last active 2h ago",
      action: () => router.push("/projects/sandbox-demo")
    },
    {
      id: "proj-ecommerce",
      title: "Shopify Headless Storefront",
      category: "PROJECTS",
      subtitle: "Stage: Scope Drafted • Acme Retail",
      action: () => router.push("/projects/proj_ecommerce_demo")
    },
    {
      id: "help-shortcuts",
      title: "View Keyboard Shortcuts",
      category: "HELP",
      subtitle: "Quick reference guide for power users",
      shortcut: "?",
      action: () => {
        setIsOpen(false);
        window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
      }
    },
    {
      id: "help-ai-grounding",
      title: "How does AI Requirement Extraction work?",
      category: "HELP",
      subtitle: "Learn about source citations and provenance tags",
      action: () => router.push("/help/ai-grounding")
    }
  ];

  // Filter commands by search query
  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase()) ||
    (c.subtitle && c.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard navigation within the palette
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }

    inputRef.current?.focus();

    const handlePaletteNav = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredCommands.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % (filteredCommands.length || 1));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handlePaletteNav);
    return () => window.removeEventListener("keydown", handlePaletteNav);
  }, [isOpen, filteredCommands, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200">
          <svg className="h-5 w-5 text-slate-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, project, or search help... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />
          <span className="text-[10px] font-semibold text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 shrink-0">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No matching commands or projects found for "{query}".
            </div>
          ) : (
            filteredCommands.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition ${
                    isSelected ? "bg-blue-50 text-blue-900" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      item.category === "ACTIONS" ? "bg-emerald-100 text-emerald-800" :
                      item.category === "PROJECTS" ? "bg-blue-100 text-blue-800" :
                      item.category === "TEMPLATES" ? "bg-purple-100 text-purple-800" :
                      "bg-slate-100 text-slate-700"
                    }`}>
                      {item.category}
                    </span>
                    <div>
                      <div className="text-xs font-semibold">{item.title}</div>
                      {item.subtitle && <div className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</div>}
                    </div>
                  </div>

                  {item.shortcut && (
                    <span className="text-[11px] font-semibold text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 bg-white">
                      {item.shortcut}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Navigate with ↑ / ↓ • Select with Enter</span>
          <span>SpecForge Command Center</span>
        </div>
      </div>
    </div>
  );
}
