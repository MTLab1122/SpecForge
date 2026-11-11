import { DisasterRecoveryOrchestrator } from "@/lib/reliability/disaster-recovery";

describe("Phase 3.11 — Backup, Recovery & Disaster Readiness Suite", () => {
  beforeEach(() => {
    DisasterRecoveryOrchestrator.clear();
  });

  describe("1. Snapshot Creation & Cryptographic Checksums", () => {
    it("should create a FULL_SNAPSHOT with SHA-256 checksum and 30-day retention", async () => {
      const dataset = {
        projects: Array(15).fill({ name: "Demo Project" }),
        estimates: Array(25).fill({ totalUsd: 12000 })
      };

      const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
        backupType: "FULL_SNAPSHOT",
        dataset,
        retentionDays: 30
      });

      expect(snapshot.snapshotId).toContain("snap_full_snapshot_");
      expect(snapshot.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(snapshot.sizeBytes).toBeGreaterThan(0);
      expect(snapshot.retentionDays).toBe(30);
      expect(snapshot.status).toBe("COMPLETED");
    });

    it("should create a tenant-scoped TENANT_EXPORT", async () => {
      const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
        organizationId: "org_alpha",
        backupType: "TENANT_EXPORT",
        dataset: { scopes: [{ id: "s1" }] }
      });

      expect(snapshot.organizationId).toBe("org_alpha");
      expect(snapshot.backupType).toBe("TENANT_EXPORT");
    });
  });

  describe("2. Backup Integrity Verification & Anti-Tampering", () => {
    it("should successfully verify backup payload checksum and count records", async () => {
      const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
        dataset: {
          projects: [{ id: "p1" }, { id: "p2" }],
          tasks: [{ id: "t1" }, { id: "t2" }, { id: "t3" }]
        }
      });

      const verification = await DisasterRecoveryOrchestrator.verifyBackupIntegrity(snapshot.snapshotId);
      expect(verification.isValid).toBe(true);
      expect(verification.recordCounts.projects).toBe(2);
      expect(verification.recordCounts.tasks).toBe(3);
      expect(verification.computedChecksum).toBe(snapshot.checksumSha256);
    });

    it("should detect corrupted or tampered snapshots and fail verification", async () => {
      const snapshot = await DisasterRecoveryOrchestrator.createSnapshot({
        dataset: { financials: [{ amount: 50000 }] }
      });

      // Tamper snapshot data
      DisasterRecoveryOrchestrator.tamperSnapshotPayload(
        snapshot.snapshotId,
        JSON.stringify({ financials: [{ amount: 9999999 }] })
      );

      const verification = await DisasterRecoveryOrchestrator.verifyBackupIntegrity(snapshot.snapshotId);
      expect(verification.isValid).toBe(false);
      expect(verification.computedChecksum).not.toBe(snapshot.checksumSha256);
    });
  });

  describe("3. Retention Pruning & RTO/RPO Targets", () => {
    it("should prune expired snapshots according to retention window", async () => {
      const snap1 = await DisasterRecoveryOrchestrator.createSnapshot({
        dataset: { p: 1 },
        retentionDays: 10
      });

      const futureDate = new Date(Date.now() + 15 * 86400000); // 15 days later
      const prunedCount = DisasterRecoveryOrchestrator.pruneExpiredSnapshots(futureDate);

      expect(prunedCount).toBe(1);
      const remaining = DisasterRecoveryOrchestrator.listSnapshots();
      expect(remaining.length).toBe(0);
    });

    it("should enforce RTO of 4 hours and RPO of 15 minutes targets", () => {
      const objectives = DisasterRecoveryOrchestrator.getDisasterRecoveryObjectives();
      expect(objectives.rto.target).toBe("4 Hours");
      expect(objectives.rpo.target).toBe("15 Minutes");
      expect(objectives.primaryRegion).toContain("us-east-1");
      expect(objectives.backupRegion).toContain("us-west-2");
      expect(objectives.backupSchedule.retentionPolicy).toContain("30-day");
      expect(objectives.failoverProcedure.length).toBe(8);
      expect(objectives.customerCommunicationTemplates.disasterDeclared).toBeDefined();
    });
  });
});
