import type {
  EstimateCategory,
  EstimateScenarioType,
  EstimateApprovalStatus,
  EstimateItemInput
} from "../validations/commercial-estimation";

export interface ScenarioParameters {
  type: EstimateScenarioType;
  multiplier: number;
  contingencyPercent: number;
  label: string;
  description: string;
}

export const SCENARIO_DEFAULTS: Record<EstimateScenarioType, ScenarioParameters> = {
  OPTIMISTIC: {
    type: "OPTIMISTIC",
    multiplier: 1.0,
    contingencyPercent: 5.0,
    label: "Optimistic (Lean Path)",
    description: "Assumes clear client specifications, zero technical debt, and zero rework cycles."
  },
  REALISTIC: {
    type: "REALISTIC",
    multiplier: 1.15,
    contingencyPercent: 15.0,
    label: "Realistic (Standard Delivery)",
    description: "Industry baseline accounting for code review iterations, edge cases, and client feedback."
  },
  CONSERVATIVE: {
    type: "CONSERVATIVE",
    multiplier: 1.35,
    contingencyPercent: 25.0,
    label: "Conservative (High-Defense / P90)",
    description: "Safeguards against legacy integrations, undefined 3rd-party APIs, and executive change requests."
  },
  CUSTOM: {
    type: "CUSTOM",
    multiplier: 1.2,
    contingencyPercent: 20.0,
    label: "Custom Scenario",
    description: "User-configured scenario multiplier and contingency buffer."
  }
};

export interface CategoryBreakdown {
  category: EstimateCategory;
  hours: number;
  cost: number;
  itemCount: number;
  percentageOfTotal: number;
}

export interface EstimateFinancialCalculation {
  scenario: ScenarioParameters;
  baseMinHours: number;
  baseMaxHours: number;
  scenarioAdjustedHours: number;
  p80EstimatedHours: number;
  contingencyHours: number;
  totalEstimatedHours: number;

  baseCost: number;
  contingencyCost: number;
  subtotalCost: number;

  discountAmount: number;
  minimumProjectFloorApplied: boolean;
  minimumProjectValue: number;
  taxRatePercent: number;
  taxAmount: number;
  taxIsInclusive: boolean;
  grandTotalCost: number;

  estimatedProfitMarginPercent: number;
  requiresManagerApproval: boolean;
  managerApprovalThreshold: number;

  breakdownByCategory: Record<EstimateCategory, CategoryBreakdown>;
}

export interface VarianceAnalysisResult {
  estimatedHours: number;
  actualHours: number;
  varianceHours: number;
  variancePercent: number;
  status: "ON_BUDGET" | "UNDER_BUDGET" | "OVER_BUDGET" | "CRITICAL_OVERRUN";
  roleVariance: Record<string, { estimated: number; actual: number; varianceHours: number; variancePercent: number }>;
  recurringErrors: string[];
  recommendedCalibrationMultiplier: number;
  summaryText: string;
}

