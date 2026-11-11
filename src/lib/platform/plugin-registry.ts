/**
 * SpecForge Phase 5.1: Plugin Registry & Sandboxed Capability Engine
 * 
 * Provides:
 * 1. Declarative plugin manifests (capabilities, permissions, data requirements, UI slots, webhooks, rate limits)
 * 2. Sandboxed execution context enforcing strict tenant isolation and permission gating
 * 3. Field masking to prevent plugins from reading unauthorized or sensitive fields (tokens, margins, PII)
 * 4. Token-bucket rate limiting per workspace-plugin pair
 * 5. Comprehensive audit trail for plugin installations, lifecycle events, and API calls
 */

import crypto from "node:crypto";
import type { StandardDomainEventName } from "./event-bus.ts";
import { AppError } from "../reliability/error-envelope.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";

export type PluginCapability =
  | "REQUIREMENTS_ANALYSIS"
  | "ESTIMATE_EXPORT"
  | "COMMUNICATION_BRIDGE"
  | "CRM_SYNC"
  | "TASK_EXPORT"
  | "DOCUMENT_PARSING"
  | "CUSTOM_CALCULATOR";

export type PluginPermission =
  | "projects:read"
  | "projects:write"
  | "scopes:read"
  | "scopes:write"
  | "estimates:read"
  | "estimates:write"
  | "proposals:read"
  | "proposals:write"
  | "tasks:read"
  | "tasks:write"
  | "clients:read"
  | "webhooks:receive";

export type UIExtensionSlot =
  | "project.detail.actions"
  | "project.detail.tabs"
  | "scope.editor.toolbar"
  | "estimate.sidebar"
  | "proposal.preview.banner"
  | "workspace.settings.nav";

export interface UIExtensionPoint {
  id: string;
  slot: UIExtensionSlot;
  title: string;
  actionType: "button" | "modal" | "sidebar_panel" | "iframe_tab";
  targetRoute?: string;
  icon?: string;
}

export interface PluginDataRequirement {
  readableEntities: string[];
  writableEntities: string[];
  restrictedFields: string[]; // Fields that must be masked out before returning to plugin
}

export interface PluginRateLimit {
  requestsPerMinute: number;
  burstCapacity: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description: string;
  capabilities: PluginCapability[];
  permissions: PluginPermission[];
  dataRequirements: PluginDataRequirement;
  uiExtensionPoints: UIExtensionPoint[];
  webhookSubscriptions: StandardDomainEventName[];
  rateLimit: PluginRateLimit;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacePluginInstallation {
  installationId: string;
  workspaceId: string;
  pluginId: string;
  installedByUserId: string;
  installedAt: string;
  status: "ACTIVE" | "PAUSED" | "REVOKED";
  customConfig?: Record<string, any>;
  rateLimitTokens: number;
  lastTokenRefillAt: number;
}

export class PluginSecurityViolationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super({ message, status: 403, code: "PLUGIN_SECURITY_VIOLATION" });
  }
}

export class PluginRateLimitExceededError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super({ message, status: 429, code: "PLUGIN_RATE_LIMIT_EXCEEDED" });
  }
}

export class PluginRegistry {
  private static manifests: Map<string, PluginManifest> = new Map();
  private static installations: Map<string, WorkspacePluginInstallation> = new Map(); // `${workspaceId}:${pluginId}` -> record
  private static executionLogs: Array<{
    id: string;
    workspaceId: string;
    pluginId: string;
    action: string;
    timestamp: string;
    success: boolean;
    error?: string;
  }> = [];

