import { hasPermission } from "./matrix.ts";
import type { OrgRole, PermissionAction } from "./matrix.ts";
import { TenantIsolationError, ForbiddenError, UnauthorizedError } from "../reliability/error-envelope.ts";
import { AuditLogger, Logger } from "../reliability/observability.ts";

export interface UserAuthContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
  isSuperAdmin?: boolean;
  clientId?: string | null;
  clientProjectGrants?: string[]; // Project IDs explicitly shared with this client
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface ResourceDescriptor {
  resourceType:
    | "WORKSPACE"
    | "CLIENT"
    | "PROJECT"
    | "DOCUMENT"
    | "SCOPE"
    | "ESTIMATE"
    | "PROPOSAL"
    | "TASK"
    | "CHANGE_REQUEST"
    | "FINANCIAL"
    | "BILLING"
    | "INTEGRATION"
    | "AUDIT_LOG";
  resourceId: string;
  organizationId: string; // Tenant owning the resource
  clientId?: string | null; // For client-scoped resources
  isDeleted?: boolean;
  isArchived?: boolean;
}

export interface AuthorizationDecision {
  allowed: boolean;
  statusCode: 200 | 401 | 403;
  errorCode?: string;
  reason?: string;
  securityViolation?: boolean;
}

export class AuthorizationService {
  /**
   * Centralized Deny-By-Default Authorization Evaluator
   * Evaluates authentication, active role, tenant boundaries, resource lifecycles, and client barriers.
   */
  public static authorize(params: {
    context?: Partial<UserAuthContext> | null;
    action: PermissionAction;
    resource?: ResourceDescriptor | null;
  }): AuthorizationDecision {
    const { context, action, resource } = params;

    try {
      // 1. Authenticated User Check (Deny if missing or anonymous)
      if (!context || !context.userId || context.userId.trim().length === 0) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 401,
          errorCode: "UNAUTHENTICATED",
          reason: "Request lacks an authenticated user session."
        });
        return {
          allowed: false,
          statusCode: 401,
          errorCode: "UNAUTHENTICATED",
          reason: "Request lacks an authenticated user session."
        };
      }

      // 2. Active Tenant / Workspace Context Check (Deny if tenant context is missing)
      if (!context.organizationId || context.organizationId.trim().length === 0) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 403,
          errorCode: "MISSING_TENANT_CONTEXT",
          reason: "Active workspace context (x-organization-id) is required."
        });
        return {
          allowed: false,
          statusCode: 403,
          errorCode: "MISSING_TENANT_CONTEXT",
          reason: "Active workspace context (x-organization-id) is required."
        };
      }

      // 3. Valid Role Check (Deny if role is unknown or undefined)
      if (!context.role) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 403,
          errorCode: "UNKNOWN_ROLE",
          reason: "User has no active role in the requested workspace."
        });
        return {
          allowed: false,
          statusCode: 403,
          errorCode: "UNKNOWN_ROLE",
          reason: "User has no active role in the requested workspace."
        };
      }

      // 4. Strict Row-Level Tenant Isolation Boundary Check
      if (
        resource &&
        resource.organizationId &&
        resource.organizationId !== context.organizationId &&
        !context.isSuperAdmin
      ) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 403,
          errorCode: "CROSS_TENANT_ACCESS_FORBIDDEN",
          reason: `Cross-tenant access forbidden. Resource belongs to '${resource.organizationId}', session belongs to '${context.organizationId}'.`,
          securityViolation: true
        });
        return {
          allowed: false,
          statusCode: 403,
          errorCode: "CROSS_TENANT_ACCESS_FORBIDDEN",
          reason: `Cross-tenant access forbidden. Resource belongs to '${resource.organizationId}', session belongs to '${context.organizationId}'.`,
          securityViolation: true
        };
      }

      // 5. Resource Lifecycle State Check (Deny deleted or archived resources unless action is specifically restore)
      if (resource && (resource.isDeleted === true || resource.isArchived === true)) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 403,
          errorCode: "RESOURCE_DELETED_OR_ARCHIVED",
          reason: `Resource '${resource.resourceId}' is archived or deleted and cannot be mutated.`
        });
        return {
          allowed: false,
          statusCode: 403,
          errorCode: "RESOURCE_DELETED_OR_ARCHIVED",
          reason: `Resource '${resource.resourceId}' is archived or deleted and cannot be mutated.`
        };
      }

      // 6. Role Permission Matrix Evaluation (Deny by default unless explicitly granted)
      const isPermittedByRole = hasPermission(context.role, action);
      if (!isPermittedByRole) {
        this.logDecision({
          context,
          action,
          resource,
          allowed: false,
          statusCode: 403,
          errorCode: "ROLE_PERMISSION_DENIED",
          reason: `Role '${context.role}' does not possess required permission '${action}'.`
        });
        return {
          allowed: false,
          statusCode: 403,
          errorCode: "ROLE_PERMISSION_DENIED",
          reason: `Role '${context.role}' does not possess required permission '${action}'.`
        };
      }

      // 7. Secure Client Access Scoping & Commercial Data Barriers
      if (context.role === "CLIENT") {
        // Barrier A: Client cannot access another client's project
        if (
          resource &&
          resource.clientId &&
          context.clientId &&
          resource.clientId !== context.clientId
        ) {
          this.logDecision({
            context,
            action,
            resource,
            allowed: false,
            statusCode: 403,
            errorCode: "CROSS_CLIENT_ACCESS_DENIED",
            reason: "Client accounts cannot access resources belonging to another client organization.",
            securityViolation: true
          });
          return {
            allowed: false,
            statusCode: 403,
            errorCode: "CROSS_CLIENT_ACCESS_DENIED",
            reason: "Client accounts cannot access resources belonging to another client organization.",
            securityViolation: true
          };
        }

        // Barrier B: Client access must be restricted to explicitly shared projects
        if (resource && resource.resourceType === "PROJECT") {
          const grants = context.clientProjectGrants || [];
          if (!grants.includes(resource.resourceId)) {
            this.logDecision({
              context,
              action,
              resource,
              allowed: false,
              statusCode: 403,
              errorCode: "PROJECT_NOT_SHARED_WITH_CLIENT",
              reason: "This project has not been explicitly shared with your client account."
            });
            return {
              allowed: false,
              statusCode: 403,
              errorCode: "PROJECT_NOT_SHARED_WITH_CLIENT",
              reason: "This project has not been explicitly shared with your client account."
            };
          }
        }
      }

      // 8. Explicit ALLOW Decision
      this.logDecision({
        context,
        action,
        resource,
        allowed: true,
        statusCode: 200
      });

      return {
        allowed: true,
        statusCode: 200
      };
    } catch (evalError: any) {
      // 9. Fail-Closed Guarantee: Any internal failure in the authorization engine DENIES access
      Logger.error("[AUTH] Fatal error during authorization evaluation. Failing closed.", evalError);
      return {
        allowed: false,
        statusCode: 403,
        errorCode: "AUTHORIZATION_EVALUATION_FAILED",
        reason: "Authorization service encountered an unexpected error. Access denied by default."
      };
    }
  }

  /**
   * Asserts that authorization passes, throwing a standardized domain error on failure.
   */
  public static assertAuthorized(params: {
    context?: Partial<UserAuthContext> | null;
    action: PermissionAction;
    resource?: ResourceDescriptor | null;
  }): void {
    const decision = this.authorize(params);
    if (!decision.allowed) {
      if (decision.statusCode === 401) {
        throw new UnauthorizedError(decision.reason);
      }
      if (decision.securityViolation) {
        throw new TenantIsolationError(decision.reason);
      }
      throw new ForbiddenError(decision.reason);
    }
  }

  /**
   * Records structured audit log entry for every authorization decision.
   */
  private static logDecision(params: {
    context?: Partial<UserAuthContext> | null;
    action: PermissionAction;
    resource?: ResourceDescriptor | null;
    allowed: boolean;
    statusCode: number;
    errorCode?: string;
    reason?: string;
    securityViolation?: boolean;
  }): void {
    const { context, action, resource, allowed, statusCode, errorCode, reason, securityViolation } = params;

    const event = {
      organizationId: context?.organizationId || "unknown_tenant",
      userId: context?.userId || "anonymous",
      action: `AUTHZ_${action}_${allowed ? "ALLOWED" : "DENIED"}`,
      entityName: resource?.resourceType || "SYSTEM",
      entityId: resource?.resourceId || "global",
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
      metadata: {
        role: context?.role || "NONE",
        statusCode,
        errorCode,
        denialReason: reason,
        securityViolation: Boolean(securityViolation)
      }
    };

    AuditLogger.record(event).catch(() => {});

    if (!allowed && securityViolation) {
      Logger.warn(`[SECURITY] Cross-tenant violation attempted: ${reason}`, {
        organizationId: context?.organizationId,
        userId: context?.userId
      });
    }
  }
}