export class CommercialEstimationEngine {
  /**
   * Calculates complete commercial estimate with 8-part breakdown, scenarios, rate card rules, and floor checks.
   */
  public static calculateEstimate(params: {
    items: EstimateItemInput[];
    scenarioType?: EstimateScenarioType;
    customMultiplier?: number;
    contingencyPercent?: number;
    taxRatePercent?: number;
    taxIsInclusive?: boolean;
    discountAmount?: number;
    minimumProjectValue?: number;
    managerApprovalThreshold?: number;
    targetMarginPercent?: number;
  }): EstimateFinancialCalculation {
    const scenarioType = params.scenarioType || "REALISTIC";
    const defaultScenario = SCENARIO_DEFAULTS[scenarioType];

    const multiplier =
      scenarioType === "CUSTOM" && params.customMultiplier !== undefined
        ? params.customMultiplier
        : defaultScenario.multiplier;

    const contingencyPercent =
      params.contingencyPercent !== undefined
        ? params.contingencyPercent
        : defaultScenario.contingencyPercent;

    const scenario: ScenarioParameters = {
      type: scenarioType,
      multiplier,
      contingencyPercent,
      label: defaultScenario.label,
      description: defaultScenario.description
    };

    const categories: EstimateCategory[] = [
      "FEATURE",
      "TASK",
      "DESIGN",
      "DEVELOPMENT",
      "QA",
      "DEPLOYMENT",
      "PROJECT_MANAGEMENT",
      "BUFFER"
    ];

    const breakdownMap: Record<EstimateCategory, { hours: number; cost: number; itemCount: number }> = {
      FEATURE: { hours: 0, cost: 0, itemCount: 0 },
      TASK: { hours: 0, cost: 0, itemCount: 0 },
      DESIGN: { hours: 0, cost: 0, itemCount: 0 },
      DEVELOPMENT: { hours: 0, cost: 0, itemCount: 0 },
      QA: { hours: 0, cost: 0, itemCount: 0 },
      DEPLOYMENT: { hours: 0, cost: 0, itemCount: 0 },
      PROJECT_MANAGEMENT: { hours: 0, cost: 0, itemCount: 0 },
      BUFFER: { hours: 0, cost: 0, itemCount: 0 }
    };

    let baseMinHours = 0;
    let baseMaxHours = 0;
    let baseCost = 0;

    // Aggregate items across 8 categories
    for (const item of params.items) {
      const cat = item.category || "DEVELOPMENT";
      const avgHours = (item.minHours + item.maxHours) / 2;
      const rate = item.hourlyRate || 100;
      const itemCost = avgHours * rate;

      baseMinHours += item.minHours;
      baseMaxHours += item.maxHours;
      baseCost += itemCost;

      if (breakdownMap[cat]) {
        breakdownMap[cat].hours += avgHours;
        breakdownMap[cat].cost += itemCost;
        breakdownMap[cat].itemCount += 1;
      }
    }

    // Apply Scenario Multiplier to hours
    const blendedBaseHours = (baseMinHours + baseMaxHours) / 2;
    const scenarioAdjustedHours = Number((blendedBaseHours * multiplier).toFixed(2));
    const p80EstimatedHours = Number((scenarioAdjustedHours * 1.1).toFixed(2));

    // Contingency buffer calculation
    const contingencyHours = Number((scenarioAdjustedHours * (contingencyPercent / 100)).toFixed(2));
    const totalEstimatedHours = Number((scenarioAdjustedHours + contingencyHours).toFixed(2));

    // Add buffer to category map
    const blendedRate = blendedBaseHours > 0 ? baseCost / blendedBaseHours : 100;
    const contingencyCost = Number((contingencyHours * blendedRate).toFixed(2));

    breakdownMap["BUFFER"].hours = contingencyHours;
    breakdownMap["BUFFER"].cost = contingencyCost;
    breakdownMap["BUFFER"].itemCount = contingencyHours > 0 ? 1 : 0;

    const subtotalCost = Number((baseCost * multiplier + contingencyCost).toFixed(2));

    // Discount handling
    const rawDiscount = params.discountAmount || 0;
    const discountAmount = Math.min(rawDiscount, subtotalCost);
    const postDiscountCost = Math.max(0, subtotalCost - discountAmount);

    // Minimum Project Floor Logic
    const minimumProjectValue = params.minimumProjectValue || 0;
    let floorAdjustedCost = postDiscountCost;
    let minimumProjectFloorApplied = false;

    if (minimumProjectValue > 0 && postDiscountCost < minimumProjectValue) {
      floorAdjustedCost = minimumProjectValue;
      minimumProjectFloorApplied = true;
    }

    // Tax Settings Logic
    const taxRatePercent = params.taxRatePercent || 0;
    const taxIsInclusive = Boolean(params.taxIsInclusive);
    let taxAmount = 0;
    let grandTotalCost = 0;

    if (taxRatePercent > 0) {
      if (taxIsInclusive) {
        taxAmount = Number((floorAdjustedCost * (taxRatePercent / (100 + taxRatePercent))).toFixed(2));
        grandTotalCost = Number(floorAdjustedCost.toFixed(2));
      } else {
        taxAmount = Number((floorAdjustedCost * (taxRatePercent / 100)).toFixed(2));
        grandTotalCost = Number((floorAdjustedCost + taxAmount).toFixed(2));
      }
    } else {
      grandTotalCost = Number(floorAdjustedCost.toFixed(2));
    }

    // Manager Approval Threshold Check
    const managerApprovalThreshold = params.managerApprovalThreshold || 10000;
    const requiresManagerApproval = grandTotalCost >= managerApprovalThreshold;

    // Projected Margin Calculation
    const targetMarginPercent = params.targetMarginPercent || 35.0;

    // Finalize percentage breakdown
    const breakdownByCategory: Record<EstimateCategory, CategoryBreakdown> = {} as any;
    for (const cat of categories) {
      const data = breakdownMap[cat];
      const hours = Number(data.hours.toFixed(2));
      const cost = Number(data.cost.toFixed(2));
      const percentageOfTotal =
        totalEstimatedHours > 0 ? Number(((hours / totalEstimatedHours) * 100).toFixed(1)) : 0;

      breakdownByCategory[cat] = {
        category: cat,
        hours,
        cost,
        itemCount: data.itemCount,
        percentageOfTotal
      };
    }

    return {
      scenario,
      baseMinHours: Number(baseMinHours.toFixed(2)),
      baseMaxHours: Number(baseMaxHours.toFixed(2)),
      scenarioAdjustedHours,
      p80EstimatedHours,
      contingencyHours,
      totalEstimatedHours,
      baseCost: Number(baseCost.toFixed(2)),
      contingencyCost,
      subtotalCost,
      discountAmount,
      minimumProjectFloorApplied,
      minimumProjectValue,
      taxRatePercent,
      taxAmount,
      taxIsInclusive,
      grandTotalCost,
      estimatedProfitMarginPercent: targetMarginPercent,
      requiresManagerApproval,
      managerApprovalThreshold,
      breakdownByCategory
    };
  }

