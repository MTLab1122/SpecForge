import { AnalyticsEngine, TIME_SAVED_BENCHMARK } from "@/lib/analytics/analytics-engine";
import {
  DateRangeFilterSchema,
  UserAnalyticsResponseSchema,
  ProjectAnalyticsResponseSchema,
  AgencyAnalyticsResponseSchema,
  ScheduledReportCreateSchema,
  ExportReportRequestSchema
} from "@/lib/validations/analytics";

describe("Product and Business Analytics Unit Tests", () => {
  describe("1. Time Saved Benchmark & User KPI Calculations", () => {
    it("should calculate exact net hours saved based on the 18.0h per proposal benchmark", () => {
      expect(TIME_SAVED_BENCHMARK.briefExtractionHours).toBe(4.0);
      expect(TIME_SAVED_BENCHMARK.userStoryDraftingHours).toBe(6.0);
      expect(TIME_SAVED_BENCHMARK.estimationArithmeticHours).toBe(5.0);
      expect(TIME_SAVED_BENCHMARK.proposalFormattingHours).toBe(3.5);
      expect(TIME_SAVED_BENCHMARK.totalBaselineHoursPerProposal).toBe(18.5);
      expect(TIME_SAVED_BENCHMARK.specForgeAverageHoursPerProposal).toBe(0.5);
      expect(TIME_SAVED_BENCHMARK.netSavedHoursPerProposal).toBe(18.0);

      // 10 sent proposals should equate to 180 hours saved
      const userMetrics = AnalyticsEngine.calculateUserMetrics({
        userId: "usr-101",
        period: "30D",
        projectsCreated: 15,
        proposalsSent: 10,
        approvalsReceived: 8,
        estimatesCreated: 12,
        aiCreditsUsed: 5000
      });

      expect(userMetrics.timeSavedHours).toBe(180.0);
      expect(userMetrics.conversionRatePercent).toBe(80.0);
      expect(userMetrics.projectsCreated).toBe(15);
      expect(userMetrics.proposalsSent).toBe(10);
      expect(userMetrics.approvalsReceived).toBe(8);

      const parsed = UserAnalyticsResponseSchema.safeParse(userMetrics);
      expect(parsed.success).toBe(true);
    });

    it("should handle 0 sent proposals gracefully without division by zero", () => {
      const userMetrics = AnalyticsEngine.calculateUserMetrics({
        userId: "usr-102",
        projectsCreated: 2,
        proposalsSent: 0,
        approvalsReceived: 0,
        estimatesCreated: 1,
        aiCreditsUsed: 250
      });

      expect(userMetrics.timeSavedHours).toBe(0);
      expect(userMetrics.conversionRatePercent).toBe(0);
    });
  });

  describe("2. Project-Level Health & Turnaround Analytics", () => {
    it("should correctly compute estimate variance, approval turnaround velocity, and task progress", () => {
      const sentAt = "2026-10-10T10:00:00Z";
      const approvedAt = "2026-10-11T22:00:00Z"; // 36 hours later

      const projectMetrics = AnalyticsEngine.calculateProjectMetrics({
        projectId: "proj-99",
        projectTitle: "Healthcare Telemetry Portal",
        scopeCompletenessScore: 92,
        estimatedHours: 100,
        actualHours: 108, // +8% variance
        sentAt,
        approvedAt,
        changeRequests: [{ costImpact: 1500 }, { costImpact: 2500 }],
        completedTasksCount: 18,
        totalTasksCount: 20, // 90% progress
        invoicedAmount: 25000,
        paidAmount: 15000,
        currency: "USD"
      });

      expect(projectMetrics.scopeCompletenessScore).toBe(92);
      expect(projectMetrics.estimateAccuracyVariancePercent).toBe(8.0);
      expect(projectMetrics.approvalTurnaroundHours).toBe(36);
      expect(projectMetrics.changeRequestCount).toBe(2);
      expect(projectMetrics.changeRequestCostImpact).toBe(4000);
      expect(projectMetrics.deliveryProgressPercent).toBe(90);
      expect(projectMetrics.invoicedAmount).toBe(25000);
      expect(projectMetrics.paidAmount).toBe(15000);
      expect(projectMetrics.outstandingAmount).toBe(10000);

      const parsed = ProjectAnalyticsResponseSchema.safeParse(projectMetrics);
      expect(parsed.success).toBe(true);
    });
  });

  describe("3. Agency Financial Pipeline & Utilization Analytics", () => {
    it("should compute pipeline, receivables, capacity utilization, and realization rate", () => {
      const agencyMetrics = AnalyticsEngine.calculateAgencyMetrics({
        organizationId: "org-apex",
        period: "30D",
        activeClients: 5,
        activeProjects: 8,
        activeProposals: [
          { totalPrice: 15000, status: "SENT" },
          { totalPrice: 25000, status: "VIEWED" },
          { totalPrice: 30000, status: "DRAFT" } // Not in pipeline
        ],
        invoices: [
          { invoicedAmount: 20000, paidAmount: 20000 },
          { invoicedAmount: 15000, paidAmount: 5000 }
        ],
        totalBookedHours: 480,
        targetTeamCapacityHours: 600, // 80% utilization
        estimates: [{ estimatedProfitMargin: 40 }, { estimatedProfitMargin: 36 }],
        totalActualHoursLogged: 350
      });

      expect(agencyMetrics.revenuePipeline).toBe(40000); // 15k + 25k
      expect(agencyMetrics.outstandingReceivables).toBe(10000); // (20k + 15k) - (20k + 5k)
      expect(agencyMetrics.teamUtilizationPercent).toBe(80); // 480 / 600
      expect(agencyMetrics.averageProjectProfitMargin).toBe(38); // (40 + 36) / 2
      expect(agencyMetrics.blendedHourlyRealization).toBe(100); // 35000 invoiced / 350 logged hours

      const parsed = AgencyAnalyticsResponseSchema.safeParse(agencyMetrics);
      expect(parsed.success).toBe(true);
    });
  });

  describe("4. 8-Stage Funnel & Cohort Retention", () => {
    it("should compute all 8 sequential stages with valid conversions and dropoffs", () => {
      const funnel = AnalyticsEngine.calculateFunnelAnalysis({
        registration: 1000,
        onboarding: 800,
        firstProject: 600,
        firstAiGen: 500,
        firstEstimate: 400,
        firstProposal: 300,
        firstApproval: 200,
        firstPayment: 150
      });

      expect(funnel).toHaveLength(8);
      expect(funnel[0].stageKey).toBe("REGISTRATION");
      expect(funnel[0].userCount).toBe(1000);
      expect(funnel[0].conversionPercent).toBe(100);

      expect(funnel[7].stageKey).toBe("FIRST_PAYMENT");
      expect(funnel[7].userCount).toBe(150);
      expect(funnel[7].conversionPercent).toBe(15.0);

      // Verify each stage conversion is <= 100 and dropoff is >= 0
      for (const stage of funnel) {
        expect(stage.conversionPercent).toBeGreaterThanOrEqual(0);
        expect(stage.conversionPercent).toBeLessThanOrEqual(100);
        expect(stage.dropoffPercent).toBeGreaterThanOrEqual(0);
      }
    });

    it("should compute cohort retention matrix and WAU/MAU stickiness", () => {
      const cohortData = AnalyticsEngine.calculateCohortRetention();
      expect(cohortData.cohorts.length).toBeGreaterThan(0);
      expect(cohortData.wauMauRatio.wau).toBeGreaterThan(0);
      expect(cohortData.wauMauRatio.mau).toBeGreaterThan(0);
      expect(cohortData.wauMauRatio.stickinessPercent).toBeCloseTo(
        (cohortData.wauMauRatio.wau / cohortData.wauMauRatio.mau) * 100,
        1
      );
      expect(cohortData.featureAdoption["AI Scope Extraction"]).toBeDefined();
    });
  });

  describe("5. RFC 4180 CSV Serialization & Client Report Generation", () => {
    it("should correctly serialize CSV with special character escaping", () => {
      const headers = ["Project Name", "Client", "Scope Value"];
      const rows = [
        ['Portal, "Enterprise Edition"', 'Acme, Inc.', 45000],
        ['Simple App\nWith Newline', 'Standard Client', 12000]
      ];

      const csv = AnalyticsEngine.serializeToCsv(headers, rows);
      expect(csv).toContain('"Portal, ""Enterprise Edition"""');
      expect(csv).toContain('"Acme, Inc."');
      expect(csv).toContain('"Simple App\nWith Newline"');
    });

    it("should generate a client-ready executive summary markdown report", () => {
      const projectMetrics = AnalyticsEngine.calculateProjectMetrics({
        projectId: "proj-101",
        projectTitle: "Fintech Dashboard",
        scopeCompletenessScore: 95,
        estimatedHours: 80,
        actualHours: 80,
        sentAt: "2026-10-01T10:00:00Z",
        approvedAt: "2026-10-02T10:00:00Z",
        changeRequests: [],
        completedTasksCount: 16,
        totalTasksCount: 16,
        invoicedAmount: 18000,
        paidAmount: 18000,
        currency: "USD"
      });

      const report = AnalyticsEngine.generateClientReadyReport(projectMetrics);
      expect(report).toContain("Fintech Dashboard");
      expect(report).toContain("Scope Completeness Score:** 95%");
      expect(report).toContain("Delivery Progress:** 100%");
      expect(report).toContain("Outstanding Balance:** USD 0");
    });
  });

  describe("6. Scheduled Report Configuration Validation", () => {
    it("should validate valid scheduled report creation", () => {
      const validPayload = {
        reportType: "WEEKLY_EXECUTIVE",
        recipients: ["director@agency.com", "finance@agency.com"],
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1
      };

      const result = ScheduledReportCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject invalid email formats or empty recipients", () => {
      const invalidPayload = {
        reportType: "WEEKLY_EXECUTIVE",
        recipients: ["not-an-email"],
        format: "PDF",
        frequency: "WEEKLY",
        dayOfWeek: 1
      };

      const result = ScheduledReportCreateSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
