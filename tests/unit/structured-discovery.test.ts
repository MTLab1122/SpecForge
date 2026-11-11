import { DISCOVERY_TEMPLATES } from "@/lib/discovery/templates";
import { ScopeHealthScorer } from "@/lib/discovery/health-scorer";
import { ScopeComparator } from "@/lib/discovery/scope-comparator";

describe("Structured Discovery Workspace Unit Tests", () => {
  describe("1. Discovery Templates Library", () => {
    it("should provide exactly 9 complete industry discovery templates", () => {
      expect(DISCOVERY_TEMPLATES.length).toBe(9);

      const expectedCategories = [
        "Web Application",
        "Mobile Application",
        "E-commerce",
        "SaaS",
        "MVP",
        "Website Redesign",
        "Internal Tool",
        "Maintenance and Support",
        "Custom Software"
      ];

      const actualCategories = DISCOVERY_TEMPLATES.map((t) => t.category);
      expectedCategories.forEach((cat) => {
        expect(actualCategories).toContain(cat);
      });
    });

    it("should have complete questionnaires and sample flows for each template", () => {
      DISCOVERY_TEMPLATES.forEach((tpl) => {
        expect(tpl.questionnaireDefaults.businessGoal.length).toBeGreaterThan(15);
        expect(tpl.questionnaireDefaults.mustHaveFeatures.length).toBeGreaterThanOrEqual(2);
        expect(tpl.samplePersonas.length).toBeGreaterThanOrEqual(1);
        expect(tpl.sampleUserFlow.steps.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("2. Scope Health Scorer Engine", () => {
    it("should award Grade A to complete, conflict-free specifications", () => {
      const result = ScopeHealthScorer.calculate({
        questionnaireAnswersCount: 12,
        featuresCount: 8,
        userStoriesCount: 16,
        storiesWithCriteriaCount: 16,
        openConflictsCount: 0,
        totalAssumptionsCount: 3,
        confirmedAssumptionsCount: 3,
        hasTimelineAndBudget: true,
        hasMappedDependencies: true
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(85);
      expect(["A", "A+"]).toContain(result.grade);
      expect(result.actionableRecommendations.length).toBe(0);
    });

    it("should flag open conflicts and unconfirmed assumptions with recommendations", () => {
      const result = ScopeHealthScorer.calculate({
        questionnaireAnswersCount: 8,
        featuresCount: 4,
        userStoriesCount: 6,
        storiesWithCriteriaCount: 2,
        openConflictsCount: 2, // 2 open conflicts
        totalAssumptionsCount: 5,
        confirmedAssumptionsCount: 1, // 4 unconfirmed assumptions
        hasTimelineAndBudget: false,
        hasMappedDependencies: false
      });

      expect(result.overallScore).toBeLessThan(70);
      expect(["C", "D", "F"]).toContain(result.grade);
      expect(result.actionableRecommendations.length).toBeGreaterThan(0);
      expect(result.actionableRecommendations.some((r) => r.includes("conflicts"))).toBe(true);
      expect(result.actionableRecommendations.some((r) => r.includes("assumption"))).toBe(true);
    });
  });

  describe("3. Scope Comparator & Diff Impact Engine", () => {
    it("should compute net additions, removals, and cost/timeline delta", () => {
      const versionA = {
        versionNumber: 1,
        items: [
          { id: "feat_1", title: "Email Login", description: "Standard email password login", estimatedHours: 8 },
          { id: "feat_2", title: "Legacy Export", description: "Export to CSV format", estimatedHours: 6 }
        ],
        hourlyRate: 60,
        currency: "USD"
      };

      const versionB = {
        versionNumber: 2,
        items: [
          { id: "feat_1", title: "Email Login", description: "Standard email password login with 2FA OTP", estimatedHours: 14 }, // Modified +6 hrs
          { id: "feat_3", title: "Biometric FaceID", description: "FaceID mobile authentication", estimatedHours: 12 } // Added +12 hrs
          // feat_2 removed (-6 hrs)
        ],
        hourlyRate: 60,
        currency: "USD"
      };

      const diff = ScopeComparator.compare(versionA, versionB);

      expect(diff.addedItems.length).toBe(1);
      expect(diff.addedItems[0].title).toBe("Biometric FaceID");
      expect(diff.removedItems.length).toBe(1);
      expect(diff.removedItems[0].title).toBe("Legacy Export");
      expect(diff.modifiedItems.length).toBe(1);

      // Added (12) - Removed (6) + Modified (+6) = Net +12 hours
      expect(diff.impactSummary.netHoursDelta).toBe(12);
      expect(diff.impactSummary.netCostDelta).toBe(12 * 60); // $720
      expect(diff.impactSummary.timelineDaysDelta).toBe(2); // 12 / 6 = 2 days
    });
  });
});

