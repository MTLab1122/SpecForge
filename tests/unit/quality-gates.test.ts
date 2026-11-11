import { QualityGateRunner } from "@/lib/reliability/quality-gates";
import { SloTracker } from "@/lib/reliability/slo-tracker";
import { AppError } from "@/lib/reliability/error-envelope";

describe("Phase 3.12 — Release Management & Quality Gates Suite", () => {
  beforeEach(() => {
    SloTracker.setReleaseFreezeOverride(null);
  });

  describe("1. Release Readiness Evaluation", () => {
    it("should approve release and issue cryptographically signed certificate when all gates pass", () => {
      const evaluation = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.0-prod",
        allTestsPassed: true,
        tenantIsolationAudited: true,
        phase2RegressionsZero: true,
        disasterRecoveryCompliant: true,
        circuitBreakersHealthy: true
      });

      expect(evaluation.isApproved).toBe(true);
      expect(evaluation.blockReason).toBeUndefined();
      expect(evaluation.releaseCertificate).toBeDefined();
      expect(evaluation.releaseCertificate?.version).toBe("v3.0.0-prod");
      expect(evaluation.releaseCertificate?.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should block release when automated tests have failed", () => {
      const evaluation = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.0-prod",
        allTestsPassed: false // Failed tests!
      });

      expect(evaluation.isApproved).toBe(false);
      expect(evaluation.blockReason).toContain("Zero test failures permitted");
      expect(evaluation.releaseCertificate).toBeUndefined();
    });

    it("should block release when production error budget has an active freeze", () => {
      // Simulate release freeze override active
      SloTracker.setReleaseFreezeOverride(true);

      const evaluation = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.0-prod",
        allTestsPassed: true
      });

      expect(evaluation.isApproved).toBe(false);
      expect(evaluation.blockReason).toContain("release freeze active");
    });

    it("should allow release when SRE explicitly overrides error budget freeze for hotfix", () => {
      SloTracker.setReleaseFreezeOverride(true); // Active freeze

      const evaluation = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.1-emergency-hotfix",
        allTestsPassed: true,
        overrideErrorBudgetFreeze: true // Emergency SRE bypass
      });

      expect(evaluation.isApproved).toBe(true);
      expect(evaluation.releaseCertificate).toBeDefined();
    });

    it("should throw 412 Precondition Failed when assertReleaseApproved is blocked", () => {
      expect(() => {
        QualityGateRunner.assertReleaseApproved({
          releaseVersion: "v3.0.0-prod",
          allTestsPassed: false
        });
      }).toThrow(AppError);
    });
  });
});
