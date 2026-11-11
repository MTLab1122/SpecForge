import crypto from "node:crypto";
import { DataProtectionService, type EncryptedPayload } from "../reliability/data-protection.ts";
import { CircuitBreakerRegistry, type DownstreamService } from "../reliability/circuit-breaker-registry.ts";
import { AppError, TenantIsolationError } from "../reliability/error-envelope.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";
import type { IntegrationProvider } from "../validations/delivery-handover.ts";

export type { IntegrationProvider };

export interface ConnectionResult {
  connectionId: string;
  provider: IntegrationProvider;
  accountName: string;
  workspaceName?: string;
  scopes: string[];
  expiresAt?: string;
  connectedAt: string;
  status: "CONNECTED" | "ERROR";
}

export interface HealthStatus {
  healthy: boolean;
  status: "HEALTHY" | "DEGRADED" | "TOKEN_EXPIRED" | "PERMISSION_FAILED" | "RATE_LIMITED" | "DISCONNECTED";
  tokenExpiresAt?: string;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string;
  lastSuccessfulExport?: string;
  lastFailedExport?: string;
  retryCount: number;
  message: string;
  userFacingGuidance?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE" | "APPROVED";
  estimatedHours: number;
  isApproved?: boolean;
  acceptanceCriteria?: string[];
  assigneeEmail?: string;
  targetProjectOrList?: string;
}

export interface ExportResult {
  exportId: string;
  taskId: string;
  provider: IntegrationProvider;
  externalResourceId: string;
  externalUrl?: string;
  status: "SUCCESS" | "FAILED" | "ALREADY_EXPORTED";
  idempotencyKey: string;
  exportedAt: string;
  userFacingMessage?: string;
  errorMessage?: string;
}

export interface Connection {
  id: string;
  organizationId: string;
  provider: IntegrationProvider;
  accountName: string;
  workspaceName?: string;
  scopes: string[];
  encryptedToken: EncryptedPayload;
  refreshToken?: string;
  expiresAt?: Date | null;
  status: "CONNECTED" | "DISCONNECTED" | "TOKEN_EXPIRED" | "REVOKED";
  rateLimitRemaining: number;
  rateLimitResetAt?: Date | null;
  lastSuccessfulExport?: Date | null;
  lastFailedExport?: Date | null;
  retryCount: number;
  connectedAt: Date;
  updatedAt: Date;
}

export interface ConnectParams {
  organizationId: string;
  userId: string;
  provider: IntegrationProvider;
  token: string;
  scopes?: string[];
  targetProjectOrList?: string;
  workspaceName?: string;
  accountName?: string;
  expiresInSeconds?: number;
  simulateExpired?: boolean;
  simulateRateLimited?: boolean;
  simulatePermissionFailed?: boolean;
}

export interface ExportContext {
  organizationId: string;
  userId: string;
  targetProjectOrList?: string;
  idempotencyKey?: string;
}

export interface TaskExportMapping {
  id: string;
  taskId: string;
  organizationId: string;
  provider: IntegrationProvider;
  externalResourceId: string;
  externalUrl?: string;
  targetProjectOrList: string;
  status: "SUCCESS" | "FAILED";
  idempotencyKey: string;
  retryCount: number;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------------------
// 1. SCOPE RESTRICTION POLICY: Minimum Required Scopes & Prohibited Excessive Scopes
// ----------------------------------------------------------------------------

export const PERMITTED_SCOPES: Record<IntegrationProvider, string[]> = {
  JIRA: ["read:jira-work", "write:jira-work", "read:jira-user", "offline_access"],
  LINEAR: ["read", "issues:create", "comments:create", "offline_access"],
  TRELLO: ["read", "write", "account"],
  GITHUB: ["public_repo", "issues:write", "repo:status", "read:org"],
  NOTION: ["pages:write", "databases:write", "read_content"],
  SLACK: ["chat:write", "incoming-webhook", "channels:read"]
};

export const PROHIBITED_EXCESSIVE_SCOPES: Record<IntegrationProvider, string[]> = {
  JIRA: ["admin:jira", "delete:jira-work", "manage:jira-project", "delete"],
  LINEAR: ["admin", "delete", "write:workspace"],
  TRELLO: ["delete", "account:delete", "admin"],
  GITHUB: ["delete_repo", "admin:org", "repo", "admin:repo_hook", "delete"],
  NOTION: ["workspace:admin", "delete:all", "admin"],
  SLACK: ["admin", "admin.users:write", "delete"]
};

// ----------------------------------------------------------------------------
// 2. COMMON INTEGRATION ADAPTER INTERFACE
// ----------------------------------------------------------------------------

export interface IntegrationAdapter {
  readonly provider: IntegrationProvider;
  connect(params?: ConnectParams): Promise<ConnectionResult>;
  disconnect(connectionId?: string): Promise<void>;
  healthCheck(connectionId?: string): Promise<HealthStatus>;
  exportTask(task: Task, context?: ExportContext): Promise<ExportResult>;
  listConnections(organizationId?: string): Promise<Connection[]>;
}

// ----------------------------------------------------------------------------
// 3. SAFE INTEGRATION PLATFORM ENGINE
// ----------------------------------------------------------------------------

export class SafeIntegrationPlatform {
  private static connections: Map<string, Connection> = new Map(); // connectionId -> Connection
  private static taskMappings: Map<string, TaskExportMapping> = new Map(); // mappingKey -> TaskExportMapping
  private static adapters: Map<IntegrationProvider, IntegrationAdapter> = new Map();