  /**
   * Registers or updates a plugin manifest in the platform catalog.
   */
  public static registerPlugin(manifest: Omit<PluginManifest, "createdAt" | "updatedAt">): PluginManifest {
    const now = new Date().toISOString();
    const existing = this.manifests.get(manifest.id);

    const fullManifest: PluginManifest = {
      ...manifest,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    // Ensure restricted default sensitive fields are always protected
    const systemRestrictedFields = ["apiKey", "stripeSecretKey", "passwordHash", "internalMarginRate", "token"];
    for (const f of systemRestrictedFields) {
      if (!fullManifest.dataRequirements.restrictedFields.includes(f)) {
        fullManifest.dataRequirements.restrictedFields.push(f);
      }
    }

    this.manifests.set(manifest.id, fullManifest);
    Logger.info(`Plugin registered in catalog: ${fullManifest.name} (v${fullManifest.version})`, {
      context: { pluginId: fullManifest.id, capabilities: fullManifest.capabilities }
    });

    return fullManifest;
  }

  /**
   * Installs and enables a plugin for a specific workspace.
   */
  public static async installPlugin(options: {
    workspaceId: string;
    pluginId: string;
    userId: string;
    customConfig?: Record<string, any>;
  }): Promise<WorkspacePluginInstallation> {
    const manifest = this.manifests.get(options.pluginId);
    if (!manifest) {
      throw new AppError({ message: `Plugin '${options.pluginId}' not found in registry`, status: 404, code: "PLUGIN_NOT_FOUND" });
    }

    if (!manifest.isActive) {
      throw new AppError({ message: `Plugin '${options.pluginId}' is currently inactive or deprecated`, status: 400, code: "PLUGIN_INACTIVE" });
    }

    const key = `${options.workspaceId}:${options.pluginId}`;
    const installation: WorkspacePluginInstallation = {
      installationId: `pinst_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      workspaceId: options.workspaceId,
      pluginId: options.pluginId,
      installedByUserId: options.userId,
      installedAt: new Date().toISOString(),
      status: "ACTIVE",
      customConfig: options.customConfig,
      rateLimitTokens: manifest.rateLimit.burstCapacity,
      lastTokenRefillAt: Date.now()
    };

    this.installations.set(key, installation);

    await AuditLogger.record({
      organizationId: options.workspaceId,
      userId: options.userId,
      action: "PLUGIN_INSTALLED",
      entityName: "PLUGIN",
      entityId: options.pluginId,
      metadata: {
        pluginName: manifest.name,
        capabilities: manifest.capabilities,
        permissions: manifest.permissions
      }
    });

    return installation;
  }

  /**
   * Evaluates if a plugin is allowed to execute a specific action in a workspace,
   * enforcing tenant authorization, permissions, rate limits, and field masking.
   */
  public static authorizePluginAction(options: {
    workspaceId: string;
    pluginId: string;
    requiredPermission: PluginPermission;
    targetEntity?: string;
    actionType: "READ" | "WRITE";
  }): { allowed: boolean; manifest: PluginManifest; installation: WorkspacePluginInstallation } {
    const manifest = this.manifests.get(options.pluginId);
    if (!manifest) {
      throw new PluginSecurityViolationError(`Plugin '${options.pluginId}' does not exist.`);
    }

    const key = `${options.workspaceId}:${options.pluginId}`;
    const installation = this.installations.get(key);
    if (!installation || installation.status !== "ACTIVE") {
      throw new PluginSecurityViolationError(
        `Plugin '${manifest.name}' is not actively installed in workspace '${options.workspaceId}'.`,
        { workspaceId: options.workspaceId, pluginId: options.pluginId }
      );
    }

    // 1. Permission Check
    if (!manifest.permissions.includes(options.requiredPermission)) {
      throw new PluginSecurityViolationError(
        `Plugin '${manifest.name}' lacks required permission '${options.requiredPermission}'.`,
        {
          grantedPermissions: manifest.permissions,
          requiredPermission: options.requiredPermission
        }
      );
    }

    // 2. Entity Access Check
    if (options.targetEntity) {
      const allowedEntities =
        options.actionType === "READ"
          ? manifest.dataRequirements.readableEntities
          : manifest.dataRequirements.writableEntities;

      if (!allowedEntities.includes(options.targetEntity)) {
        throw new PluginSecurityViolationError(
          `Plugin '${manifest.name}' is not authorized to ${options.actionType} entity '${options.targetEntity}'.`,
          {
            targetEntity: options.targetEntity,
            allowedEntities
          }
        );
      }
    }

    // 3. Token Bucket Rate Limiting
    const now = Date.now();
    const elapsedMinutes = (now - installation.lastTokenRefillAt) / 60000;
    const tokensToAdd = elapsedMinutes * manifest.rateLimit.requestsPerMinute;

    installation.rateLimitTokens = Math.min(
      manifest.rateLimit.burstCapacity,
      installation.rateLimitTokens + tokensToAdd
    );
    installation.lastTokenRefillAt = now;

    if (installation.rateLimitTokens < 1) {
      throw new PluginRateLimitExceededError(
        `Rate limit exceeded for plugin '${manifest.name}' in workspace '${options.workspaceId}'. Limit: ${manifest.rateLimit.requestsPerMinute} req/min.`,
        { pluginId: options.pluginId, workspaceId: options.workspaceId }
      );
    }

    // Consume 1 token
    installation.rateLimitTokens -= 1;

    // Log Execution
    this.executionLogs.push({
      id: `plog_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
      workspaceId: options.workspaceId,
      pluginId: options.pluginId,
      action: `${options.actionType}:${options.requiredPermission}`,
      timestamp: new Date().toISOString(),
      success: true
    });

    return { allowed: true, manifest, installation };
  }

  /**
   * Sanitizes entity data before handing to plugin by masking restricted fields.
   */
  public static maskRestrictedFields<T extends Record<string, any>>(
    pluginId: string,
    data: T
  ): Partial<T> {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return {};

    const restricted = new Set(manifest.dataRequirements.restrictedFields);
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!restricted.has(key)) {
        sanitized[key] = value;
      }
    }

    return sanitized as Partial<T>;
  }

  /**
   * Retrieves UI extension points registered by active plugins in a workspace.
   */
  public static getActiveUIExtensionPoints(
    workspaceId: string,
    slot?: UIExtensionSlot
  ): Array<{ pluginId: string; pluginName: string; extension: UIExtensionPoint }> {
    const extensions: Array<{ pluginId: string; pluginName: string; extension: UIExtensionPoint }> = [];

    for (const [key, inst] of this.installations.entries()) {
      if (inst.workspaceId !== workspaceId || inst.status !== "ACTIVE") {
        continue;
      }

      const manifest = this.manifests.get(inst.pluginId);
      if (!manifest || !manifest.isActive) continue;

      for (const ext of manifest.uiExtensionPoints) {
        if (!slot || ext.slot === slot) {
          extensions.push({
            pluginId: manifest.id,
            pluginName: manifest.name,
            extension: ext
          });
        }
      }
    }

    return extensions;
  }

  /**
   * Lists plugins installed in a workspace.
   */
  public static listInstalledPlugins(workspaceId: string): Array<{
    manifest: PluginManifest;
    installation: WorkspacePluginInstallation;
  }> {
    const result = [];
    for (const inst of this.installations.values()) {
      if (inst.workspaceId === workspaceId) {
        const manifest = this.manifests.get(inst.pluginId);
        if (manifest) {
          result.push({ manifest, installation: inst });
        }
      }
    }
    return result;
  }

  /**
   * Lists all catalog manifests.
   */
  public static listCatalog(): PluginManifest[] {
    return Array.from(this.manifests.values());
  }

  public static clear(): void {
    this.manifests.clear();
    this.installations.clear();
    this.executionLogs = [];
  }
}

