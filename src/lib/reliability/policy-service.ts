import type { NextRequest, NextResponse } from "next/server";
import {
  type OrgRole,
  type PermissionAction,
  hasPermission,
  PERMISSION_MATRIX
} from "../permissions/matrix.ts";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: OrgRole;
  isSuperAdmin?: boolean;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  securityViolation?: boolean;
}

export class PolicyService {
  /**
   * Centralized Policy Enforcement Point (PEP)
   * Enforces strict RBAC matrix and row-level tenant boundary.
   */
  public static authorize(params: {
    context: AuthContext;
    action: PermissionAction;
    resourceOrganizationId?: string | null;
  }): AuthorizationResult {
    const { context, action, resourceOrganizationId } = params;

    // 1. Strict Tenant Boundary Check
    if (
      resourceOrganizationId &&
      resourceOrganizationId !== context.organizationId &&
      !context.isSuperAdmin
    ) {
      return {
        allowed: false,
        reason: `Cross-tenant access forbidden. Resource belongs to '${resourceOrganizationId}', but session belongs to '${context.organizationId}'.`,
        securityViolation: true
      };
    }

    // 2. Role-Based Access Control Evaluation
    const isPermitted = hasPermission(context.role, action);
    if (!isPermitted) {
      return {
        allowed: false,
        reason: `Role '${context.role}' does not possess required permission '${action}'.`,
        securityViolation: false
      };
    }

    return { allowed: true };
  }

  /**
   * Throws an error or security violation exception if authorization fails.
   */
  public static assertAuthorization(params: {
    context: AuthContext;
    action: PermissionAction;
    resourceOrganizationId?: string | null;
  }): void {
    const result = this.authorize(params);
    if (!result.allowed) {
      const prefix = result.securityViolation ? "SECURITY INCIDENT [CROSS_TENANT]: " : "ACCESS FORBIDDEN: ";
      throw new Error(`${prefix}${result.reason}`);
    }
  }

  /**
   * Row-Level Tenant Isolation Query Scoper
   * Enforces that every Prisma database query predicate is strictly scoped by organizationId.
   */
  public static scopeQuery<T extends Record<string, any>>(
    organizationId: string,
    filter: T = {} as T
  ): T & { organizationId: string } {
    if (!organizationId || organizationId.trim().length === 0) {
      throw new Error("Critical Security Error: organizationId is required to scope database queries.");
    }
    return {
      ...filter,
      organizationId
    };
  }
}

/**
 * Higher-Order Function: API Route Authorization Guard
 * Wraps Next.js route handlers with tenant verification and RBAC checks.
 */
export function withAuthorization(
  action: PermissionAction,
  handler: (req: NextRequest, context: AuthContext, ...args: any[]) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const userId = req.headers.get("x-user-id");
      const organizationId = req.headers.get("x-organization-id");
      const role = (req.headers.get("x-user-role") || "VIEWER") as OrgRole;

      if (!userId || !organizationId) {
        return Response.json(
          {
            success: false,
            error: "Authentication required: Missing x-user-id or x-organization-id session headers."
          },
          { status: 401 }
        ) as unknown as NextResponse;
      }

      const authContext: AuthContext = {
        userId,
        organizationId,
        role
      };

      // Check URL search params or path for target tenant if any
      const targetOrg = req.nextUrl.searchParams.get("organizationId") || organizationId;

      const authResult = PolicyService.authorize({
        context: authContext,
        action,
        resourceOrganizationId: targetOrg
      });

      if (!authResult.allowed) {
        const statusCode = authResult.securityViolation ? 403 : 403;
        return Response.json(
          {
            success: false,
            error: authResult.reason,
            securityViolation: authResult.securityViolation ?? false
          },
          { status: statusCode }
        ) as unknown as NextResponse;
      }

      return await handler(req, authContext, ...args);
    } catch (error: any) {
      return Response.json(
        {
          success: false,
          error: error.message || "Internal authorization verification failed."
        },
        { status: 500 }
      ) as unknown as NextResponse;
    }
  };
}