  /**
   * Registers an adapter implementation.
   */
  public static registerAdapter(provider: IntegrationProvider, adapter: IntegrationAdapter): void {
    this.adapters.set(provider, adapter);
  }

  /**
   * Retrieves registered adapter.
   */
  public static getAdapter(provider: IntegrationProvider): IntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new AppError({
        message: `Unsupported integration provider: ${provider}`,
        status: 400,
        code: "UNSUPPORTED_INTEGRATION_PROVIDER"
      });
    }
    return adapter;
  }

  // --------------------------------------------------------------------------
  // CONNECTION LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Validates OAuth scopes against least privilege principles.
   * Throws 400 EXCESSIVE_SCOPES_PROHIBITED if destructive or unauthorized scopes are requested.
   */
  public static validateScopes(provider: IntegrationProvider, requestedScopes: string[]): void {
    const prohibited = PROHIBITED_EXCESSIVE_SCOPES[provider] || [];
    const permitted = new Set(PERMITTED_SCOPES[provider] || []);

    for (const scope of requestedScopes) {
      const normalized = scope.trim().toLowerCase();
      // Check prohibited list with exact match or explicit prefix
      const isProhibited = prohibited.some((p) => {
        const pLower = p.toLowerCase();
        if (normalized === pLower) return true;
        if (pLower.endsWith(":*") && normalized.startsWith(pLower.slice(0, -1))) return true;
        if (pLower === "delete" && (normalized.startsWith("delete:") || normalized.startsWith("delete_"))) return true;
        return false;
      });

      if (isProhibited) {
        throw new AppError({
          message: `Security Violation: Excessive or destructive OAuth scope '${scope}' is strictly prohibited for ${provider}. SpecForge adheres to the principle of least privilege and does not permit repository deletion, administrative controls, or record destruction.`,
          status: 400,
          code: "EXCESSIVE_SCOPES_PROHIBITED"
        });
      }

      // Check if scope is within permitted set
      if (!permitted.has(normalized)) {
        throw new AppError({
          message: `Security Violation: Unrecognized or non-minimal OAuth scope '${scope}' requested for ${provider}. Permitted scopes: [${Array.from(
            permitted
          ).join(", ")}].`,
          status: 400,
          code: "EXCESSIVE_SCOPES_PROHIBITED"
        });
      }
    }
  }

  /**
   * Connects and authorizes an external provider with scope validation and AES-256-GCM token encryption.
   */
  public static async connect(params: ConnectParams): Promise<ConnectionResult> {
    if (!params.organizationId || !params.userId) {
      throw new TenantIsolationError("Connecting integrations requires valid organizationId and userId context.");
    }

    if (!params.token || params.token.trim().length === 0) {
      throw new AppError({
        message: `A valid API token or OAuth bearer credential is required to connect ${params.provider}.`,
        status: 400,
        code: "MISSING_INTEGRATION_CREDENTIALS"
      });
    }

    const defaultScopes = PERMITTED_SCOPES[params.provider] || [];
    const scopes = params.scopes && params.scopes.length > 0 ? params.scopes : defaultScopes;

    // 1. Validate Scopes (Least Privilege Enforcement)
    this.validateScopes(params.provider, scopes);

    // 2. Encrypt Token at Rest using AES-256-GCM
    const encryptedToken = DataProtectionService.encryptField(params.token);

    // 3. Calculate Expiration
    const now = new Date();
    let expiresAt: Date | null = null;
    if (params.simulateExpired) {
      expiresAt = new Date(Date.now() - 3600 * 1000); // 1 hour in the past
    } else if (params.expiresInSeconds) {
      expiresAt = new Date(Date.now() + params.expiresInSeconds * 1000);
    } else {
      expiresAt = new Date(Date.now() + 90 * 24 * 3600 * 1000); // 90 days default
    }

    const connectionId = `conn_${params.provider.toLowerCase()}_${params.organizationId}`;
    const accountName = params.accountName || `${params.provider.toLowerCase()}-service-account@specforge.io`;
    const workspaceName = params.workspaceName || params.targetProjectOrList || "Default Workspace";

    const connection: Connection = {
      id: connectionId,
      organizationId: params.organizationId,
      provider: params.provider,
      accountName,
      workspaceName,
      scopes,
      encryptedToken,
      expiresAt,
      status: params.simulateExpired ? "TOKEN_EXPIRED" : "CONNECTED",
      rateLimitRemaining: params.simulateRateLimited ? 0 : 4950,
      rateLimitResetAt: params.simulateRateLimited ? new Date(Date.now() + 900_000) : null,
      retryCount: 0,
      connectedAt: now,
      updatedAt: now
    };

    this.connections.set(connectionId, connection);

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "INTEGRATION_CONNECTED",
      entityName: "INTEGRATION",
      entityId: connectionId,
      metadata: {
        provider: params.provider,
        accountName,
        workspaceName,
        scopes
      }
    });

    Logger.info(`Connected integration ${params.provider} for workspace '${params.organizationId}' (Account: ${accountName})`, {
      organizationId: params.organizationId
    });

    return {
      connectionId,
      provider: params.provider,
      accountName,
      workspaceName,
      scopes,
      expiresAt: expiresAt ? expiresAt.toISOString() : undefined,
      connectedAt: now.toISOString(),
      status: "CONNECTED"
    };
  }

  /**
   * Disconnects an integration, revoking credentials and marking connection status.
   */
  public static async disconnect(params: {
    connectionId: string;
    organizationId: string;
    userId: string;
  }): Promise<void> {
    const connection = this.connections.get(params.connectionId);
    if (!connection) {
      throw new AppError({
        message: `Connection '${params.connectionId}' not found.`,
        status: 404,
        code: "CONNECTION_NOT_FOUND"
      });
    }

    if (connection.organizationId !== params.organizationId) {
      throw new TenantIsolationError("Cross-tenant integration disconnection denied.");
    }

    connection.status = "DISCONNECTED";
    connection.updatedAt = new Date();

    await AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.userId,
      action: "INTEGRATION_DISCONNECTED",
      entityName: "INTEGRATION",
      entityId: connection.id,
      metadata: { provider: connection.provider }
    });

    Logger.info(`Disconnected integration ${connection.provider} (${connection.id}) for org '${params.organizationId}'`, {
      organizationId: params.organizationId
    });
  }

  /**
   * Reconnects an existing disconnected integration.
   */
  public static async reconnect(params: ConnectParams): Promise<ConnectionResult> {
    return await this.connect(params);
  }

  // --------------------------------------------------------------------------
  // HEALTH MONITORING
  // --------------------------------------------------------------------------

  /**
   * Inspects connection health, token expiry, rate limits, and export history.
   */
  public static async healthCheck(connectionId: string, organizationId?: string): Promise<HealthStatus> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return {
        healthy: false,
        status: "DISCONNECTED",
        retryCount: 0,
        message: `Integration is not connected.`,
        userFacingGuidance: "Please connect and authenticate this integration via Workspace Settings > Integrations."
      };
    }

    if (organizationId && connection.organizationId !== organizationId) {
      throw new TenantIsolationError("Cross-tenant integration health check forbidden.");
    }

    if (connection.status === "DISCONNECTED") {
      return {
        healthy: false,
        status: "DISCONNECTED",
        retryCount: connection.retryCount,
        message: `${connection.provider} integration is disconnected.`,
        userFacingGuidance: "Re-authenticate using your provider credentials to restore task exports."
      };
    }

    const now = new Date();

    // 1. Check Token Expiry
    if (connection.expiresAt && connection.expiresAt <= now) {
      connection.status = "TOKEN_EXPIRED";
      return {
        healthy: false,
        status: "TOKEN_EXPIRED",
        tokenExpiresAt: connection.expiresAt.toISOString(),
        retryCount: connection.retryCount,
        message: `Authentication token for ${connection.provider} has expired.`,
        userFacingGuidance: `Your ${connection.provider} OAuth token expired at ${connection.expiresAt.toLocaleTimeString()}. Please click 'Reconnect' to refresh credentials.`
      };
    }

    // 2. Check Rate Limits
    if (connection.rateLimitRemaining <= 0) {
      return {
        healthy: false,
        status: "RATE_LIMITED",
        rateLimitRemaining: 0,
        rateLimitResetAt: connection.rateLimitResetAt ? connection.rateLimitResetAt.toISOString() : undefined,
        retryCount: connection.retryCount,
        message: `API rate limit reached for ${connection.provider}.`,
        userFacingGuidance: `Rate limit quota exhausted. Upstream provider will reset at ${connection.rateLimitResetAt?.toLocaleTimeString() || "shortly"}. Task exports will resume automatically.`
      };
    }

    // 3. Check Circuit Breaker
    const serviceKey = connection.provider.toUpperCase() as DownstreamService;
    const breaker = CircuitBreakerRegistry.get(serviceKey);
    if (breaker && breaker.getState() === "OPEN") {
      return {
        healthy: false,
        status: "DEGRADED",
        retryCount: connection.retryCount,
        message: `Downstream ${connection.provider} service is experiencing high failure rates. Circuit breaker is open.`,
        userFacingGuidance: `${connection.provider} API is temporarily degraded. Automatic retries are queued with exponential backoff.`
      };
    }

    return {
      healthy: true,
      status: "HEALTHY",
      tokenExpiresAt: connection.expiresAt ? connection.expiresAt.toISOString() : undefined,
      rateLimitRemaining: connection.rateLimitRemaining,
      lastSuccessfulExport: connection.lastSuccessfulExport ? connection.lastSuccessfulExport.toISOString() : undefined,
      lastFailedExport: connection.lastFailedExport ? connection.lastFailedExport.toISOString() : undefined,
      retryCount: connection.retryCount,
      message: `${connection.provider} integration is connected and operational.`,
      userFacingGuidance: "Integration is healthy and ready to export approved tasks."
    };
  }

  // --------------------------------------------------------------------------
  // TASK EXPORT & IDEMPOTENCY
  // --------------------------------------------------------------------------

  /**
   * Exports an approved task to external tool with strict idempotency and mapping persistence.
   */
  public static async exportTask(
    provider: IntegrationProvider,
    task: Task,
    context: ExportContext
  ): Promise<ExportResult> {
    const connectionId = `conn_${provider.toLowerCase()}_${context.organizationId}`;
    const connection = this.connections.get(connectionId);

    if (!connection || connection.status === "DISCONNECTED") {
      throw new AppError({
        message: `Cannot export task: ${provider} integration is not connected for workspace '${context.organizationId}'.`,
        status: 400,
        code: "INTEGRATION_NOT_CONNECTED"
      });
    }

    // 1. APPROVAL GUARD (Non-negotiable acceptance criteria)
    const isApproved = task.isApproved === true || task.status === "APPROVED";
    if (!isApproved) {
      throw new AppError({
        message: `Task Approval Guard: Task '${task.id}' cannot be exported because it has not been approved. Client or manager approval of scope is required prior to external handover.`,
        status: 400,
        code: "UNAPPROVED_TASK_EXPORT_DENIED"
      });
    }

    // 2. HEALTH CHECK BEFORE EXPORT
    const health = await this.healthCheck(connectionId, context.organizationId);
    if (!health.healthy) {
      connection.lastFailedExport = new Date();
      connection.retryCount += 1;
      throw new AppError({
        message: `Export blocked: ${health.message} ${health.userFacingGuidance}`,
        status: health.status === "RATE_LIMITED" ? 429 : 503,
        code: `INTEGRATION_${health.status}`
      });
    }

    // 3. IDEMPOTENCY CHECK
    const targetProject = context.targetProjectOrList || task.targetProjectOrList || connection.workspaceName || "DEFAULT";
    const mappingKey = `${context.organizationId}:${provider}:${task.id}:${targetProject}`;
    const idempotencyKey =
      context.idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(mappingKey)
        .digest("hex");

    const existingMapping = this.taskMappings.get(mappingKey);
    if (existingMapping && existingMapping.status === "SUCCESS") {
      Logger.info(`Idempotent export hit: task '${task.id}' already exported to ${provider} (${existingMapping.externalResourceId})`, {
        organizationId: context.organizationId,
        userId: context.userId
      });

      return {
        exportId: existingMapping.id,
        taskId: task.id,
        provider,
        externalResourceId: existingMapping.externalResourceId,
        externalUrl: existingMapping.externalUrl,
        status: "ALREADY_EXPORTED",
        idempotencyKey,
        exportedAt: existingMapping.updatedAt.toISOString(),
        userFacingMessage: `Task has already been exported to ${provider} (${existingMapping.externalResourceId}). Re-export prevented to avoid duplicate external records.`
      };
    }

    // 4. GENERATE EXTERNAL RESOURCE ID ACCORDING TO PROVIDER
    const exportId = `exp_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const { externalResourceId, externalUrl } = this.generateExternalEntity(provider, targetProject, task.id);
    const now = new Date();

    const mapping: TaskExportMapping = {
      id: exportId,
      taskId: task.id,
      organizationId: context.organizationId,
      provider,
      externalResourceId,
      externalUrl,
      targetProjectOrList: targetProject,
      status: "SUCCESS",
      idempotencyKey,
      retryCount: existingMapping ? existingMapping.retryCount + 1 : 0,
      lastError: null,
      createdAt: existingMapping ? existingMapping.createdAt : now,
      updatedAt: now
    };

    this.taskMappings.set(mappingKey, mapping);

    connection.lastSuccessfulExport = now;
    connection.rateLimitRemaining = Math.max(0, connection.rateLimitRemaining - 1);
    connection.updatedAt = now;

    await AuditLogger.record({
      organizationId: context.organizationId,
      userId: context.userId,
      action: "TASK_EXPORTED_TO_EXTERNAL_TOOL",
      entityName: "TASK",
      entityId: task.id,
      metadata: {
        provider,
        externalResourceId,
        externalUrl,
        targetProject
      }
    });

    Logger.info(`Successfully exported task '${task.id}' to ${provider} -> '${externalResourceId}'`, {
      organizationId: context.organizationId,
      userId: context.userId
    });

    return {
      exportId,
      taskId: task.id,
      provider,
      externalResourceId,
      externalUrl,
      status: "SUCCESS",
      idempotencyKey,
      exportedAt: now.toISOString(),
      userFacingMessage: `Task '${task.title}' successfully exported to ${provider} as ${externalResourceId}.`
    };
  }

  /**
   * Retries a previously failed export.
   */
  public static async retryExport(params: {
    provider: IntegrationProvider;
    task: Task;
    context: ExportContext;
  }): Promise<ExportResult> {
    const targetProject = params.context.targetProjectOrList || params.task.targetProjectOrList || "DEFAULT";
    const mappingKey = `${params.context.organizationId}:${params.provider}:${params.task.id}:${targetProject}`;
    const existingMapping = this.taskMappings.get(mappingKey);

    if (existingMapping) {
      existingMapping.retryCount += 1;
      existingMapping.updatedAt = new Date();
    }

    return await this.exportTask(params.provider, params.task, params.context);
  }

  /**
   * Lists export history and mappings for an organization.
   */
  public static listExportHistory(organizationId: string, filter?: { provider?: IntegrationProvider; taskId?: string }): TaskExportMapping[] {
    return Array.from(this.taskMappings.values())
      .filter((m) => {
        if (m.organizationId !== organizationId) return false;
        if (filter?.provider && m.provider !== filter.provider) return false;
        if (filter?.taskId && m.taskId !== filter.taskId) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Lists connections for an organization.
   */
  public static listConnections(organizationId: string): Connection[] {
    return Array.from(this.connections.values())
      .filter((c) => c.organizationId === organizationId)
      .sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime());
  }

  /**
   * Helper to generate simulated external IDs and URLs.
   */
  private static generateExternalEntity(
    provider: IntegrationProvider,
    targetProject: string,
    taskId: string
  ): { externalResourceId: string; externalUrl: string } {
    const seed = Math.floor(100 + Math.random() * 900);

    switch (provider) {
      case "JIRA":
        return {
          externalResourceId: `${targetProject}-${seed}`,
          externalUrl: `https://${targetProject.toLowerCase()}.atlassian.net/browse/${targetProject}-${seed}`
        };
      case "LINEAR":
        return {
          externalResourceId: `LIN-${seed}`,
          externalUrl: `https://linear.app/specforge/issue/LIN-${seed}`
        };
      case "TRELLO":
        return {
          externalResourceId: `trello_card_${seed}_${taskId}`,
          externalUrl: `https://trello.com/c/${seed}`
        };
      case "GITHUB":
        return {
          externalResourceId: `#${seed}`,
          externalUrl: `https://github.com/${targetProject}/issues/${seed}`
        };
      case "NOTION":
        return {
          externalResourceId: `notion_page_${seed}`,
          externalUrl: `https://notion.so/specforge/${seed}`
        };
      case "SLACK":
        return {
          externalResourceId: `msg_${Date.now()}_${seed}`,
          externalUrl: `https://slack.com/archives/C012345/p${Date.now()}`
        };
    }
  }

  /**
   * Resets in-memory registries (for tests).
   */
  public static clear(): void {
    this.connections.clear();
    this.taskMappings.clear();
  }
}

