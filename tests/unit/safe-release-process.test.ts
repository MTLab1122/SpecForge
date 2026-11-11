import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  SafeReleaseManager,
  MigrationSafetyError,
  type DatabaseMigrationPlan,
  type ReleaseChecklist
} from "../../src/lib/reliability/safe-release-manager.ts";
import { FeatureFlagsEngine } from "../../src/lib/admin/feature-flags-engine.ts";
import { QualityGateRunner } from "../../src/lib/reliability/quality-gates.ts";

describe("Safe Release Process & Release Quality Gates Hardening Suite", () => {
  beforeEach(() => {
    SafeReleaseManager.clear();
    FeatureFlagsEngine.clear();
  });

  describe("1. Environment Strategy", () => {
    it("should provide isolated configurations for LOCAL, STAGING, and PRODUCTION", () => {
      const local = SafeReleaseManager.getEnvironmentConfig("LOCAL");
      const staging = SafeReleaseManager.getEnvironmentConfig("STAGING");
      const prod = SafeReleaseManager.getEnvironmentConfig("PRODUCTION");

      expect(local.mockIntegrations).toBe(true);
      expect(local.requireSignedCertificate).toBe(false);

      expect(staging.authEnforced).toBe(true);
      expect(staging.mockIntegrations).toBe(false);
      expect(staging.requireSignedCertificate).toBe(false);

      expect(prod.requireSignedCertificate).toBe(true);
      expect(prod.errorBudgetEnforced).toBe(true);
      expect(prod.rateLimitingActive).toBe(true);
    });
  });

  describe("2. 10-Stage CI/CD Pipeline Execution", () => {
    it("should execute all 10 stages successfully from LINT to PRODUCTION_DEPLOYMENT", async () => {
      const res = await SafeReleaseManager.runCiCdPipeline({
        commitSha: "a1b2c3d4e5f6",
        targetEnvironment: "PRODUCTION"
      });

      expect(res.success).toBe(true);
      expect(res.stages.length).toBe(10);
      expect(res.stages.every((s) => s.status === "PASSED")).toBe(true);
    });

    it("should immediately halt and block deployment if a stage fails", async () => {
      const res = await SafeReleaseManager.runCiCdPipeline({
        commitSha: "bad_commit_123",
        targetEnvironment: "PRODUCTION",
        simulateFailStage: "SECURITY_SCAN"
      });

      expect(res.success).toBe(false);
      expect(res.blockingFailureReason).toContain("SECURITY_SCAN");
      const secStage = res.stages.find((s) => s.stage === "SECURITY_SCAN");
      expect(secStage?.status).toBe("FAILED");
    });
  });

  describe("3. Database Migration Safety & Staging Pre-conditions", () => {
    it("should reject migrations not tested in staging", async () => {
      const plan: DatabaseMigrationPlan = {
        migrationId: "20261109_add_contract_fields",
        title: "Add Contract Fields",
        isBackwardCompatible: true,
        isDestructive: false,
        expandAndContractPhase: "EXPAND",
        stagingTested: false, // NOT tested in staging
        downMigrationScript: "ALTER TABLE scopes DROP COLUMN contract_terms;"
      };

      await expect(SafeReleaseManager.validateMigrationSafety(plan)).rejects.toThrow(
        MigrationSafetyError
      );
    });

    it("should reject migrations lacking a down-migration rollback script", async () => {
      const plan: DatabaseMigrationPlan = {
        migrationId: "20261109_add_contract_fields",
        title: "Add Contract Fields",
        isBackwardCompatible: true,
        isDestructive: false,
        expandAndContractPhase: "EXPAND",
        stagingTested: true,
        downMigrationScript: "" // Missing rollback script
      };

      await expect(SafeReleaseManager.validateMigrationSafety(plan)).rejects.toThrow(
        MigrationSafetyError
      );
    });

    it("should automatically create a pre-migration backup for destructive migrations", async () => {
      const plan: DatabaseMigrationPlan = {
        migrationId: "20261109_drop_legacy_deliverables",
        title: "Drop Legacy Deliverables Table",
        isBackwardCompatible: false,
        isDestructive: true,
        expandAndContractPhase: "CONTRACT",
        stagingTested: true,
        downMigrationScript: "CREATE TABLE legacy_deliverables (...);"
      };

      const res = await SafeReleaseManager.validateMigrationSafety(plan, "sre_lead");
      expect(res.approved).toBe(true);
      expect(res.preMigrationBackupId).toBeDefined();
      expect(res.preMigrationBackupId).toContain("snap_full_snapshot_");
    });
  });

  describe("4. Feature Flags & Emergency Kill Switch", () => {
    it("should support percentage rollout and tenant overrides", () => {
      FeatureFlagsEngine.setRolloutPercentage("multi_currency_rate_cards", 50);
      FeatureFlagsEngine.overrideWorkspace("multi_currency_rate_cards", "org_special", true);

      const evalSpecial = FeatureFlagsEngine.evaluate("multi_currency_rate_cards", {
        organizationId: "org_special",
        subscriptionTier: "AGENCY"
      });
      expect(evalSpecial.isEnabled).toBe(true);
      expect(evalSpecial.reason).toContain("Explicit organization override");
    });

    it("should instantly disable a risky flag via emergency kill switch", () => {
      FeatureFlagsEngine.killSwitch(
        "multi_currency_rate_cards",
        "Exchange rate API returning 502 Bad Gateway",
        "sre_lead"
      );

      const evalKilled = FeatureFlagsEngine.evaluate("multi_currency_rate_cards", {
        organizationId: "org_special",
        subscriptionTier: "AGENCY"
      });
      expect(evalKilled.isEnabled).toBe(false);
      expect(evalKilled.reason).toBe("Master flag is disabled");
    });
  });

  describe("5. 7-Point Release Checklist & Quality Gate", () => {
    it("should block deployment if any checklist item is incomplete", () => {
      const incompleteChecklist: ReleaseChecklist = {
        testsPassed: true,
        securityReviewPassed: true,
        migrationReviewed: true,
        rollbackPlanReady: false, // Incomplete!
        monitoringReady: true,
        alertsConfigured: true,
        stakeholdersInformed: true
      };

      const evalChecklist = SafeReleaseManager.evaluateReleaseChecklist({
        releaseVersion: "v3.0.0-rc1",
        checklist: incompleteChecklist
      });

      expect(evalChecklist.allCriteriaMet).toBe(false);
      expect(evalChecklist.unmetCriteria.length).toBe(1);

      const gate = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.0-rc1",
        allTestsPassed: true,
        releaseChecklist: incompleteChecklist
      });

      expect(gate.isApproved).toBe(false);
      expect(gate.blockReason).toContain("Release checklist incomplete");
    });

    it("should approve deployment and issue signed certificate when all checklist items pass", () => {
      const completeChecklist: ReleaseChecklist = {
        testsPassed: true,
        securityReviewPassed: true,
        migrationReviewed: true,
        rollbackPlanReady: true,
        monitoringReady: true,
        alertsConfigured: true,
        stakeholdersInformed: true
      };

      const gate = QualityGateRunner.evaluateReleaseReadiness({
        releaseVersion: "v3.0.0-prod",
        allTestsPassed: true,
        releaseChecklist: completeChecklist
      });

      expect(gate.isApproved).toBe(true);
      expect(gate.releaseCertificate).toBeDefined();
      expect(gate.releaseCertificate?.signature.length).toBe(64);
    });
  });

  describe("6. Multi-Tier Rollback Engine", () => {
    it("should execute Tier 1 (Feature Flag) rollback instantly", async () => {
      const res = await SafeReleaseManager.executeRollback({
        releaseVersion: "v3.0.0",
        rollbackTier: "FEATURE_FLAG",
        flagKey: "multi_currency_rate_cards",
        reason: "Calculated invoice rounding error",
        operatorUserId: "sre_marcus"
      });

      expect(res.success).toBe(true);
      expect(res.actionTaken).toContain("Tier 1: Feature flag");
    });

    it("should execute Tier 2 (Application Version) rollback and update status page", async () => {
      const res = await SafeReleaseManager.executeRollback({
        releaseVersion: "v3.0.0",
        rollbackTier: "APPLICATION_VERSION",
        reason: "Container memory leak detected on web worker",
        operatorUserId: "sre_marcus"
      });

      expect(res.success).toBe(true);
      expect(res.statusPageUpdated).toBe(true);
    });
  });
});