  /**
   * Generates comparison across Optimistic, Realistic, and Conservative scenarios
   */
  public static compareScenarios(items: EstimateItemInput[], baseTaxRate = 0, discount = 0) {
    const optimistic = this.calculateEstimate({
      items,
      scenarioType: "OPTIMISTIC",
      taxRatePercent: baseTaxRate,
      discountAmount: discount
    });

    const realistic = this.calculateEstimate({
      items,
      scenarioType: "REALISTIC",
      taxRatePercent: baseTaxRate,
      discountAmount: discount
    });

    const conservative = this.calculateEstimate({
      items,
      scenarioType: "CONSERVATIVE",
      taxRatePercent: baseTaxRate,
      discountAmount: discount
    });

    return {
      optimistic,
      realistic,
      conservative,
      rangeSummary: {
        minHours: optimistic.totalEstimatedHours,
        maxHours: conservative.totalEstimatedHours,
        minCost: optimistic.grandTotalCost,
        maxCost: conservative.grandTotalCost,
        recommendedHours: realistic.totalEstimatedHours,
        recommendedCost: realistic.grandTotalCost
      }
    };
  }

  /**
   * Validates whether an approval transition is permitted according to RBAC and thresholds.
   */
  public static canApproveEstimate(params: {
    currentStatus: EstimateApprovalStatus;
    requestedAction: "SUBMIT_FOR_REVIEW" | "MANAGER_APPROVE" | "CLIENT_APPROVE" | "REJECT" | "REVISE";
    userRole: string; // 'OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'REVIEWER', 'CLIENT'
    grandTotalCost: number;
    managerApprovalThreshold: number;
  }): { allowed: boolean; reason?: string } {
    const { currentStatus, requestedAction, userRole, grandTotalCost, managerApprovalThreshold } = params;

    const isElevated = ["OWNER", "ADMIN", "MANAGER"].includes(userRole);
    const requiresManagerApproval = grandTotalCost >= managerApprovalThreshold;

    if (requestedAction === "SUBMIT_FOR_REVIEW") {
      if (currentStatus !== "DRAFT" && currentStatus !== "REJECTED" && currentStatus !== "REVISED") {
        return { allowed: false, reason: "Only draft, rejected, or revised estimates can be submitted for review." };
      }
      return { allowed: true };
    }

    if (requestedAction === "MANAGER_APPROVE") {
      if (currentStatus !== "INTERNAL_REVIEW") {
        return { allowed: false, reason: "Estimate must be in INTERNAL_REVIEW status to receive manager approval." };
      }
      if (!isElevated) {
        return { allowed: false, reason: "Only Organization Owner, Admin, or Manager can provide manager approval." };
      }
      return { allowed: true };
    }

    if (requestedAction === "CLIENT_APPROVE") {
      if (requiresManagerApproval && currentStatus !== "MANAGER_APPROVED") {
        return {
          allowed: false,
          reason: `Estimate exceeds the managerial threshold of $${managerApprovalThreshold.toLocaleString()} and requires Manager approval before client approval.`
        };
      }
      if (!["INTERNAL_REVIEW", "MANAGER_APPROVED"].includes(currentStatus)) {
        return { allowed: false, reason: "Estimate is not in an approvable state." };
      }
      return { allowed: true };
    }

    if (requestedAction === "REJECT") {
      if (currentStatus === "CLIENT_APPROVED") {
        return { allowed: false, reason: "Cannot reject an already client-approved estimate. Create a revision instead." };
      }
      return { allowed: true };
    }

    if (requestedAction === "REVISE") {
      return { allowed: true };
    }

    return { allowed: false, reason: "Unknown approval action." };
  }

