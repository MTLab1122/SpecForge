import { hasPermission, assertPermission } from "@/lib/permissions/matrix";
import type { OrgRole, PermissionAction } from "@/lib/permissions/matrix";
import { AuthorizationService } from "@/lib/permissions/authorization-service";
import type { UserAuthContext, ResourceDescriptor } from "@/lib/permissions/authorization-service";
import { AuditLogger } from "@/lib/reliability/observability";

describe("Deny-by-Default Authorization & Resource-Level Security Suite", () => {
  beforeEach(() => {
    AuditLogger.clear();
  });

  describe("1. Deny-by-Default Core Invariant", () => {
    it("should strictly deny access when user is unauthenticated (missing userId)", () => {
      const decision = AuthorizationService.authorize({
        context: null,
        action: "CREATE_PROJECT"
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(401);
      expect(decision.errorCode).toBe("UNAUTHENTICATED");
    });

    it("should strictly deny access when workspace context (organizationId) is missing", () => {
      const decision = AuthorizationService.authorize({
        context: { userId: "usr_1", organizationId: "", role: "ADMIN" },
        action: "CREATE_PROJECT"
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("MISSING_TENANT_CONTEXT");
    });

    it("should strictly deny access when role is unknown, empty, or inactive", () => {
      const decision = AuthorizationService.authorize({
        context: { userId: "usr_1", organizationId: "org_alpha", role: "" as any },
        action: "CREATE_PROJECT"
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("UNKNOWN_ROLE");
    });

    it("should strictly deny access for non-existent actions (fallback to false)", () => {
      const isAllowed = hasPermission("OWNER", "SUPER_ADMIN_DESTROY_ALL" as any);
      expect(isAllowed).toBe(false);
    });
  });

  describe("2. Cross-Tenant Data Isolation", () => {
    const userOrgA: UserAuthContext = {
      userId: "usr_alice",
      organizationId: "org_alpha",
      role: "ADMIN"
    };

    it("should permit access when resource belongs to the user's workspace", () => {
      const resourceOrgA: ResourceDescriptor = {
        resourceType: "PROJECT",
        resourceId: "proj_alpha_01",
        organizationId: "org_alpha"
      };

      const decision = AuthorizationService.authorize({
        context: userOrgA,
        action: "EDIT_PROJECT",
        resource: resourceOrgA
      });

      expect(decision.allowed).toBe(true);
      expect(decision.statusCode).toBe(200);
    });

    it("should strictly reject access when a user from Workspace A attempts to access Workspace B", () => {
      const resourceOrgB: ResourceDescriptor = {
        resourceType: "PROJECT",
        resourceId: "proj_beta_99",
        organizationId: "org_beta_foreign" // Foreign workspace
      };

      const decision = AuthorizationService.authorize({
        context: userOrgA,
        action: "EDIT_PROJECT",
        resource: resourceOrgB
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("CROSS_TENANT_ACCESS_FORBIDDEN");
      expect(decision.securityViolation).toBe(true);
    });
  });

  describe("3. Resource Lifecycle Security (Archived & Deleted Boundaries)", () => {
    const user: UserAuthContext = {
      userId: "usr_pm",
      organizationId: "org_alpha",
      role: "MANAGER"
    };

    it("should deny mutations on soft-deleted resources", () => {
      const deletedResource: ResourceDescriptor = {
        resourceType: "PROJECT",
        resourceId: "proj_del_01",
        organizationId: "org_alpha",
        isDeleted: true
      };

      const decision = AuthorizationService.authorize({
        context: user,
        action: "EDIT_PROJECT",
        resource: deletedResource
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("RESOURCE_DELETED_OR_ARCHIVED");
    });

    it("should deny mutations on archived resources", () => {
      const archivedResource: ResourceDescriptor = {
        resourceType: "CLIENT",
        resourceId: "client_archived_01",
        organizationId: "org_alpha",
        isArchived: true
      };

      const decision = AuthorizationService.authorize({
        context: user,
        action: "EDIT_CLIENT",
        resource: archivedResource
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("RESOURCE_DELETED_OR_ARCHIVED");
    });
  });

  describe("4. Granular Role & Permission Boundaries", () => {
    it("should enforce that VIEWER has zero mutation capabilities", () => {
      expect(hasPermission("VIEWER", "CREATE_PROJECT")).toBe(false);
      expect(hasPermission("VIEWER", "EDIT_PROJECT")).toBe(false);
      expect(hasPermission("VIEWER", "EDIT_SCOPE")).toBe(false);
      expect(hasPermission("VIEWER", "CREATE_ESTIMATE")).toBe(false);
      expect(hasPermission("VIEWER", "UPLOAD_DOCUMENT")).toBe(false);
      expect(hasPermission("VIEWER", "EXPORT_DATA")).toBe(false);
    });

    it("should prevent EDITOR from approving estimates, inviting users, or viewing financial data", () => {
      expect(hasPermission("EDITOR", "EDIT_SCOPE")).toBe(true);
      expect(hasPermission("EDITOR", "CREATE_ESTIMATE")).toBe(true);
      expect(hasPermission("EDITOR", "INVITE_USER")).toBe(false);
      expect(hasPermission("EDITOR", "APPROVE_ESTIMATE")).toBe(false);
      expect(hasPermission("EDITOR", "VIEW_FINANCIAL_DATA")).toBe(false); // Commercial wall
      expect(hasPermission("EDITOR", "VIEW_AUDIT_LOG")).toBe(false);
    });

    it("should prevent MANAGER from transferring ownership, deleting projects, or managing billing", () => {
      expect(hasPermission("MANAGER", "CREATE_PROJECT")).toBe(true);
      expect(hasPermission("MANAGER", "APPROVE_ESTIMATE")).toBe(true);
      expect(hasPermission("MANAGER", "SEND_PROPOSAL")).toBe(true);
      expect(hasPermission("MANAGER", "DELETE_PROJECT")).toBe(false);
      expect(hasPermission("MANAGER", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("MANAGER", "MANAGE_BILLING")).toBe(false);
      expect(hasPermission("MANAGER", "VIEW_AUDIT_LOG")).toBe(false);
    });

    it("should permit ONLY OWNER to transfer workspace ownership", () => {
      expect(hasPermission("OWNER", "TRANSFER_OWNERSHIP")).toBe(true);
      expect(hasPermission("ADMIN", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("MANAGER", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("EDITOR", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("REVIEWER", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("VIEWER", "TRANSFER_OWNERSHIP")).toBe(false);
      expect(hasPermission("CLIENT", "TRANSFER_OWNERSHIP")).toBe(false);
    });
  });

  describe("5. Secure Client Access Boundaries", () => {
    const clientUser: UserAuthContext = {
      userId: "usr_client_sarah",
      organizationId: "org_agency",
      role: "CLIENT",
      clientId: "client_novartis",
      clientProjectGrants: ["proj_telehealth_portal"] // Only granted access to this 1 project
    };

    it("should allow client to view and approve explicitly shared project proposal", () => {
      const sharedProject: ResourceDescriptor = {
        resourceType: "PROJECT",
        resourceId: "proj_telehealth_portal",
        organizationId: "org_agency",
        clientId: "client_novartis"
      };

      const decision = AuthorizationService.authorize({
        context: clientUser,
        action: "APPROVE_PROPOSAL",
        resource: sharedProject
      });

      expect(decision.allowed).toBe(true);
      expect(decision.statusCode).toBe(200);
    });

    it("should strictly deny client from accessing an unshared project in the same agency", () => {
      const unsharedProject: ResourceDescriptor = {
        resourceType: "PROJECT",
        resourceId: "proj_internal_fintech_app", // NOT in clientProjectGrants
        organizationId: "org_agency",
        clientId: "client_other_corp"
      };

      const decision = AuthorizationService.authorize({
        context: clientUser,
        action: "APPROVE_PROPOSAL",
        resource: unsharedProject
      });

      expect(decision.allowed).toBe(false);
      expect(decision.statusCode).toBe(403);
      expect(decision.errorCode).toBe("CROSS_CLIENT_ACCESS_DENIED");
    });

    it("should strictly deny client access to audit logs, financial margins, and AI token data", () => {
      expect(hasPermission("CLIENT", "VIEW_AUDIT_LOG")).toBe(false);
      expect(hasPermission("CLIENT", "VIEW_FINANCIAL_DATA")).toBe(false);
      expect(hasPermission("CLIENT", "GENERATE_AI_OUTPUT")).toBe(false);
      expect(hasPermission("CLIENT", "MANAGE_BILLING")).toBe(false);
    });
  });

  describe("6. Audit Trail Logging of Authorization Events", () => {
    it("should record structured audit logs for both allowed and denied decisions", () => {
      // 1. Allowed action
      AuthorizationService.authorize({
        context: { userId: "usr_alice", organizationId: "org_alpha", role: "OWNER" },
        action: "CREATE_PROJECT",
        resource: { resourceType: "PROJECT", resourceId: "proj_101", organizationId: "org_alpha" }
      });

      // 2. Denied action
      AuthorizationService.authorize({
        context: { userId: "usr_bob", organizationId: "org_alpha", role: "VIEWER" },
        action: "EDIT_PROJECT",
        resource: { resourceType: "PROJECT", resourceId: "proj_101", organizationId: "org_alpha" }
      });

      const events = AuditLogger.getRecentEvents("org_alpha", 5);
      expect(events).toHaveLength(2);

      const allowedEvent = events.find((e) => e.action.includes("ALLOWED"));
      const deniedEvent = events.find((e) => e.action.includes("DENIED"));

      expect(allowedEvent).toBeDefined();
      expect(deniedEvent).toBeDefined();
      expect(deniedEvent?.metadata?.statusCode).toBe(403);
    });
  });
});
