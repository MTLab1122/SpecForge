import type {
  InternalTask,
  IntegrationProvider,
  SyncStatus
} from "../validations/delivery-handover";

export interface ConnectionHealthResult {
  provider: IntegrationProvider;
  healthy: boolean;
  status: "HEALTHY" | "DEGRADED" | "ERROR" | "DISCONNECTED";
  accountName?: string;
  workspaceName?: string;
  latencyMs?: number;
  errorMessage?: string;
  checkedAt: string;
}

export interface TaskExportResult {
  taskId: string;
  provider: IntegrationProvider;
  success: boolean;
  externalId: string;
  externalUrl?: string;
  idempotencyKey: string;
  syncStatus: SyncStatus;
  errorMessage?: string;
  exportedAt: string;
}

export interface AdapterConfig {
  apiKey?: string;
  targetProjectOrList?: string;
  externalOrgId?: string;
  webhookUrl?: string;
  fieldMappings?: Record<string, any>;
}

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;

  /**
   * Evaluates authentication validity, permissions, and network latency.
   */
  testConnection(config: AdapterConfig): Promise<ConnectionHealthResult>;

  /**
   * Transforms an approved internal task and creates the external entity (Jira issue, Linear issue, etc.)
   */
  exportTask(task: InternalTask, config: AdapterConfig): Promise<TaskExportResult>;

  /**
   * Retries a previously failed task export with idempotency checks.
   */
  retryExport(task: InternalTask, config: AdapterConfig, attemptNumber?: number): Promise<TaskExportResult>;
}
