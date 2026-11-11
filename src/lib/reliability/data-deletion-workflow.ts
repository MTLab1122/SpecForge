import crypto from "node:crypto";
import { AuditLogger, Logger } from "./observability.ts";
import { DataProtectionService } from "./data-protection.ts";

export class LegalHoldActiveError extends Error {
  public organizationId: string;
  public caseNumber: string;

  constructor(organizationId: string, caseNumber: string, reason: string) {
    super(
      `Compliance Violation: Permanent data deletion blocked. Workspace '${organizationId}' is under active legal hold (Case #${caseNumber}: ${reason}). Data destruction is strictly prohibited by regulatory and litigation preservation mandates.`
    );
    this.name = "LegalHoldActiveError";
    this.organizationId = organizationId;
    this.caseNumber = caseNumber;
  }
}

export interface LegalHoldRecord {
  organizationId: string;
  caseNumber: string;
  reason: string;
  placedByUserId: string;
  placedAt: string;
  active: boolean;
  releasedAt?: string;
  releasedByUserId?: string;
  approvalCode?: string;
}

export interface DeletionRequest {
  id: string;
  type: "USER_DELETION" | "WORKSPACE_DELETION";
  targetId: string; // userId or organizationId
  organizationId: string;
  requestedByUserId: string;
  requestedAt: string;
  gracePeriodDays: number;
  scheduledPurgeAt: string;
  status: "SOFT_DELETED" | "LEGAL_HOLD_BLOCKED" | "HARD_PURGED" | "RESTORED";
  legalHoldActive: boolean;
  anonymizedData?: Record<string, any>;
  auditChecksum: string;
}

export class DataDeletionManager {
  private static readonly GRACE_PERIOD_DAYS = 30;
  private static deletionRequests: Map<string, DeletionRequest> = new Map();
  private static legalHolds: Map<string, LegalHoldRecord> = new Map();