// ----------------------------------------------------------------------------
// 4. CONCRETE SAFE ADAPTER IMPLEMENTATIONS FOR ALL 6 PROVIDERS
// ----------------------------------------------------------------------------

export class BaseSafeAdapter implements IntegrationAdapter {
  public readonly provider: IntegrationProvider;

  constructor(provider: IntegrationProvider) {
    this.provider = provider;
  }

  public async connect(params?: ConnectParams): Promise<ConnectionResult> {
    if (!params) {
      throw new Error("ConnectParams required to connect adapter.");
    }
    return await SafeIntegrationPlatform.connect({ ...params, provider: this.provider });
  }

  public async disconnect(connectionId?: string): Promise<void> {
    if (!connectionId) return;
    const conn = (SafeIntegrationPlatform as any).connections?.get(connectionId);
    if (conn) {
      await SafeIntegrationPlatform.disconnect({
        connectionId,
        organizationId: conn.organizationId,
        userId: "system"
      });
    }
  }

  public async healthCheck(connectionId?: string): Promise<HealthStatus> {
    if (!connectionId) {
      return {
        healthy: false,
        status: "DISCONNECTED",
        retryCount: 0,
        message: "No connection ID provided.",
        userFacingGuidance: "Please connect this integration first."
      };
    }
    return await SafeIntegrationPlatform.healthCheck(connectionId);
  }

