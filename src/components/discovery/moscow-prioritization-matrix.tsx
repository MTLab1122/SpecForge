"use client";

import React, { useState } from "react";

export interface PrioritizedItem {
  id: string;
  title: string;
  category: string;
  moscow: "MUST" | "SHOULD" | "COULD" | "WONT";
  businessValue: number; // 1 to 5
  complexityScore: number; // 1 to 5
  dependsOnTitles: string[];
  blocksTitles: string[];
}

interface MoscowPrioritizationMatrixProps {
  initialItems: PrioritizedItem[];
  onUpdatePriority: (itemId: string, newMoscow: "MUST" | "SHOULD" | "COULD" | "WONT") => void;
  onUpdateScores: (itemId: string, businessValue: number, complexity: number) => void;
}

export function MoscowPrioritizationMatrix({
  initialItems,
  onUpdatePriority,
  onUpdateScores
}: MoscowPrioritizationMatrixProps) {
  const [items, setItems] = useState<PrioritizedItem[]>(initialItems);

  const COLUMNS = [
    { id: "MUST", label: "Must Have", color: "border-rose-300 bg-rose-50/30 text-rose-800", pill: "bg-rose-100 text-rose-800" },
    { id: "SHOULD", label: "Should Have", color: "border-amber-300 bg-amber-50/30 text-amber-800", pill: "bg-amber-100 text-amber-800" },
    { id: "COULD", label: "Could Have", color: "border-blue-300 bg-blue-50/30 text-blue-800", pill: "bg-blue-100 text-blue-800" },
    { id: "WONT", label: "Won't Have (MVP)", color: "border-slate-300 bg-slate-50/50 text-slate-600", pill: "bg-slate-200 text-slate-700" }
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetMoscow: "MUST" | "SHOULD" | "COULD" | "WONT") => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("itemId");
    if (!itemId) return;

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, moscow: targetMoscow } : item))
    );
    onUpdatePriority(itemId, targetMoscow);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">MoSCoW Requirement Prioritization</h3>
          <p className="text-xs text-slate-500">
            Drag cards between quadrants to align client expectations on scope limits
          </p>
        </div>
        <span className="text-xs text-slate-400">Total Items: {items.length}</span>
      </div>

      {/* 4 MoSCoW Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colItems = items.filter((i) => i.moscow === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id as any)}
              className={`rounded-2xl border-2 p-3.5 flex flex-col min-h-[380px] transition ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${col.pill}`}>
                  {col.label}
                </span>
                <span className="text-xs font-bold text-slate-500">{colItems.length}</span>
              </div>

              {/* Draggable Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)}
                    className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs cursor-grab transition space-y-2"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                        <span>⭐ Value: {item.businessValue}/5</span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{item.title}</h4>

                    {/* Complexity and Dependency Badges */}
                    <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                        Effort: {item.complexityScore}/5
                      </span>

                      {item.dependsOnTitles.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-semibold">
                          Depends on: {item.dependsOnTitles[0]}
                        </span>
                      )}

                      {item.blocksTitles.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-800 font-semibold">
                          Blocks: {item.blocksTitles[0]}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {colItems.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[11px] text-slate-400 italic py-10">
                    Drop items here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