  // --------------------------------------------------------------------------
  // 1. LEGAL HOLD MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Places an organization under active legal hold, preventing hard purges.
   */
  public static async applyLegalHold(params: {
    organizationId: string;
    caseNumber: string;
    reason: string;
    placedByUserId: string;
  }): Promise<LegalHoldRecord> {
    const record: LegalHoldRecord = {
      organizationId: params.organizationId,
      caseNumber: params.caseNumber,
      reason: params.reason,
      placedByUserId: params.placedByUserId,
      placedAt: new Date().toISOString(),
      active: true
    };

    this.legalHolds.set(params.organizationId, record);

    // Update any pending workspace deletion requests
    const pending = Array.from(this.deletionRequests.values()).find(
      (r) => r.organizationId === params.organizationId && r.status === "SOFT_DELETED"
    );
    if (pending) {
      pending.legalHoldActive = true;
      pending.status = "LEGAL_HOLD_BLOCKED";
    }

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.placedByUserId,
      action: "LEGAL_HOLD_APPLIED",
      entityName: "WORKSPACE",
      entityId: params.organizationId,
      metadata: { caseNumber: params.caseNumber, reason: params.reason }
    });

    Logger.warn(
      `[LEGAL HOLD] Workspace '${params.organizationId}' placed on legal hold (Case: ${params.caseNumber})`,
      { organizationId: params.organizationId }
    );

    return record;
  }

  /**
   * Releases an active legal hold.
   */
  public static async releaseLegalHold(params: {
    organizationId: string;
    releasedByUserId: string;
    approvalCode: string;
  }): Promise<LegalHoldRecord> {
    const record = this.legalHolds.get(params.organizationId);
    if (!record || !record.active) {
      throw new Error(`No active legal hold found for workspace '${params.organizationId}'.`);
    }

    record.active = false;
    record.releasedAt = new Date().toISOString();
    record.releasedByUserId = params.releasedByUserId;
    record.approvalCode = params.approvalCode;

    // Restore pending deletion status if applicable
    const pending = Array.from(this.deletionRequests.values()).find(
      (r) => r.organizationId === params.organizationId && r.status === "LEGAL_HOLD_BLOCKED"
    );
    if (pending) {
      pending.legalHoldActive = false;
      pending.status = "SOFT_DELETED";
    }

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.releasedByUserId,
      action: "LEGAL_HOLD_RELEASED",
      entityName: "WORKSPACE",
      entityId: params.organizationId,
      metadata: { caseNumber: record.caseNumber, approvalCode: params.approvalCode }
    });

    Logger.info(`[LEGAL HOLD RELEASED] Legal hold on '${params.organizationId}' released by ${params.releasedByUserId}`, {
      organizationId: params.organizationId
    });

    return record;
  }

  /**
   * Checks whether a workspace is currently under legal hold.
   */
  public static isLegalHoldActive(organizationId: string): boolean {
    const hold = this.legalHolds.get(organizationId);
    return hold ? hold.active : false;
  }

  // --------------------------------------------------------------------------
  // 2. USER-INITIATED DELETION (GDPR ERASURE)
  // --------------------------------------------------------------------------

  /**
   * Executes user account deletion with GDPR personal data scrub.
   */
  public static async requestUserDeletion(params: {
    userId: string;
    organizationId: string;
    requestedByUserId: string;
  }): Promise<{ deletionId: string; anonymizedProfile: Record<string, any> }> {
    const deletionId = `del_${params.userId}_${Date.now()}`;
    const anonymizedProfile = DataProtectionService.anonymizeUserForDeletion(params.userId);

    const auditPayload = JSON.stringify({ userId: params.userId, anonymizedProfile });
    const auditChecksum = crypto.createHash("sha256").update(auditPayload).digest("hex");

    const req: DeletionRequest = {
      id: deletionId,
      type: "USER_DELETION",
      targetId: params.userId,
      organizationId: params.organizationId,
      requestedByUserId: params.requestedByUserId,
      requestedAt: new Date().toISOString(),
      gracePeriodDays: 0, // Users anonymized immediately
      scheduledPurgeAt: new Date().toISOString(),
      status: "HARD_PURGED",
      legalHoldActive: false,
      anonymizedData: anonymizedProfile,
      auditChecksum
    };

    this.deletionRequests.set(deletionId, req);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.requestedByUserId,
      action: "USER_ACCOUNT_DELETED",
      entityName: "USER",
      entityId: params.userId,
      metadata: { deletionId, auditChecksum }
    });

    Logger.info(`[GDPR DELETION] User '${params.userId}' anonymized and erased.`, {
      organizationId: params.organizationId,
      userId: params.userId
    });

    return { deletionId, anonymizedProfile };
  }

  // --------------------------------------------------------------------------
  // 3. WORKSPACE DELETION & 30-DAY GRACE RETENTION
  // --------------------------------------------------------------------------

  /**
   * Initiates workspace teardown with 30-day soft-delete grace window.
   */
  public static async requestWorkspaceDeletion(params: {
    organizationId: string;
    requestedByUserId: string;
  }): Promise<DeletionRequest> {
    const deletionId = `del_ws_${params.organizationId}_${Date.now()}`;
    const now = Date.now();
    const scheduledPurgeAt = new Date(now + this.GRACE_PERIOD_DAYS * 86400000).toISOString();
    const legalHoldActive = this.isLegalHoldActive(params.organizationId);

    const auditPayload = JSON.stringify({ organizationId: params.organizationId, scheduledPurgeAt });
    const auditChecksum = crypto.createHash("sha256").update(auditPayload).digest("hex");

    const req: DeletionRequest = {
      id: deletionId,
      type: "WORKSPACE_DELETION",
      targetId: params.organizationId,
      organizationId: params.organizationId,
      requestedByUserId: params.requestedByUserId,
      requestedAt: new Date().toISOString(),
      gracePeriodDays: this.GRACE_PERIOD_DAYS,
      scheduledPurgeAt,
      status: legalHoldActive ? "LEGAL_HOLD_BLOCKED" : "SOFT_DELETED",
      legalHoldActive,
      auditChecksum
    };

    this.deletionRequests.set(deletionId, req);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.requestedByUserId,
      action: "WORKSPACE_DELETION_REQUESTED",
      entityName: "WORKSPACE",
      entityId: params.organizationId,
      metadata: { deletionId, scheduledPurgeAt, legalHoldActive }
    });

    Logger.warn(
      `[WORKSPACE DELETION] Workspace '${params.organizationId}' soft-deleted (Purge scheduled: ${scheduledPurgeAt})`,
      { organizationId: params.organizationId }
    );

    return req;
  }

  /**
   * Restores a soft-deleted workspace within the 30-day grace period.
   */
  public static async restoreSoftDeletedWorkspace(params: {
    organizationId: string;
    restoredByUserId: string;
  }): Promise<DeletionRequest> {
    const req = Array.from(this.deletionRequests.values()).find(
      (r) => r.organizationId === params.organizationId && (r.status === "SOFT_DELETED" || r.status === "LEGAL_HOLD_BLOCKED")
    );

    if (!req) {
      throw new Error(`No soft-deleted request found for workspace '${params.organizationId}'.`);
    }

    req.status = "RESTORED";

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.restoredByUserId,
      action: "WORKSPACE_DELETION_CANCELLED",
      entityName: "WORKSPACE",
      entityId: params.organizationId,
      metadata: { deletionId: req.id }
    });

    Logger.info(`[WORKSPACE RESTORED] Workspace '${params.organizationId}' restored from soft-delete.`, {
      organizationId: params.organizationId
    });

    return req;
  }

  /**
   * Executes permanent hard purge of workspace data.
   * STRICTLY BLOCKED if workspace is under active legal hold!
   */
  public static async executeHardPurge(params: {
    organizationId: string;
    executedByUserId: string;
    overrideGracePeriod?: boolean;
  }): Promise<{ purged: boolean; organizationId: string; purgeTimestamp: string }> {
    // 1. NON-NEGOTIABLE LEGAL HOLD GUARD
    const hold = this.legalHolds.get(params.organizationId);
    if (hold && hold.active) {
      await AuditLogger.record({
        organizationId: params.organizationId,
        userId: params.executedByUserId,
        action: "HARD_PURGE_BLOCKED_BY_LEGAL_HOLD",
        entityName: "WORKSPACE",
        entityId: params.organizationId,
        metadata: { caseNumber: hold.caseNumber, reason: hold.reason }
      });

      throw new LegalHoldActiveError(params.organizationId, hold.caseNumber, hold.reason);
    }

    // 2. Find deletion request
    const req = Array.from(this.deletionRequests.values()).find(
      (r) => r.organizationId === params.organizationId && r.status === "SOFT_DELETED"
    );

    if (!req && !params.overrideGracePeriod) {
      throw new Error(`Cannot hard purge workspace '${params.organizationId}': Not in soft-deleted state.`);
    }

    // 3. Grace period verification
    if (req && !params.overrideGracePeriod) {
      const now = Date.now();
      const purgeTime = new Date(req.scheduledPurgeAt).getTime();
      if (now < purgeTime) {
        throw new Error(
          `Retention grace period in effect. Scheduled purge is ${req.scheduledPurgeAt}. Use overrideGracePeriod for administrative purge.`
        );
      }
    }

    if (req) {
      req.status = "HARD_PURGED";
    }

    const purgeTimestamp = new Date().toISOString();

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.executedByUserId,
      action: "WORKSPACE_HARD_PURGED",
      entityName: "WORKSPACE",
      entityId: params.organizationId,
      metadata: { purgeTimestamp, overrideGracePeriod: !!params.overrideGracePeriod }
    });

    Logger.warn(`[HARD PURGE COMPLETE] Workspace '${params.organizationId}' permanently erased.`, {
      organizationId: params.organizationId
    });

    return {
      purged: true,
      organizationId: params.organizationId,
      purgeTimestamp
    };
  }

  public static listDeletionRequests(): DeletionRequest[] {
    return Array.from(this.deletionRequests.values());
  }

  public static clear(): void {
    this.deletionRequests.clear();
    this.legalHolds.clear();
  }
}

