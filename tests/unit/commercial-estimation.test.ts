import { CommercialEstimationEngine } from "@/lib/estimation/engine";
import { COMMERCIAL_ESTIMATE_TEMPLATES } from "@/lib/estimation/templates";
import { EstimateItemInput } from "@/lib/validations/commercial-estimation";

describe("Commercial Estimation Engine Unit Tests", () => {
  const sampleItems: EstimateItemInput[] = [
    {
      id: "item-design",
      category: "DESIGN",
      roleTitle: "Lead UI/UX Designer",
      hourlyRate: 100,
      title: "Design System & Wireframing",
      complexity: "MEDIUM",
      minHours: 20,
      maxHours: 20,
      manualOverride: false
    },
    {
      id: "item-dev",
      category: "DEVELOPMENT",
      roleTitle: "Senior Full Stack Dev",
      hourlyRate: 100,
      title: "Core Feature Engine",
      complexity: "HIGH",
      minHours: 60,
      maxHours: 60,
      manualOverride: false
    },
    {
      id: "item-qa",
      category: "QA",
      roleTitle: "QA Engineer",
      hourlyRate: 100,
      title: "Automated Regression Test Suite",
      complexity: "MEDIUM",
      minHours: 20,
      maxHours: 20,
      manualOverride: false
    }
  ];

  describe("1. Estimate Templates Library", () => {
    it("should provide exactly 6 industry commercial templates", () => {
      expect(COMMERCIAL_ESTIMATE_TEMPLATES.length).toBe(6);

      const expectedCategories = [
        "Fixed-Price Project",
        "Time-and-material project",
        "Retainer",
        "MVP",
        "Maintenance",
        "Discovery phase"
      ];

      const actualCategories = COMMERCIAL_ESTIMATE_TEMPLATES.map((t) => t.category);
      expectedCategories.forEach((cat) => {
        expect(actualCategories).toContain(cat);
      });
    });

    it("should contain robust assumptions, milestone invoicing schedules, and default items for each template", () => {
      COMMERCIAL_ESTIMATE_TEMPLATES.forEach((tpl) => {
        expect(tpl.defaultItems.length).toBeGreaterThanOrEqual(3);
        expect(tpl.standardAssumptions.length).toBeGreaterThanOrEqual(2);
        expect(tpl.invoicingSchedule.length).toBeGreaterThanOrEqual(1);
        expect(tpl.defaultContingencyPercent).toBeGreaterThanOrEqual(5);
        expect(tpl.typicalDurationWeeks).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("2. Estimation Engine Scenarios & 8-Part Breakdown", () => {
    it("should calculate Optimistic scenario with 1.0x velocity and 5% contingency buffer", () => {
      // 100 total base hours at $100/hr = $10,000 base cost
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "OPTIMISTIC"
      });

      expect(result.scenario.multiplier).toBe(1.0);
      expect(result.scenario.contingencyPercent).toBe(5.0);
      expect(result.scenarioAdjustedHours).toBe(100);
      expect(result.contingencyHours).toBe(5);
      expect(result.totalEstimatedHours).toBe(105);
      expect(result.subtotalCost).toBe(10500);
      expect(result.breakdownByCategory.BUFFER.hours).toBe(5);
    });

    it("should calculate Realistic scenario with 1.15x velocity and 15% contingency buffer", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "REALISTIC"
      });

      expect(result.scenario.multiplier).toBe(1.15);
      expect(result.scenario.contingencyPercent).toBe(15.0);
      expect(result.scenarioAdjustedHours).toBe(115);
      // 115 * 0.15 = 17.25h buffer
      expect(result.contingencyHours).toBe(17.25);
      expect(result.totalEstimatedHours).toBe(132.25);
      expect(result.subtotalCost).toBe(13225);
    });

    it("should calculate Conservative scenario with 1.35x velocity and 25% contingency buffer", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "CONSERVATIVE"
      });

      expect(result.scenario.multiplier).toBe(1.35);
      expect(result.scenario.contingencyPercent).toBe(25.0);
      expect(result.scenarioAdjustedHours).toBe(135);
      // 135 * 0.25 = 33.75h buffer
      expect(result.contingencyHours).toBe(33.75);
      expect(result.totalEstimatedHours).toBe(168.75);
      expect(result.subtotalCost).toBe(16875);
    });

    it("should support user-defined custom multipliers and contingency buffers", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "CUSTOM",
        customMultiplier: 1.25,
        contingencyPercent: 10.0
      });

      expect(result.scenario.multiplier).toBe(1.25);
      expect(result.scenarioAdjustedHours).toBe(125);
      // 125 * 0.10 = 12.5h buffer
      expect(result.contingencyHours).toBe(12.5);
      expect(result.totalEstimatedHours).toBe(137.5);
      expect(result.subtotalCost).toBe(13750);
    });
  });

  describe("3. Financial Math, Discounts, Taxes & Minimum Floor", () => {
    it("should deduct discounts from subtotal correctly", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "OPTIMISTIC",
        discountAmount: 1500
      });

      // Subtotal is $10,500; minus $1,500 discount = $9,000
      expect(result.discountAmount).toBe(1500);
      expect(result.grandTotalCost).toBe(9000);
    });

    it("should enforce minimum project floor if calculated price is lower", () => {
      const smallItem: EstimateItemInput[] = [
        {
          id: "small-1",
          category: "DEVELOPMENT",
          roleTitle: "Dev",
          hourlyRate: 100,
          title: "Quick Fix",
          complexity: "LOW",
          minHours: 5,
          maxHours: 5
        }
      ];

      const result = CommercialEstimationEngine.calculateEstimate({
        items: smallItem,
        scenarioType: "OPTIMISTIC",
        minimumProjectValue: 2500
      });

      // Raw cost is 5h * $100 = $500 + 5% buffer ($25) = $525. Floor of $2500 applies.
      expect(result.minimumProjectFloorApplied).toBe(true);
      expect(result.grandTotalCost).toBe(2500);
    });

    it("should calculate sales tax and VAT accurately", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "OPTIMISTIC", // Subtotal = $10,500
        taxRatePercent: 10.0,
        taxIsInclusive: false
      });

      // 10% exclusive tax on $10,500 = $1,050 -> Grand Total = $11,550
      expect(result.taxAmount).toBe(1050);
      expect(result.grandTotalCost).toBe(11550);
    });
  });

  describe("4. Estimate Approval Governance & Threshold Protection", () => {
    it("should flag requiresManagerApproval = true when total exceeds threshold", () => {
      const result = CommercialEstimationEngine.calculateEstimate({
        items: sampleItems,
        scenarioType: "REALISTIC", // Subtotal = $13,225
        managerApprovalThreshold: 10000
      });

      expect(result.requiresManagerApproval).toBe(true);
      expect(result.grandTotalCost).toBeGreaterThan(result.managerApprovalThreshold);
    });

    it("should prevent client approval if manager approval is required but not granted", () => {
      const check = CommercialEstimationEngine.canApproveEstimate({
        currentStatus: "INTERNAL_REVIEW",
        requestedAction: "CLIENT_APPROVE",
        userRole: "EDITOR",
        grandTotalCost: 15000,
        managerApprovalThreshold: 10000
      });

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("requires Manager approval before client approval");
    });

    it("should permit client approval after manager approval has been granted", () => {
      const check = CommercialEstimationEngine.canApproveEstimate({
        currentStatus: "MANAGER_APPROVED",
        requestedAction: "CLIENT_APPROVE",
        userRole: "CLIENT",
        grandTotalCost: 15000,
        managerApprovalThreshold: 10000
      });

      expect(check.allowed).toBe(true);
    });

    it("should prohibit regular editors from providing manager approval", () => {
      const check = CommercialEstimationEngine.canApproveEstimate({
        currentStatus: "INTERNAL_REVIEW",
        requestedAction: "MANAGER_APPROVE",
        userRole: "EDITOR",
        grandTotalCost: 15000,
        managerApprovalThreshold: 10000
      });

      expect(check.allowed).toBe(false);
      expect(check.reason).toContain("Only Organization Owner, Admin, or Manager");
    });

    it("should allow owners, admins, and managers to approve internally", () => {
      ["OWNER", "ADMIN", "MANAGER"].forEach((role) => {
        const check = CommercialEstimationEngine.canApproveEstimate({
          currentStatus: "INTERNAL_REVIEW",
          requestedAction: "MANAGER_APPROVE",
          userRole: role,
          grandTotalCost: 15000,
          managerApprovalThreshold: 10000
        });

        expect(check.allowed).toBe(true);
      });
    });
  });

  describe("5. Estimate Accuracy Feedback & Historical Calibration", () => {
    it("should identify overruns and detect recurring role-level estimation errors", () => {
      const feedback = CommercialEstimationEngine.analyzeAccuracy({
        estimatedTotalHours: 100,
        actualTotalHours: 135, // +35% overrun
        estimatedByRole: {
          "UI/UX Design": 20,
          "Frontend Dev": 40,
          "QA Engineering": 20,
          "DevOps": 20
        },
        actualByRole: {
          "UI/UX Design": 22,
          "Frontend Dev": 44,
          "QA Engineering": 38, // +90% overrun on QA
          "DevOps": 31
        }
      });

      expect(feedback.varianceHours).toBe(35);
      expect(feedback.variancePercent).toBe(35);
      expect(feedback.status).toBe("CRITICAL_OVERRUN");
      expect(feedback.recurringErrors.some((e) => e.includes("QA Engineering"))).toBe(true);
      // Calibration multiplier should be elevated above 1.0 to defend future estimates
      expect(feedback.recommendedCalibrationMultiplier).toBeGreaterThan(1.1);
    });

    it("should mark project as ON_BUDGET when effort variance is within tolerance", () => {
      const feedback = CommercialEstimationEngine.analyzeAccuracy({
        estimatedTotalHours: 100,
        actualTotalHours: 104 // +4% variance
      });

      expect(feedback.status).toBe("ON_BUDGET");
      expect(feedback.variancePercent).toBe(4);
      expect(feedback.recommendedCalibrationMultiplier).toBe(1.02);
    });

    it("should clamp calibration multiplier within safe boundaries [0.85x, 1.50x]", () => {
      // Extreme overrun scenario: 100h estimated vs 300h actual (+200%)
      const extremeOverrun = CommercialEstimationEngine.analyzeAccuracy({
        estimatedTotalHours: 100,
        actualTotalHours: 300
      });
      expect(extremeOverrun.recommendedCalibrationMultiplier).toBe(1.5);

      // Extreme under-run scenario: 100h estimated vs 20h actual (-80%)
      const extremeUnderrun = CommercialEstimationEngine.analyzeAccuracy({
        estimatedTotalHours: 100,
        actualTotalHours: 20
      });
      expect(extremeUnderrun.recommendedCalibrationMultiplier).toBe(0.85);
    });
  });
});

