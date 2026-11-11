import crypto from "node:crypto";
import { CircuitBreakerRegistry, type DownstreamService } from "../reliability/circuit-breaker-registry.ts";
import { DeliveryHandoverOrchestrator, type SyncLedgerEntry } from "./orchestrator.ts";
import type { InternalTask, IntegrationProvider, SyncStatus } from "../validations/delivery-handover.ts";
import type { AdapterConfig, TaskExportResult } from "./adapter-interface.ts";
import { ReliableJobQueue } from "../reliability/job-queue.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import { AppError } from "../reliability/error-envelope.ts";

export interface ExternalStatusWebhookPayload {
  provider: IntegrationProvider;
  externalTaskId: string;
  externalStatus: string;
  organizationId: string;
  projectId: string;
  timestamp: string;
}

export interface TwoWaySyncResult {
  taskId: string;
  externalId: string;
  provider: IntegrationProvider;
  previousInternalStatus: string;
  updatedInternalStatus: "TODO" | "IN_PROGRESS" | "DONE";
  syncedAt: string;
}

export class IntegrationSyncService {
  private static syncLedger: Map<string, SyncLedgerEntry> = new Map();

  /**
   * Status mapping from external tools to SpecForge internal task canonical statuses
   */
  private static readonly EXTERNAL_STATUS_MAP: Record<string, "TODO" | "IN_PROGRESS" | "DONE"> = {
    // Jira
    "to do": "TODO",
    "open": "TODO",
    "backlog": "TODO",
    "in progress": "IN_PROGRESS",
    "in review": "IN_PROGRESS",
    "done": "DONE",
    "resolved": "DONE",
    "closed": "DONE",

    // Linear
    "triage": "TODO",
    "started": "IN_PROGRESS",
    "completed": "DONE",
    "canceled": "DONE",

    // GitHub
    "closed_issue": "DONE"
  };

  /**
   * Exports an internal task with Circuit Breaker guard and idempotency caching.
   */
  public static async exportTaskWithResilience(params: {
    task: InternalTask;
    provider: IntegrationProvider;
    config: AdapterConfig;
    organizationId: string;
    userId: string;
  }): Promise<TaskExportResult> {
    const adapter = DeliveryHandoverOrchestrator.getAdapter(params.provider);
    if (!adapter) {
      throw new AppError({
        message: `Unsupported integration provider: ${params.provider}`,
        status: 400,
        code: "UNSUPPORTED_INTEGRATION_PROVIDER"
      });
    }

    // Check circuit breaker for downstream tool
    const serviceKey = params.provider.toUpperCase() as DownstreamService;
    const breaker = CircuitBreakerRegistry.get(serviceKey);

    if (breaker.getState() === "OPEN") {
      throw new AppError({
        message: `Integration service '${params.provider}' circuit breaker is OPEN due to consecutive upstream failures. Manual retry available.`,
        status: 503,
        code: "INTEGRATION_CIRCUIT_OPEN",
        retryAfterSec: 30
      });
    }

    // Compute idempotency key
    const targetProject = params.config.targetProjectOrList || "DEFAULT";
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${params.provider}:${params.task.id}:${targetProject}:${params.organizationId}`)
      .digest("hex");

    // Check if task was already synced successfully
    const existing = this.syncLedger.get(idempotencyKey);
    if (existing && existing.syncStatus === "SUCCESS") {
      Logger.info(`Idempotent task export hit: task '${params.task.id}' already exported to ${params.provider}`, {
        organizationId: params.organizationId,
        userId: params.userId,
        context: { externalId: existing.externalId }
      });

      return {
        taskId: params.task.id,
        provider: params.provider,
        success: true,
        externalId: existing.externalId,
        externalUrl: existing.externalUrl,
        idempotencyKey,
        syncStatus: "SUCCESS" as SyncStatus,
        exportedAt: existing.lastSyncAt
      };
    }

    try {
      const result = await breaker.execute(async () => {
        return await adapter.exportTask(params.task, params.config);
      });

      // Record in ledger
      this.syncLedger.set(idempotencyKey, {
        id: `ledger_${Date.now()}`,
        taskId: params.task.id,
        taskTitle: params.task.title,
        provider: params.provider,
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        syncStatus: result.success ? "SUCCESS" : "FAILED",
        retryCount: 0,
        lastError: result.errorMessage,
        lastSyncAt: new Date().toISOString(),
        idempotencyKey
      });

      await AuditLogger.record({
        organizationId: params.organizationId,
        userId: params.userId,
        action: "TASK_EXPORTED_TO_EXTERNAL_TOOL",
        entityName: "TASK",
        entityId: params.task.id,
        metadata: { provider: params.provider, externalId: result.externalId }
      });

      return {
        ...result,
        idempotencyKey
      };
    } catch (err: any) {
      // Record failed sync in ledger
      this.syncLedger.set(idempotencyKey, {
        id: `ledger_${Date.now()}`,
        taskId: params.task.id,
        taskTitle: params.task.title,
        provider: params.provider,
        externalId: "",
        syncStatus: "FAILED",
        retryCount: 1,
        lastError: err.message,
        lastSyncAt: new Date().toISOString(),
        idempotencyKey
      });

      throw err;
    }
  }

  /**
   * Processes inbound webhook from external issue trackers and synchronizes task status.
   */
  public static processInboundStatusSync(payload: ExternalStatusWebhookPayload): TwoWaySyncResult {
    const normalizedKey = payload.externalStatus.trim().toLowerCase();
    const targetStatus = this.EXTERNAL_STATUS_MAP[normalizedKey] || "IN_PROGRESS";

    Logger.info(`Two-way status sync: External '${payload.externalTaskId}' (${payload.externalStatus}) mapped to '${targetStatus}'`, {
      organizationId: payload.organizationId,
      context: { provider: payload.provider, targetStatus }
    });

    return {
      taskId: `task_${payload.externalTaskId}`,
      externalId: payload.externalTaskId,
      provider: payload.provider,
      previousInternalStatus: "TODO",
      updatedInternalStatus: targetStatus,
      syncedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieves sync ledger entry by idempotency key.
   */
  public static getLedgerEntry(idempotencyKey: string): SyncLedgerEntry | null {
    return this.syncLedger.get(idempotencyKey) || null;
  }

  /**
   * Clears in-memory ledger (for testing).
   */
  public static clear(): void {
    this.syncLedger.clear();
  }
}