  /**
   * Evaluates estimated vs actual effort variance and derives calibration recommendations.
   */
  public static analyzeAccuracy(params: {
    estimatedTotalHours: number;
    actualTotalHours: number;
    estimatedByRole?: Record<string, number>;
    actualByRole?: Record<string, number>;
  }): VarianceAnalysisResult {
    const { estimatedTotalHours, actualTotalHours, estimatedByRole = {}, actualByRole = {} } = params;

    const varianceHours = Number((actualTotalHours - estimatedTotalHours).toFixed(2));
    const variancePercent =
      estimatedTotalHours > 0
        ? Number((((actualTotalHours - estimatedTotalHours) / estimatedTotalHours) * 100).toFixed(2))
        : 0;

    let status: VarianceAnalysisResult["status"] = "ON_BUDGET";
    if (variancePercent > 25) {
      status = "CRITICAL_OVERRUN";
    } else if (variancePercent > 10) {
      status = "OVER_BUDGET";
    } else if (variancePercent < -15) {
      status = "UNDER_BUDGET";
    }

    // Role-level breakdown
    const allRoles = Array.from(new Set([...Object.keys(estimatedByRole), ...Object.keys(actualByRole)]));
    const roleVariance: Record<string, { estimated: number; actual: number; varianceHours: number; variancePercent: number }> = {};
    const recurringErrors: string[] = [];

    for (const role of allRoles) {
      const est = estimatedByRole[role] || 0;
      const act = actualByRole[role] || 0;
      const vHours = Number((act - est).toFixed(2));
      const vPercent = est > 0 ? Number((((act - est) / est) * 100).toFixed(1)) : 0;

      roleVariance[role] = {
        estimated: est,
        actual: act,
        varianceHours: vHours,
        variancePercent: vPercent
      };

      if (vPercent > 30 && est > 5) {
        recurringErrors.push(`Persistent underestimation in ${role} (+${vPercent}% actual variance)`);
      }
    }

    if (recurringErrors.length === 0) {
      if (variancePercent > 15) {
        recurringErrors.push("General scope creep or unestimated client change requests");
      } else if (variancePercent < -20) {
        recurringErrors.push("Excessive padding or overly defensive estimation assumptions");
      }
    }

    // Dynamic calibration multiplier for future proposals
    // Dampened formula: 1 + (variancePercent / 100) * 0.5 clamped between 0.85 and 1.50
    const rawMultiplier = 1.0 + (variancePercent / 100) * 0.5;
    const recommendedCalibrationMultiplier = Number(Math.min(1.5, Math.max(0.85, rawMultiplier)).toFixed(2));

    const summaryText =
      variancePercent > 0
        ? `Project exceeded initial estimate by ${varianceHours}h (+${variancePercent}%). Recommended multiplier for future estimates: ${recommendedCalibrationMultiplier}x.`
        : `Project completed within budget (${Math.abs(varianceHours)}h under estimate, ${variancePercent}%). Velocity is healthy.`;

    return {
      estimatedHours: estimatedTotalHours,
      actualHours: actualTotalHours,
      varianceHours,
      variancePercent,
      status,
      roleVariance,
      recurringErrors,
      recommendedCalibrationMultiplier,
      summaryText
    };
  }
}
