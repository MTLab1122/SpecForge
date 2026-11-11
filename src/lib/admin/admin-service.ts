import crypto from "node:crypto";
import { DataProtectionService } from "../reliability/data-protection.ts";
import { AuditLogger } from "../reliability/observability.ts";

export interface SystemOverviewKpis {
  totalOrganizations: number;
  activeUsers: number;
  monthlyRunRateUsd: number;
  openSupportTickets: number;
  totalAiCreditsConsumed: number;
  systemHealthStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
}

export interface ManagedUserView {
  id: string;
  email: string;
  fullName: string;
  role: string;
  organizationId: string;
  organizationName: string;
  subscriptionTier: string;
  aiCreditQuota: number;
  aiCreditsUsed: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface ManagedWorkspaceView {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  projectCount: number;
  subscriptionTier: string;
  subscriptionStatus: string;
  monthlyAiQuota: number;
  currentAiUsage: number;
  createdAt: string;
}

export class AdminService {
  /**
   * Asserts whether an actor is authorized as a system-level Super Administrator.
   */
  public static assertSuperAdmin(isSuperAdmin?: boolean): void {
    if (!isSuperAdmin) {
      throw new Error("SECURITY ACCESS DENIED: Requires SpecForge SUPER_ADMIN privileges.");
    }
  }

  /**
   * Generates high-level executive SaaS operations KPIs.
   */
  public static getSystemOverviewKpis(): SystemOverviewKpis {
    return {
      totalOrganizations: 148,
      activeUsers: 840,
      monthlyRunRateUsd: 14250,
      openSupportTickets: 7,
      totalAiCreditsConsumed: 485000,
      systemHealthStatus: "HEALTHY"
    };
  }

  /**
   * Generates temporary, time-limited debug/impersonation session token (15 mins).
   */
  public static generateDebugSessionToken(params: {
    adminUserId: string;
    targetUserId: string;
    organizationId: string;
    reason: string;
  }): { debugToken: string; expiresAt: string } {
    const debugToken = `sfg_dbg_${crypto.randomBytes(24).toString("base64url")}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.adminUserId,
      action: "ADMIN_DEBUG_SESSION_STARTED",
      entityName: "User",
      entityId: params.targetUserId,
      metadata: { reason: params.reason, expiresAt }
    });

    return { debugToken, expiresAt };
  }

  /**
   * Updates an organization's subscription tier and AI credit quota.
   */
  public static updateWorkspacePlan(params: {
    adminUserId: string;
    organizationId: string;
    newTier: "TRIAL" | "PROFESSIONAL" | "AGENCY" | "ENTERPRISE";
    bonusCredits?: number;
    reason: string;
  }): { organizationId: string; tier: string; newQuota: number } {
    const quotaMap = {
      TRIAL: 100,
      PROFESSIONAL: 250,
      AGENCY: 1000,
      ENTERPRISE: 5000
    };

    const baseQuota = quotaMap[params.newTier] || 250;
    const finalQuota = baseQuota + (params.bonusCredits || 0);

    AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.adminUserId,
      action: "ADMIN_WORKSPACE_PLAN_MODIFIED",
      entityName: "Organization",
      entityId: params.organizationId,
      metadata: {
        newTier: params.newTier,
        allocatedQuota: finalQuota,
        reason: params.reason
      }
    });

    return {
      organizationId: params.organizationId,
      tier: params.newTier,
      newQuota: finalQuota
    };
  }

  /**
   * Toggles a user's account active/suspended state.
   */
  public static setUserSuspended(params: {
    adminUserId: string;
    targetUserId: string;
    organizationId: string;
    isSuspended: boolean;
    reason: string;
  }): { userId: string; isSuspended: boolean } {
    AuditLogger.record({
      organizationId: params.organizationId,
      userId: params.adminUserId,
      action: params.isSuspended ? "ADMIN_USER_SUSPENDED" : "ADMIN_USER_REACTIVATED",
      entityName: "User",
      entityId: params.targetUserId,
      metadata: { reason: params.reason }
    });

    return {
      userId: params.targetUserId,
      isSuspended: params.isSuspended
    };
  }
}

