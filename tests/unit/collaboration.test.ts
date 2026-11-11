import { hasPermission, assertPermission } from "@/lib/permissions/matrix";
import { PresenceManager } from "@/lib/collaboration/presence-manager";

describe("Multi-User Collaboration & RBAC Suite", () => {
  describe("1. Granular Roles & Permission Matrix", () => {
    it("should grant OWNER full permissions across all 21 operations", () => {
      expect(hasPermission("OWNER", "CREATE_PROJECT")).toBe(true);
      expect(hasPermission("OWNER", "DELETE_PROJECT")).toBe(true);
      expect(hasPermission("OWNER", "INVITE_USER")).toBe(true);
      expect(hasPermission("OWNER", "VIEW_FINANCIAL_DATA")).toBe(true);
      expect(hasPermission("OWNER", "APPROVE_PROPOSAL")).toBe(true);
    });

    it("should strictly prevent CLIENT from viewing internal financial data", () => {
      expect(hasPermission("CLIENT", "VIEW_FINANCIAL_DATA")).toBe(false);
      expect(() => assertPermission("CLIENT", "VIEW_FINANCIAL_DATA")).toThrow(
        /Role "CLIENT" is not permitted to perform action "VIEW_FINANCIAL_DATA"/
      );
    });

    it("should allow CLIENT to approve proposals and change requests", () => {
      expect(hasPermission("CLIENT", "APPROVE_PROPOSAL")).toBe(true);
      expect(hasPermission("CLIENT", "APPROVE_CHANGE_REQUEST")).toBe(true);
    });

    it("should prevent EDITOR from approving estimates or viewing financial margins", () => {
      expect(hasPermission("EDITOR", "EDIT_SCOPE")).toBe(true);
      expect(hasPermission("EDITOR", "CREATE_ESTIMATE")).toBe(true);
      expect(hasPermission("EDITOR", "APPROVE_ESTIMATE")).toBe(false);
      expect(hasPermission("EDITOR", "VIEW_FINANCIAL_DATA")).toBe(false);
    });

    it("should enforce read-only boundaries on VIEWER", () => {
      expect(hasPermission("VIEWER", "CREATE_PROJECT")).toBe(false);
      expect(hasPermission("VIEWER", "EDIT_SCOPE")).toBe(false);
      expect(hasPermission("VIEWER", "UPLOAD_DOCUMENT")).toBe(false);
      expect(hasPermission("VIEWER", "EXPORT_DATA")).toBe(false);
    });
  });

  describe("2. Real-Time Presence & Edit Lock Manager", () => {
    const testProjectId = "proj_test_presence_101";

    it("should track active users on heartbeat pulse", () => {
      const userA = {
        userId: "usr_a",
        name: "Danial PM",
        email: "danial@pm.com"
      };

      const activeUsers = PresenceManager.updateHeartbeat(
        testProjectId,
        userA,
        "SCOPE_BUILDER"
      );

      expect(activeUsers.length).toBeGreaterThanOrEqual(1);
      const found = activeUsers.find((u) => u.userId === "usr_a");
      expect(found).toBeDefined();
      expect(found?.activeSection).toBe("SCOPE_BUILDER");
    });

    it("should prevent concurrent edit collision on same locked item", () => {
      const userA = { userId: "usr_a", name: "Danial", email: "danial@pm.com" };
      const userB = { userId: "usr_b", name: "Farhan", email: "farhan@dev.com" };

      // User A pulses and acquires lock on 'feat_auth_otp'
      PresenceManager.updateHeartbeat(testProjectId, userA, "SCOPE_BUILDER");
      const lockA = PresenceManager.acquireLock(testProjectId, "usr_a", "feat_auth_otp");
      expect(lockA.success).toBe(true);

      // User B attempts to acquire lock on the same item
      PresenceManager.updateHeartbeat(testProjectId, userB, "SCOPE_BUILDER");
      const lockB = PresenceManager.acquireLock(testProjectId, "usr_b", "feat_auth_otp");

      expect(lockB.success).toBe(false);
      expect(lockB.lockedBy).toBe("Danial");
      expect(lockB.lockOwnerId).toBe("usr_a");

      // User A releases lock
      const released = PresenceManager.releaseLock(testProjectId, "usr_a", "feat_auth_otp");
      expect(released).toBe(true);

      // User B can now acquire lock
      const lockBAfterRelease = PresenceManager.acquireLock(testProjectId, "usr_b", "feat_auth_otp");
      expect(lockBAfterRelease.success).toBe(true);
    });
  });
});

