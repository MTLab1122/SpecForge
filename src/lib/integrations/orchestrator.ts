import crypto from "node:crypto";
import type {
  InternalTask,
  IntegrationProvider,
  WebhookEventType
} from "../validations/delivery-handover";
import type {
  IntegrationAdapter,
  ConnectionHealthResult,
  TaskExportResult,
  AdapterConfig
} from "./adapter-interface";
import { GitHubIssuesAdapter } from "./adapters/github-adapter";
import { JiraCloudAdapter } from "./adapters/jira-adapter";
import { LinearAdapter } from "./adapters/linear-adapter";
import { TrelloAdapter } from "./adapters/trello-adapter";

export interface SyncLedgerEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  provider: IntegrationProvider;
  externalId: string;
  externalUrl?: string;
  syncStatus: "SUCCESS" | "FAILED" | "RETRYING";
  retryCount: number;
  lastError?: string;
  lastSyncAt: string;
  idempotencyKey: string;
}

export interface WebhookDeliveryEvent {
  id: string;
  eventType: WebhookEventType;
  timestamp: string;
  payload: Record<string, any>;
  signature: string;
}

export class DeliveryHandoverOrchestrator {
  private static adapters: Record<string, IntegrationAdapter> = {};

  public static registerAdapter(provider: string, adapter: IntegrationAdapter): void {
    this.adapters[provider] = adapter;
  }

  public static getAdapter(provider: string): IntegrationAdapter | undefined {
    return this.adapters[provider];
  }

  private static ensureDefaultAdapter(provider: IntegrationProvider): void {
    if (this.adapters[provider]) return;

    const adapters: Partial<Record<IntegrationProvider, IntegrationAdapter>> = {
      GITHUB: new GitHubIssuesAdapter(),
      JIRA: new JiraCloudAdapter(),
      LINEAR: new LinearAdapter(),
      TRELLO: new TrelloAdapter()
    };

    const adapter = adapters[provider];
    if (adapter) this.adapters[provider] = adapter;
  }

  /**
   * Retrieves connection health for all registered integrations.
   */
  public static async checkAllHealth(configs: Record<string, AdapterConfig>): Promise<ConnectionHealthResult[]> {
    const results: ConnectionHealthResult[] = [];

    for (const [provider, adapter] of Object.entries(this.adapters)) {
      const config = configs[provider] || {};
      const health = await adapter.testConnection(config);
      results.push(health);
    }

    return results;
  }

  /**
   * Exports approved tasks to the target external tool with explicit user confirmation and idempotency.
   */
  public static async exportApprovedTasks(params: {
    tasks: InternalTask[];
    provider: IntegrationProvider;
    config: AdapterConfig;
    confirmedByUser: boolean;
  }): Promise<{ success: boolean; results: TaskExportResult[]; error?: string }> {
    // NON-NEGOTIABLE PRINCIPLE: No external action occurs without explicit user approval
    if (!params.confirmedByUser) {
      return {
        success: false,
        results: [],
        error: "Action Blocked: Explicit user confirmation is required before exporting tasks to external tools."
      };
    }

    this.ensureDefaultAdapter(params.provider);
    const adapter = this.adapters[params.provider];
    if (!adapter) {
      return {
        success: false,
        results: [],
        error: `Unsupported integration provider: ${params.provider}`
      };
    }

    const results: TaskExportResult[] = [];
    for (const task of params.tasks) {
      const res = await adapter.exportTask(task, params.config);
      results.push(res);
    }

    const allSuccessful = results.every((r) => r.success);
    return {
      success: allSuccessful,
      results
    };
  }

  /**
   * Retries a failed task sync using the adapter.
   */
  public static async retryTaskSync(params: {
    task: InternalTask;
    provider: IntegrationProvider;
    config: AdapterConfig;
    confirmedByUser: boolean;
    currentRetryCount?: number;
  }): Promise<TaskExportResult> {
    if (!params.confirmedByUser) {
      throw new Error("Action Blocked: Explicit user confirmation required to retry external task export.");
    }

    const adapter = this.adapters[params.provider];
    if (!adapter) {
      throw new Error(`Unsupported integration provider: ${params.provider}`);
    }

    const nextAttempt = (params.currentRetryCount || 0) + 1;
    return adapter.retryExport(params.task, params.config, nextAttempt);
  }

  /**
   * Creates an HMAC SHA-256 signed webhook event for external systems.
   */
  public static createSignedWebhookEvent(params: {
    eventType: WebhookEventType;
    payload: Record<string, any>;
    secret: string;
  }): WebhookDeliveryEvent {
    const eventId = `evt_${crypto.randomBytes(12).toString("hex")}`;
    const timestamp = new Date().toISOString();

    const bodyString = JSON.stringify({
      id: eventId,
      event: params.eventType,
      timestamp,
      data: params.payload
    });

    const signature = crypto
      .createHmac("sha256", params.secret)
      .update(bodyString)
      .digest("hex");

    return {
      id: eventId,
      eventType: params.eventType,
      timestamp,
      payload: params.payload,
      signature: `sha256=${signature}`
    };
  }

  /**
   * Verifies an incoming webhook HMAC signature.
   */
  public static verifyWebhookSignature(payloadString: string, signatureHeader: string, secret: string): boolean {
    const expected = `sha256=${crypto.createHmac("sha256", secret).update(payloadString).digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  }
}
