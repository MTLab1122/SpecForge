"use client";

import React, { useState, useMemo } from "react";
import { CommercialEstimationEngine, VarianceAnalysisResult } from "@/lib/estimation/engine";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  SlidersHorizontal,
  Save,
  HelpCircle
} from "lucide-react";

interface AccuracyFeedbackWidgetProps {
  estimateId: string;
  projectId: string;
  initialEstimatedHours: number;
  initialActualHours?: number;
  initialRoleEstimates?: Record<string, number>;
  initialRoleActuals?: Record<string, number>;
  onSaveAccuracyFeedback?: (data: {
    actualTotalHours: number;
    varianceHours: number;
    variancePercent: number;
    calibrationMultiplier: number;
    recurringErrors: string[];
    roleActuals: Record<string, number>;
  }) => Promise<void>;
}

export const AccuracyFeedbackWidget: React.FC<AccuracyFeedbackWidgetProps> = ({
  estimateId,
  projectId,
  initialEstimatedHours,
  initialActualHours = 0,
  initialRoleEstimates = {
    "UI/UX Design": 24,
    "Full Stack Development": 70,
    "QA Engineering": 20,
    "DevOps & Deployment": 12,
    "Project Management": 16
  },
  initialRoleActuals = {},
  onSaveAccuracyFeedback
}) => {
  const [roleActuals, setRoleActuals] = useState<Record<string, number>>(() => {
    if (Object.keys(initialRoleActuals).length > 0) return initialRoleActuals;
    return {
      "UI/UX Design": 26,
      "Full Stack Development": 88,
      "QA Engineering": 29,
      "DevOps & Deployment": 14,
      "Project Management": 18
    };
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successSaved, setSuccessSaved] = useState(false);

  // Derive total actual hours
  const actualTotalHours = useMemo(() => {
    return Object.values(roleActuals).reduce((a, b) => a + b, 0);
  }, [roleActuals]);

  // Run accuracy engine
  const analysis: VarianceAnalysisResult = useMemo(() => {
    return CommercialEstimationEngine.analyzeAccuracy({
      estimatedTotalHours: initialEstimatedHours,
      actualTotalHours,
      estimatedByRole: initialRoleEstimates,
      actualByRole: roleActuals
    });
  }, [initialEstimatedHours, actualTotalHours, initialRoleEstimates, roleActuals]);

  const handleUpdateRoleActual = (role: string, hours: number) => {
    setRoleActuals((prev) => ({
      ...prev,
      [role]: Math.max(0, hours)
    }));
  };

  const handleSave = async () => {
    if (!onSaveAccuracyFeedback) return;
    try {
      setIsSaving(true);
      await onSaveAccuracyFeedback({
        actualTotalHours: analysis.actualHours,
        varianceHours: analysis.varianceHours,
        variancePercent: analysis.variancePercent,
        calibrationMultiplier: analysis.recommendedCalibrationMultiplier,
        recurringErrors: analysis.recurringErrors,
        roleActuals
      });
      setSuccessSaved(true);
      setTimeout(() => setSuccessSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: VarianceAnalysisResult["status"]) => {
    switch (status) {
      case "ON_BUDGET":
        return { label: "On Budget (Target Met)", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300" };
      case "UNDER_BUDGET":
        return { label: "Under Budget (Surplus)", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300" };
      case "OVER_BUDGET":
        return { label: "Moderate Overrun", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300" };
      case "CRITICAL_OVERRUN":
        return { label: "Critical Overrun (> 25%)", color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300" };
    }
  };

  const statusBadge = getStatusBadge(analysis.status);

  return (
    <div className="w-full space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <BrainCircuit className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Estimate Accuracy & Effort Variance Feedback</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.color}`}>
              {statusBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Compare initial baseline estimates with actual logged sprint hours to calibrate future pricing models and detect systemic errors.
          </p>
        </div>

        <button
          disabled={isSaving}
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
        >
          {successSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {successSaved ? "Calibrated!" : "Persist Calibration"}
        </button>
      </div>

      {/* Variance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Estimated Effort</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {analysis.estimatedHours}h
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Approved proposal baseline</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actual Logged Effort</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {analysis.actualHours}h
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Sum of completed tasks</div>
        </div>

        <div className={`p-4 rounded-xl border ${
          analysis.variancePercent > 10
            ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
            : analysis.variancePercent < -10
            ? "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
            : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
        }`}>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Total Variance</div>
          <div className={`text-2xl font-bold mt-1 ${
            analysis.varianceHours > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
          }`}>
            {analysis.varianceHours > 0 ? `+${analysis.varianceHours}h` : `${analysis.varianceHours}h`}
            <span className="text-sm font-medium ml-1.5">
              ({analysis.variancePercent > 0 ? `+${analysis.variancePercent}%` : `${analysis.variancePercent}%`})
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Effort difference from plan</div>
        </div>

        {/* Dynamic Learned Calibration Multiplier */}
        <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Learned Calibration Multiplier
          </div>
          <div className="text-2xl font-black text-indigo-950 dark:text-indigo-100 mt-1 flex items-center gap-1">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {analysis.recommendedCalibrationMultiplier}x
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">
            Auto-recommended for future estimates
          </div>
        </div>
      </div>

      {/* Role Breakdown Table & Recurring Pitfalls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Role / Discipline</th>
                <th className="py-3 px-3 text-right">Est. Hours</th>
                <th className="py-3 px-3 text-right">Actual Hours</th>
                <th className="py-3 px-3 text-right">Variance (h)</th>
                <th className="py-3 px-4 text-right">Variance (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(analysis.roleVariance).map(([role, r]) => (
                <tr key={role} className="hover:bg-slate-50 dark:hover:bg-slate-850 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {role}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-300">
                    {r.estimated}h
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={roleActuals[role] ?? r.actual}
                      onChange={(e) => handleUpdateRoleActual(role, parseFloat(e.target.value) || 0)}
                      className="w-16 text-right px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold">
                    <span className={r.varianceHours > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {r.varianceHours > 0 ? `+${r.varianceHours}h` : `${r.varianceHours}h`}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      r.variancePercent > 20
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        : r.variancePercent < -15
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                    }`}>
                      {r.variancePercent > 0 ? `+${r.variancePercent}%` : `${r.variancePercent}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recurring Error Insights Panel */}
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Detected Recurring Estimation Errors
          </h4>

          {analysis.recurringErrors.length === 0 ? (
            <p className="text-xs text-slate-500">
              No systematic estimation flaws detected. All discipline variances remained within the ±15% acceptable threshold.
            </p>
          ) : (
            <div className="space-y-2">
              {analysis.recurringErrors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2"
                >
                  <span className="text-amber-500 mt-0.5">●</span>
                  <span className="leading-relaxed">{err}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs leading-relaxed">
            <strong>System Advice:</strong> {analysis.summaryText}
          </div>
        </div>
      </div>
    </div>
  );
};

