import { describe, it, expect, beforeEach } from "@jest/globals";
import { DataDeletionManager, LegalHoldActiveError } from "../../src/lib/reliability/data-deletion-workflow.ts";
import { DisasterRecoveryOrchestrator, AuthorizationError } from "../../src/lib/reliability/disaster-recovery.ts";

describe("Data Deletion Workflow & Disaster Recovery Hardening Suite", () => {
  beforeEach(() => {
    DataDeletionManager.clear();
    DisasterRecoveryOrchestrator.clear();
  });

  describe("1. User-Initiated GDPR Deletion (Right to Be Forgotten)", () => {
    it("should anonymize personal credentials, email, and name immediately", async () => {
      const res = await DataDeletionManager.requestUserDeletion({
        userId: "usr_alice_123",
        organizationId: "org_alpha",
        requestedByUserId: "usr_alice_123"
      });

      expect(res.deletionId).toContain("del_usr_alice_123");
      expect(res.anonymizedProfile.email).toContain("@anonymized.specforge.internal");
      expect(res.anonymizedProfile.fullName).toBe("Anonymized Former User");
      expect(res.anonymizedProfile.passwordHash).toBe("DELETED_ACCOUNT_CREDENTIALS_PURGED");
      expect(res.anonymizedProfile.isDeleted).toBe(true);
    });
  });

  describe("2. Workspace Deletion & 30-Day Retention Grace Period", () => {
    it("should initiate workspace soft-delete with 30-day grace period", async () => {
      const req = await DataDeletionManager.requestWorkspaceDeletion({
        organizationId: "org_beta",
        requestedByUserId: "usr_admin_1"
      });

      expect(req.status).toBe("SOFT_DELETED");
      expect(req.gracePeriodDays).toBe(30);
      expect(req.scheduledPurgeAt).toBeDefined();

      const purgeDate = new Date(req.scheduledPurgeAt).getTime();
      const now = Date.now();
      expect(purgeDate - now).toBeGreaterThan(29 * 86400000);
    });

    it("should allow restoring a soft-deleted workspace within the grace period", async () => {
      await DataDeletionManager.requestWorkspaceDeletion({
        organizationId: "org_restore_me",
        requestedByUserId: "usr_admin_1"
      });

      const restored = await DataDeletionManager.restoreSoftDeletedWorkspace({
        organizationId: "org_restore_me",
        restoredByUserId: "usr_admin_1"
      });

      expect(restored.status).toBe("RESTORED");
    });
  });

  describe("3. Legal-Hold Exception & Hard-Purge Rejection", () => {
    it("should strictly reject hard-purge when an active legal hold is present", async () => {
      // 1. Place Legal Hold
      await DataDeletionManager.applyLegalHold({
        organizationId: "org_litigation_target",
        caseNumber: "CASE-2026-CV-9912",
        reason: "Active pending arbitration; retain all project scopes",
        placedByUserId: "legal_officer_dan"
      });

      expect(DataDeletionManager.isLegalHoldActive("org_litigation_target")).toBe(true);

      // 2. Request Workspace Deletion
      const req = await DataDeletionManager.requestWorkspaceDeletion({
        organizationId: "org_litigation_target",
        requestedByUserId: "rogue_admin"
      });
      expect(req.status).toBe("LEGAL_HOLD_BLOCKED");

      // 3. Attempt Hard Purge -> Must throw LegalHoldActiveError
      await expect(
        DataDeletionManager.executeHardPurge({
          organizationId: "org_litigation_target",
          executedByUserId: "rogue_admin",
          overrideGracePeriod: true
        })
      ).rejects.toThrow(LegalHoldActiveError);
    });

    it("should allow hard-purge only after legal hold is formally released with approval code", async () => {
      await DataDeletionManager.applyLegalHold({
        organizationId: "org_temp_hold",
        caseNumber: "CASE-101",
        reason: "Compliance audit",
        placedByUserId: "legal_officer_dan"
      });

      await DataDeletionManager.requestWorkspaceDeletion({
        organizationId: "org_temp_hold",
        requestedByUserId: "admin_1"
      });

      // Release hold
      await DataDeletionManager.releaseLegalHold({
        organizationId: "org_temp_hold",
        releasedByUserId: "legal_officer_dan",
        approvalCode: "RELEASE_AUTH_CODE_7719"
      });

      expect(DataDeletionManager.isLegalHoldActive("org_temp_hold")).toBe(false);

      // Hard purge now succeeds
      const purge = await DataDeletionManager.executeHardPurge({
        organizationId: "org_temp_hold",
        executedByUserId: "sre_operator",
        overrideGracePeriod: true
      });

      expect(purge.purged).toBe(true);
    });
  });

  describe("4. Backup Encryption & Operator Role Restriction", () => {
    it("should reject backup snapshot creation from unauthorized users", async () => {
      await expect(
        DisasterRecoveryOrchestrator.createSnapshot({
          dataset: { projects: [] },
          userRole: "CLIENT"
        })
      ).rejects.toThrow(AuthorizationError);
    });

    it("should allow backup snapshot creation for authorized operators and encrypt payload", async () => {
      const snap = await DisasterRecoveryOrchestrator.createSnapshot({
        dataset: { projects: [{ id: "p1", title: "Encrypted Project" }] },
        userRole: "SRE",
        operatorUserId: "sre_marcus"
      });

      expect(snap.isEncrypted).toBe(true);
      expect(snap.encryptionAlgorithm).toBe("AES-256-GCM");
      expect(snap.encryptionKeyId).toBeDefined();
    });

    it("should execute monthly restore drill into isolated sandbox and verify RTO", async () => {
      const drillResult = await DisasterRecoveryOrchestrator.runMonthlyRestoreTest({
        userRole: "PLATFORM_ADMIN",
        operatorUserId: "sre_sarah"
      });

      expect(drillResult.isValid).toBe(true);
      expect(drillResult.meetsRto).toBe(true);
      expect(drillResult.sandboxEnvironmentId).toContain("sandbox_restore_env_");
      expect(drillResult.applicationSmokeCheck.readPassed).toBe(true);
      expect(drillResult.applicationSmokeCheck.writePassed).toBe(true);
    });
  });
});