  public async exportTask(task: Task, context?: ExportContext): Promise<ExportResult> {
    if (!context) throw new Error("ExportContext required to export task.");
    return await SafeIntegrationPlatform.exportTask(this.provider, task, context);
  }

  public async listConnections(organizationId?: string): Promise<Connection[]> {
    if (!organizationId) return [];
    return SafeIntegrationPlatform.listConnections(organizationId);
  }
}

export class SafeJiraAdapter extends BaseSafeAdapter {
  constructor() {
    super("JIRA");
  }
}

export class SafeLinearAdapter extends BaseSafeAdapter {
  constructor() {
    super("LINEAR");
  }
}

export class SafeTrelloAdapter extends BaseSafeAdapter {
  constructor() {
    super("TRELLO");
  }
}

export class SafeGitHubAdapter extends BaseSafeAdapter {
  constructor() {
    super("GITHUB");
  }
}

export class SafeNotionAdapter extends BaseSafeAdapter {
  constructor() {
    super("NOTION");
  }
}

export class SafeSlackAdapter extends BaseSafeAdapter {
  constructor() {
    super("SLACK");
  }
}

// Register all 6 adapters into platform by default
SafeIntegrationPlatform.registerAdapter("JIRA", new SafeJiraAdapter());
SafeIntegrationPlatform.registerAdapter("LINEAR", new SafeLinearAdapter());
SafeIntegrationPlatform.registerAdapter("TRELLO", new SafeTrelloAdapter());
SafeIntegrationPlatform.registerAdapter("GITHUB", new SafeGitHubAdapter());
SafeIntegrationPlatform.registerAdapter("NOTION", new SafeNotionAdapter());
SafeIntegrationPlatform.registerAdapter("SLACK", new SafeSlackAdapter());
