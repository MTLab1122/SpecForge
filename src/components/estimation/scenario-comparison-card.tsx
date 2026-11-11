"use client";

import React from "react";
import { EstimateScenarioType, EstimateItemInput } from "@/lib/validations/commercial-estimation";
import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import { TrendingUp, Shield, Zap, Sparkles, Check, ArrowRight } from "lucide-react";

interface ScenarioComparisonCardProps {
  items: EstimateItemInput[];
  selectedScenario: EstimateScenarioType;
  currency?: string;
  taxRate?: number;
  discount?: number;
  onSelectScenario: (scenario: EstimateScenarioType) => void;
}

export const ScenarioComparisonCard: React.FC<ScenarioComparisonCardProps> = ({
  items,
  selectedScenario,
  currency = "USD",
  taxRate = 0,
  discount = 0,
  onSelectScenario
}) => {
  const comparison = React.useMemo(() => {
    return CommercialEstimationEngine.compareScenarios(items, taxRate, discount);
  }, [items, taxRate, discount]);

  const scenariosMeta = [
    {
      type: "OPTIMISTIC" as EstimateScenarioType,
      label: "Optimistic Scenario",
      sublabel: "Lean Execution Path",
      icon: Zap,
      accentColor: "border-blue-500",
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      calc: comparison.optimistic,
      description: "Best-case timeline. Minimal iterations, instantaneous client reviews, zero external blocking dependencies."
    },
    {
      type: "REALISTIC" as EstimateScenarioType,
      label: "Realistic Scenario (Recommended)",
      sublabel: "Industry Standard Baseline",
      icon: TrendingUp,
      accentColor: "border-emerald-500 ring-2 ring-emerald-500/30",
      badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      calc: comparison.realistic,
      description: "Blended team velocity factoring code reviews, 2 rounds of client feedback, and typical integration friction."
    },
    {
      type: "CONSERVATIVE" as EstimateScenarioType,
      label: "Conservative Scenario",
      sublabel: "High Defense (P90)",
      icon: Shield,
      accentColor: "border-purple-500",
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
      calc: comparison.conservative,
      description: "Defensive model designed for legacy tech debt, complex multi-stakeholder governance, and stringent QA criteria."
    }
  ];

  const spreadAmount = comparison.rangeSummary.maxCost - comparison.rangeSummary.minCost;
  const spreadHours = comparison.rangeSummary.maxHours - comparison.rangeSummary.minHours;

  return (
    <div className="w-full space-y-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" /> Commercial Scenario Modeling
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Compare risk-calibrated delivery scenarios to align with client budget tolerances and delivery confidence.
          </p>
        </div>

        {/* Spread Metric Badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="text-slate-500">Uncertainty Spread:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {spreadHours}h · {currency} {spreadAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3 Column Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenariosMeta.map((s) => {
          const Icon = s.icon;
          const isSelected = selectedScenario === s.type;

          return (
            <div
              key={s.type}
              onClick={() => onSelectScenario(s.type)}
              className={`relative cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                isSelected
                  ? `${s.accentColor} bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md`
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                  <Check className="w-3.5 h-3.5" /> Selected
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`p-1.5 rounded-lg ${s.badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{s.label}</h4>
                    <span className="text-[11px] text-slate-500">{s.sublabel}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-4 leading-relaxed">
                  {s.description}
                </p>

                {/* Numbers Rollup */}
                <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Velocity Multiplier:</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {s.calc.scenario.multiplier}x
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contingency Buffer:</span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {s.calc.scenario.contingencyPercent}% ({s.calc.contingencyHours}h)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Hours:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {s.calc.totalEstimatedHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Price & Button */}
              <div className="mt-4 pt-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Grand Total</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {currency} {s.calc.grandTotalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectScenario(s.type);
                  }}
                  className={`w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {isSelected ? "Active Scenario" : "Switch to this Scenario"} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

