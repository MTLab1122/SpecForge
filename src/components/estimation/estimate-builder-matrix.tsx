"use client";

import React, { useState, useMemo } from "react";
import {
  EstimateCategory,
  EstimateScenarioType,
  EstimateItemInput
} from "@/lib/validations/commercial-estimation";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import {
  Layers,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  Percent,
  FileSpreadsheet
} from "lucide-react";

interface EstimateBuilderMatrixProps {
  projectId: string;
  initialItems?: EstimateItemInput[];
  initialScenario?: EstimateScenarioType;
  currency?: string;
  taxRate?: number;
  discount?: number;
  minimumFloor?: number;
  managerThreshold?: number;
  onSave?: (data: any) => void;
}

const CATEGORY_LABELS: Record<EstimateCategory, { label: string; color: string; desc: string }> = {
  FEATURE: { label: "Functional Features", color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Core business logic and user-facing capabilities" },
  TASK: { label: "Technical Tasks", color: "bg-slate-100 text-slate-800 border-slate-200", desc: "Infrastructure, refactoring, and setup tasks" },
  DESIGN: { label: "UI/UX & Design Tokens", color: "bg-purple-100 text-purple-800 border-purple-200", desc: "Figma wireframes, prototypes, design systems" },
  DEVELOPMENT: { label: "Frontend & Backend Dev", color: "bg-emerald-100 text-emerald-800 border-emerald-200", desc: "Full-stack code execution, APIs, and database" },
  QA: { label: "QA & Test Engineering", color: "bg-amber-100 text-amber-800 border-amber-200", desc: "Manual, regression, automated Playwright/Jest tests" },
  DEPLOYMENT: { label: "DevOps & Cloud Launch", color: "bg-indigo-100 text-indigo-800 border-indigo-200", desc: "CI/CD pipelines, Docker, cloud hosting setup" },
  PROJECT_MANAGEMENT: { label: "PM & Client Syncs", color: "bg-cyan-100 text-cyan-800 border-cyan-200", desc: "Sprint management, demos, and delivery handover" },
  BUFFER: { label: "Risk Contingency Buffer", color: "bg-rose-100 text-rose-800 border-rose-200", desc: "Scenario-derived defensive uncertainty allowance" }
};

export const EstimateBuilderMatrix: React.FC<EstimateBuilderMatrixProps> = ({
  projectId,
  initialItems = [],
  initialScenario = "REALISTIC",
  currency = "USD",
  taxRate = 0,
  discount = 0,
  minimumFloor = 2500,
  managerThreshold = 10000,
  onSave
}) => {
  const [items, setItems] = useState<EstimateItemInput[]>(() => {
    if (initialItems.length > 0) return initialItems;
    return [
      {
        id: "item-1",
        category: "DESIGN",
        roleTitle: "Lead UI/UX Designer",
        hourlyRate: 95,
        title: "Information Architecture & Figma High-Fidelity Mockups",
        complexity: "MEDIUM",
        minHours: 24,
        maxHours: 32,
        manualOverride: false
      },
      {
        id: "item-2",
        category: "DEVELOPMENT",
        roleTitle: "Senior Full Stack Engineer",
        hourlyRate: 110,
        title: "Core Workflow Engine & API Integration",
        complexity: "HIGH",
        minHours: 60,
        maxHours: 80,
        manualOverride: false
      },
      {
        id: "item-3",
        category: "QA",
        roleTitle: "QA Engineer",
        hourlyRate: 85,
        title: "Acceptance Testing & Playwright End-to-End Suite",
        complexity: "MEDIUM",
        minHours: 20,
        maxHours: 28,
        manualOverride: false
      },
      {
        id: "item-4",
        category: "DEPLOYMENT",
        roleTitle: "DevOps Engineer",
        hourlyRate: 120,
        title: "Dockerized Staging/Production Pipeline & Cloud DNS",
        complexity: "LOW",
        minHours: 12,
        maxHours: 16,
        manualOverride: false
      },
      {
        id: "item-5",
        category: "PROJECT_MANAGEMENT",
        roleTitle: "Technical Project Manager",
        hourlyRate: 95,
        title: "Bi-Weekly Sprint Governance & Client Handover Runbook",
        complexity: "LOW",
        minHours: 16,
        maxHours: 20,
        manualOverride: false
      }
    ];
  });

  const [activeScenario, setActiveScenario] = useState<EstimateScenarioType>(initialScenario);
  const [customMultiplier, setCustomMultiplier] = useState<number>(1.2);
  const [activeTaxRate, setActiveTaxRate] = useState<number>(taxRate);
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [activeDiscount, setActiveDiscount] = useState<number>(discount);
  const [activeFloor, setActiveFloor] = useState<number>(minimumFloor);
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>("ALL");

  // Recalculate full estimation via the engine
  const calculation = useMemo(() => {
    return CommercialEstimationEngine.calculateEstimate({
      items,
      scenarioType: activeScenario,
      customMultiplier: activeScenario === "CUSTOM" ? customMultiplier : undefined,
      taxRatePercent: activeTaxRate,
      taxIsInclusive: taxInclusive,
      discountAmount: activeDiscount,
      minimumProjectValue: activeFloor,
      managerApprovalThreshold: managerThreshold
    });
  }, [items, activeScenario, customMultiplier, activeTaxRate, taxInclusive, activeDiscount, activeFloor, managerThreshold]);

  const handleAddItem = (category: EstimateCategory = "DEVELOPMENT") => {
    const newItem: EstimateItemInput = {
      id: `item-${Date.now()}`,
      category,
      roleTitle: category === "DESIGN" ? "UI/UX Designer" : category === "QA" ? "QA Engineer" : "Senior Full Stack Engineer",
      hourlyRate: 100,
      title: "New Scope Item",
      complexity: "MEDIUM",
      minHours: 10,
      maxHours: 16,
      manualOverride: false
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<EstimateItemInput>) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const filteredItems = useMemo(() => {
    if (selectedFilterCategory === "ALL") return items;
    return items.filter((item) => item.category === selectedFilterCategory);
  }, [items, selectedFilterCategory]);

  return (
    <div className="w-full space-y-6 bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Commercial Estimation Engine</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
              Active v1.0
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Structured 8-part breakdown, role-based rate cards, dynamic scenario models, and margin protection floors.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleAddItem("DEVELOPMENT")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
          {onSave && (
            <button
              onClick={() => onSave({ items, calculation, scenario: activeScenario })}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Save Matrix
            </button>
          )}
        </div>
      </div>

      {/* Threshold / Manager Approval Warning Banner */}
      {calculation.requiresManagerApproval && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Manager Sign-off Required:</strong> Total estimated cost ({currency} {calculation.grandTotalCost.toLocaleString()}) exceeds the organization threshold of {currency} {calculation.managerApprovalThreshold.toLocaleString()}. Client proposal cannot be dispatched until internal manager approval is granted.
          </span>
        </div>
      )}

      {/* Scenario & Financial Parameter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Active Scenario Model
          </label>
          <select
            value={activeScenario}
            onChange={(e) => setActiveScenario(e.target.value as EstimateScenarioType)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
          >
            <option value="OPTIMISTIC">Optimistic (1.0x velocity, 5% buffer)</option>
            <option value="REALISTIC">Realistic (1.15x velocity, 15% buffer)</option>
            <option value="CONSERVATIVE">Conservative (1.35x velocity, 25% buffer)</option>
            <option value="CUSTOM">User-Defined Custom</option>
          </select>
        </div>

        {activeScenario === "CUSTOM" && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Multiplier: {customMultiplier}x
            </label>
            <input
              type="range"
              min="0.8"
              max="2.0"
              step="0.05"
              value={customMultiplier}
              onChange={(e) => setCustomMultiplier(parseFloat(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Tax Rate (%) & Inclusive Toggle
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              value={activeTaxRate}
              onChange={(e) => setActiveTaxRate(parseFloat(e.target.value) || 0)}
              className="w-20 text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
              placeholder="0%"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => setTaxInclusive(e.target.checked)}
                className="rounded text-indigo-600"
              />
              Inclusive
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Concession / Discount ({currency})
          </label>
          <input
            type="number"
            min="0"
            value={activeDiscount}
            onChange={(e) => setActiveDiscount(parseFloat(e.target.value) || 0)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Minimum Project Floor ({currency})
          </label>
          <input
            type="number"
            min="0"
            value={activeFloor}
            onChange={(e) => setActiveFloor(parseFloat(e.target.value) || 0)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
            placeholder="2500"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 font-semibold shrink-0">Filter Breakdown:</span>
        <button
          onClick={() => setSelectedFilterCategory("ALL")}
          className={`px-3 py-1 rounded-full font-medium transition ${
            selectedFilterCategory === "ALL"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
          }`}
        >
          All Items ({items.length})
        </button>
        {Object.entries(CATEGORY_LABELS).map(([cat, meta]) => {
          if (cat === "BUFFER") return null;
          const count = items.filter((i) => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedFilterCategory(cat)}
              className={`px-3 py-1 rounded-full font-medium transition border ${
                selectedFilterCategory === cat ? meta.color : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800"
              }`}
            >
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Detailed Items Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Scope Deliverable & Role</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3 text-right">Hourly Rate</th>
              <th className="py-3 px-3 text-center">Complexity</th>
              <th className="py-3 px-3 text-right">Min Hours</th>
              <th className="py-3 px-3 text-right">Max Hours</th>
              <th className="py-3 px-3 text-right">Est. Cost</th>
              <th className="py-3 px-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item, idx) => {
              const originalIndex = items.findIndex((i) => i.id === item.id);
              const avgHours = (item.minHours + item.maxHours) / 2;
              const cost = avgHours * (item.hourlyRate || 100);

              return (
                <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateItem(originalIndex, { title: e.target.value })}
                      className="w-full font-medium text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={item.roleTitle || ""}
                      onChange={(e) => handleUpdateItem(originalIndex, { roleTitle: e.target.value })}
                      placeholder="Role (e.g. Senior Backend Dev)"
                      className="w-full text-slate-500 text-[11px] bg-transparent focus:outline-none mt-0.5"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <select
                      value={item.category}
                      onChange={(e) => handleUpdateItem(originalIndex, { category: e.target.value as EstimateCategory })}
                      className="text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
                    >
                      <option value="FEATURE">Feature</option>
                      <option value="TASK">Task</option>
                      <option value="DESIGN">Design</option>
                      <option value="DEVELOPMENT">Development</option>
                      <option value="QA">QA</option>
                      <option value="DEPLOYMENT">Deployment</option>
                      <option value="PROJECT_MANAGEMENT">PM</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        min="0"
                        value={item.hourlyRate || 100}
                        onChange={(e) => handleUpdateItem(originalIndex, { hourlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-16 text-right px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <select
                      value={item.complexity}
                      onChange={(e) => handleUpdateItem(originalIndex, { complexity: e.target.value as any })}
                      className="text-[11px] px-2 py-1 rounded-full font-semibold border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      min="0.25"
                      step="0.5"
                      value={item.minHours}
                      onChange={(e) => handleUpdateItem(originalIndex, { minHours: parseFloat(e.target.value) || 0.25 })}
                      className="w-14 text-right px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      min="0.25"
                      step="0.5"
                      value={item.maxHours}
                      onChange={(e) => handleUpdateItem(originalIndex, { maxHours: parseFloat(e.target.value) || 0.25 })}
                      className="w-14 text-right px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                    {currency} {cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => handleRemoveItem(originalIndex)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 8-Part Category Breakdown Distribution & Summary Rollup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Share List */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" /> 8-Part Work Breakdown Structure
            </h3>
            <span className="text-xs text-slate-500">
              Scenario: <strong>{calculation.scenario.label}</strong> ({calculation.scenario.multiplier}x)
            </span>
          </div>

          <div className="space-y-3">
            {Object.entries(calculation.breakdownByCategory).map(([cat, data]) => {
              const meta = CATEGORY_LABELS[cat as EstimateCategory];
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {meta.label} ({data.itemCount} {data.itemCount === 1 ? "item" : "items"})
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      {data.hours}h · {currency} {data.cost.toLocaleString()} ({data.percentageOfTotal}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        cat === "BUFFER"
                          ? "bg-rose-500"
                          : cat === "DEVELOPMENT"
                          ? "bg-emerald-500"
                          : cat === "DESIGN"
                          ? "bg-purple-500"
                          : cat === "QA"
                          ? "bg-amber-500"
                          : "bg-indigo-500"
                      }`}
                      style={{ width: `${Math.min(100, data.percentageOfTotal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Rollup & Guardrails Card */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-4 shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <div className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">Grand Total Commitment</div>
            <div className="text-3xl font-extrabold tracking-tight mt-1 text-white">
              {currency} {calculation.grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-indigo-200 mt-0.5">
              Total Delivery Effort: <strong>{calculation.totalEstimatedHours} hours</strong> (P80: {calculation.p80EstimatedHours}h)
            </div>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-800/80">
            <div className="flex justify-between pt-1 text-slate-300">
              <span>Base Engineering Effort:</span>
              <span className="font-mono">{calculation.scenarioAdjustedHours}h (${calculation.baseCost.toLocaleString()})</span>
            </div>
            <div className="flex justify-between pt-2 text-rose-300">
              <span>Risk Contingency ({calculation.scenario.contingencyPercent}%):</span>
              <span className="font-mono">+{calculation.contingencyHours}h (${calculation.contingencyCost.toLocaleString()})</span>
            </div>
            <div className="flex justify-between pt-2 text-slate-300">
              <span>Subtotal:</span>
              <span className="font-mono">${calculation.subtotalCost.toLocaleString()}</span>
            </div>

            {calculation.discountAmount > 0 && (
              <div className="flex justify-between pt-2 text-emerald-300">
                <span>Applied Discount:</span>
                <span className="font-mono">-${calculation.discountAmount.toLocaleString()}</span>
              </div>
            )}

            {calculation.minimumProjectFloorApplied && (
              <div className="flex justify-between pt-2 text-amber-300">
                <span>Floor Adjustment Applied:</span>
                <span className="font-mono">${calculation.minimumProjectValue.toLocaleString()} minimum</span>
              </div>
            )}

            {calculation.taxRatePercent > 0 && (
              <div className="flex justify-between pt-2 text-slate-300">
                <span>Tax ({calculation.taxRatePercent}% {calculation.taxIsInclusive ? "incl." : "excl."}):</span>
                <span className="font-mono">${calculation.taxAmount.toLocaleString()}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 text-indigo-300 font-medium">
              <span>Projected Margin Target:</span>
              <span>{calculation.estimatedProfitMarginPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

