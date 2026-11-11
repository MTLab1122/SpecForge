import {
  SloTracker,
  CRITICAL_JOURNEYS,
  CriticalJourneyKey
} from "@/lib/reliability/slo-tracker";

describe("SLO & Error Budget Target Suite", () => {
  beforeEach(() => {
    SloTracker.setReleaseFreezeOverride(null);
  });

  describe("1. 16 User-Facing Critical Journeys Coverage", () => {
    it("should define SLO targets for all 16 specified critical user journeys", () => {
      const expectedKeys: CriticalJourneyKey[] = [
        "REGISTER_AND_LOGIN",
        "CREATE_WORKSPACE",
        "CREATE_CLIENT_AND_PROJECT",
        "UPLOAD_OR_PASTE_BRIEF",
        "GENERATE_AI_REQUIREMENTS",
        "REVIEW_AND_APPROVE_AI_OUTPUT",
        "CREATE_SCOPE_VERSION",
        "CREATE_ESTIMATE",
        "GENERATE_AND_SEND_PROPOSAL",
        "CLIENT_APPROVAL",
        "GENERATE_TASKS",
        "EXPORT_TASKS",
        "CREATE_CHANGE_REQUEST",
        "APPROVE_CHANGE_REQUEST",
        "VIEW_DASHBOARD",
        "DOWNLOAD_EXPORT"
      ];

      expect(Object.keys(CRITICAL_JOURNEYS)).toHaveLength(16);

      expectedKeys.forEach((key) => {
        const def = CRITICAL_JOURNEYS[key];
        expect(def).toBeDefined();
        expect(def.journeyKey).toBe(key);
        expect(def.sloTargetPercent).toBeGreaterThanOrEqual(95.0);
        expect(def.primarySli).toBeDefined();
      });
    });

    it("should verify specific SLO targets match engineering baselines", () => {
      expect(CRITICAL_JOURNEYS.REGISTER_AND_LOGIN.sloTargetPercent).toBe(99.5);
      expect(CRITICAL_JOURNEYS.GENERATE_AI_REQUIREMENTS.sloTargetPercent).toBe(95.0); // 95% within 5 mins
      expect(CRITICAL_JOURNEYS.EXPORT_TASKS.sloTargetPercent).toBe(98.0); // 98% within 5 mins
      expect(CRITICAL_JOURNEYS.VIEW_DASHBOARD.latencyTargetMs).toBe(800); // p95 < 800ms
    });
  });

  describe("2. Error Budget Arithmetic & Exhaustion Policy", () => {
    it("should calculate 0.5% total monthly error budget for 99.5% SLO", () => {
      const budget = SloTracker.calculateErrorBudget({ customCoreAvailability: 99.7 });

      expect(budget.sloTargetPercent).toBe(99.5);
      expect(budget.totalMonthlyErrorBudgetPercent).toBe(0.5);

      // Downtime = 0.3%. 0.3 / 0.5 = 60% of budget consumed -> 40% remaining
      expect(budget.consumedBudgetPercent).toBe(60);
      expect(budget.remainingBudgetPercent).toBe(40);
      expect(budget.isExhausted).toBe(false);
      expect(budget.releaseGateStatus).toBe("RELEASES_ALLOWED");
    });

    it("should trigger release freeze when monthly error budget is exhausted", () => {
      // 99.4% actual availability is below 99.5% SLO -> budget exhausted
      const budget = SloTracker.calculateErrorBudget({ customCoreAvailability: 99.4 });

      expect(budget.consumedBudgetPercent).toBe(120);
      expect(budget.remainingBudgetPercent).toBe(0);
      expect(budget.isExhausted).toBe(true);
      expect(budget.releaseGateStatus).toBe("RELEASE_FREEZE_ACTIVE");
      expect(budget.activeAlerts.some((a) => a.title.includes("Budget Exhausted"))).toBe(true);
    });

    it("should trigger critical page alert when 1-hour burn rate exceeds 14.4x", () => {
      const budget = SloTracker.calculateErrorBudget({
        customCoreAvailability: 99.8,
        simulatedBurnRate1h: 15.2 // Exceeds 14.4x limit
      });

      expect(budget.releaseGateStatus).toBe("RELEASE_FREEZE_ACTIVE");
      const pageAlert = budget.activeAlerts.find((a) => a.severity === "PAGE_CRITICAL");
      expect(pageAlert).toBeDefined();
      expect(pageAlert?.title).toContain("14.4x Burn Rate Alert");
    });
  });

  describe("3. 20% Incident Error Budget Rule", () => {
    it("should mandate a blameless post-mortem for incidents consuming >= 20% of monthly budget", () => {
      // 216 minutes total monthly budget.
      // 45 minutes outage = 45 / 216 = 20.8% of budget
      const bigIncident = SloTracker.registerIncident({
        incidentId: "inc_gateway_timeout_01",
        title: "Database Read Replica Failover Outage",
        outageMinutes: 45,
        impactSeverityPercent: 100
      });

      expect(bigIncident.budgetConsumedPercent).toBe(20.8);
      expect(bigIncident.requiresPostMortem).toBe(true);
    });

    it("should not require post-mortem for minor incidents consuming < 20% of budget", () => {
      // 15 minutes outage = 15 / 216 = 6.9% of budget
      const minorIncident = SloTracker.registerIncident({
        incidentId: "inc_minor_webhook_lag",
        title: "Stripe Webhook Delivery Queue Backlog",
        outageMinutes: 15,
        impactSeverityPercent: 100
      });

      expect(minorIncident.budgetConsumedPercent).toBe(6.9);
      expect(minorIncident.requiresPostMortem).toBe(false);
    });
  });

  describe("4. Manual Release Freeze Override", () => {
    it("should allow SRE lead to manually freeze releases even with healthy budget", () => {
      SloTracker.setReleaseFreezeOverride(true);
      const budget = SloTracker.calculateErrorBudget({ customCoreAvailability: 99.9 });

      expect(budget.remainingBudgetPercent).toBe(80);
      expect(budget.releaseGateStatus).toBe("RELEASE_FREEZE_ACTIVE");
    });

    it("should restore automated gate when override is cleared", () => {
      SloTracker.setReleaseFreezeOverride(true);
      expect(SloTracker.calculateErrorBudget({ customCoreAvailability: 99.9 }).releaseGateStatus).toBe("RELEASE_FREEZE_ACTIVE");

      SloTracker.setReleaseFreezeOverride(null);
      expect(SloTracker.calculateErrorBudget({ customCoreAvailability: 99.9 }).releaseGateStatus).toBe("RELEASES_ALLOWED");
    });
  });
});
