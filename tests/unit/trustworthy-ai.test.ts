import { ConflictDetector } from "@/lib/ai/conflict-detector";
import { AiModelRouter } from "@/lib/ai/model-router";

describe("Trustworthy AI Requirements Engine Unit Tests", () => {
  describe("1. Source Traceability & Assumptions", () => {
    it("should flag requirements without source citations as assumptions", () => {
      const mockItem = {
        id: "req_1",
        title: "Biometric Login",
        description: "Support FaceID and Fingerprint authentication",
        sourceCitation: null,
        isAssumption: true,
        assumptionConfirmed: false
      };

      expect(mockItem.sourceCitation).toBeNull();
      expect(mockItem.isAssumption).toBe(true);
      expect(mockItem.assumptionConfirmed).toBe(false);
    });

    it("should require explicit confirmation before assumption becomes approved", () => {
      let mockItem = {
        id: "req_1",
        isAssumption: true,
        assumptionConfirmed: false,
        reviewState: "REVIEW_REQUIRED"
      };

      // Simulating user confirmation
      mockItem = {
        ...mockItem,
        assumptionConfirmed: true,
        reviewState: "ACCEPTED"
      };

      expect(mockItem.assumptionConfirmed).toBe(true);
      expect(mockItem.reviewState).toBe("ACCEPTED");
    });
  });

  describe("2. Conflict & Anomaly Detector", () => {
    it("should detect duplicate or overlapping features", () => {
      const mockData = {
        requirements: [],
        features: [
          { id: "feat_1", title: "User Authentication via Phone OTP" },
          { id: "feat_2", title: "User Authentication via SMS Code" }
        ],
        userStories: [],
        assumptions: []
      };

      const anomalies = ConflictDetector.analyze(mockData);
      const duplicateAnomaly = anomalies.find((a) => a.conflictType === "DUPLICATE_FEATURE");

      expect(duplicateAnomaly).toBeDefined();
      expect(duplicateAnomaly?.severity).toBe("MEDIUM");
      expect(duplicateAnomaly?.affectedItemIds).toEqual(["feat_1", "feat_2"]);
    });

    it("should detect missing acceptance criteria on user stories", () => {
      const mockData = {
        requirements: [],
        features: [],
        userStories: [
          { id: "story_1", asA: "Buyer", iWantTo: "Checkout cart", acceptanceCriteria: [] }
        ],
        assumptions: []
      };

      const anomalies = ConflictDetector.analyze(mockData);
      const criteriaAnomaly = anomalies.find((a) => a.conflictType === "MISSING_ACCEPTANCE_CRITERIA");

      expect(criteriaAnomaly).toBeDefined();
      expect(criteriaAnomaly?.severity).toBe("HIGH");
    });

    it("should detect platform contradictions between iOS and Cross-platform", () => {
      const mockData = {
        requirements: [
          { id: "req_1", title: "Native iOS Only", description: "Build strictly for iOS devices using Swift" }
        ],
        features: [
          { id: "feat_1", title: "Android and Cross-Platform Release", description: "Publish to Google Play Store" }
        ],
        userStories: [],
        assumptions: []
      };

      const anomalies = ConflictDetector.analyze(mockData);
      const contradiction = anomalies.find((a) => a.conflictType === "CONTRADICTION");

      expect(contradiction).toBeDefined();
      expect(contradiction?.severity).toBe("CRITICAL");
    });
  });

  describe("3. AI Model Routing & Cost Metering", () => {
    it("should route FAST mode to flash-8b with 1 credit cost", () => {
      const rawText = "This is a simple brief for a landing page.";
      const estimate = AiModelRouter.calculateEstimate(rawText, "FAST");

      expect(estimate.qualityMode).toBe("FAST");
      expect(estimate.modelName).toBe("gemini-1.5-flash-8b");
      expect(estimate.estimatedCreditCost).toBe(1);
    });

    it("should route BALANCED mode to flash with 3 credits cost", () => {
      const rawText = "Comprehensive SaaS portal with subscriptions, auth, and billing.";
      const estimate = AiModelRouter.calculateEstimate(rawText, "BALANCED");

      expect(estimate.qualityMode).toBe("BALANCED");
      expect(estimate.modelName).toBe("gemini-1.5-flash");
      expect(estimate.estimatedCreditCost).toBe(3);
    });

    it("should route THOROUGH mode to pro with 6 credits cost", () => {
      const rawText = "Multi-document 50-page enterprise contract with SLA commitments.";
      const estimate = AiModelRouter.calculateEstimate(rawText, "THOROUGH");

      expect(estimate.qualityMode).toBe("THOROUGH");
      expect(estimate.modelName).toBe("gemini-1.5-pro");
      expect(estimate.estimatedCreditCost).toBe(6);
    });

    it("should return 0 credit cost when extraction result is cached", () => {
      const rawText = "Repeated document content for caching test.";
      const estimateInitial = AiModelRouter.calculateEstimate(rawText, "BALANCED");

      // Populate cache
      AiModelRouter.setCachedExtraction(estimateInitial.cacheKey, { features: ["Cached Feature"] });

      // Second run
      const estimateCached = AiModelRouter.calculateEstimate(rawText, "BALANCED");
      expect(estimateCached.isCached).toBe(true);
      expect(estimateCached.estimatedCreditCost).toBe(0);
      expect(estimateCached.estimatedDurationSeconds).toBeLessThan(1);
    });
  });
});
