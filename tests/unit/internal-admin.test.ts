import { AdminService } from "@/lib/admin/admin-service";
import { SupportEngine } from "@/lib/admin/support-engine";
import { FeatureFlagsEngine } from "@/lib/admin/feature-flags-engine";
import { AnnouncementsEngine } from "@/lib/admin/announcements-engine";
import { OperationalExportEngine } from "@/lib/admin/operational-export-engine";

describe("Internal Admin & Support Tools Unit Tests", () => {
  describe("1. Super-Admin Security & Account Management", () => {
    it("should assert super-admin privilege and reject unauthorized access", () => {
      expect(() => AdminService.assertSuperAdmin(true)).not.toThrow();
      expect(() => AdminService.assertSuperAdmin(false)).toThrow(/SECURITY ACCESS DENIED/);
    });

    it("should generate a 15-minute time-limited impersonation debug token", () => {
      const session = AdminService.generateDebugSessionToken({
        adminUserId: "admin_1",
        targetUserId: "usr_99",
        organizationId: "org_apex",
        reason: "Diagnosing webhook delivery"
      });

      expect(session.debugToken).toContain("sfg_dbg_");
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it("should update workspace subscription tier and AI credit quotas", () => {
      const res = AdminService.updateWorkspacePlan({
        adminUserId: "admin_1",
        organizationId: "org_apex",
        newTier: "AGENCY",
        bonusCredits: 500,
        reason: "Courtesy top-up"
      });

      expect(res.tier).toBe("AGENCY");
      expect(res.newQuota).toBe(1500); // 1000 base + 500 bonus
    });
  });

  describe("2. Support Helpdesk & SLA Engine", () => {
    it("should create a support ticket with accurate SLA target hours", () => {
      const ticket = SupportEngine.createTicket({
        organizationId: "org_apex",
        creatorUserId: "usr_lead",
        creatorEmail: "founder@apex.io",
        subject: "Stripe invoice sync failure",
        description: "Invoice status not updating upon payment",
        category: "BILLING",
        priority: "HIGH"
      });

      expect(ticket.slaTargetHours).toBe(4);
      expect(ticket.status).toBe("OPEN");
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].isInternalNote).toBe(false);
    });

    it("should segregate customer communication from internal staff notes", () => {
      const ticket = SupportEngine.createTicket({
        organizationId: "org_apex",
        creatorUserId: "usr_lead",
        creatorEmail: "founder@apex.io",
        subject: "API Rate Limits",
        description: "Need higher concurrency",
        category: "GENERAL",
        priority: "MEDIUM"
      });

      // Add public customer reply
      const pubMsg = SupportEngine.addMessage({
        ticketId: ticket.id,
        authorUserId: "admin_1",
        authorName: "Support Team",
        isInternalNote: false,
        message: "We have reviewed your request."
      });
      expect(pubMsg.isInternalNote).toBe(false);

      // Add private staff note
      const privNote = SupportEngine.addMessage({
        ticketId: ticket.id,
        authorUserId: "admin_1",
        authorName: "Support Team",
        isInternalNote: true,
        message: "Customer is high-value Agency tier. Recommended to increase quota."
      });
      expect(privNote.isInternalNote).toBe(true);

      const refreshed = SupportEngine.getTicketById(ticket.id);
      expect(refreshed?.messages).toHaveLength(3);
    });

    it("should track assignment and status changes in audit history", () => {
      const ticket = SupportEngine.createTicket({
        organizationId: "org_apex",
        creatorUserId: "usr_lead",
        creatorEmail: "founder@apex.io",
        subject: "Test Ticket",
        description: "Test description",
        category: "BUG",
        priority: "LOW"
      });

      SupportEngine.assignTicket(ticket.id, "admin_2", "Alex Vance", "admin_1");
      SupportEngine.updateStatus(ticket.id, "RESOLVED", "admin_2");

      const refreshed = SupportEngine.getTicketById(ticket.id);
      expect(refreshed?.status).toBe("RESOLVED");
      expect(refreshed?.assignedName).toBe("Alex Vance");
      expect(refreshed?.history).toHaveLength(2);
    });
  });

  describe("3. Feature Flags & Gradual Rollouts", () => {
    it("should evaluate tier restrictions and tenant overrides", () => {
      // Flag: Claude 3.7 Sonnet is restricted to AGENCY and ENTERPRISE
      const evalPro = FeatureFlagsEngine.evaluate("ai_claude_37_sonnet", {
        organizationId: "org_test",
        subscriptionTier: "PROFESSIONAL"
      });
      expect(evalPro.isEnabled).toBe(false);

      const evalAgency = FeatureFlagsEngine.evaluate("ai_claude_37_sonnet", {
        organizationId: "org_test",
        subscriptionTier: "AGENCY"
      });
      expect(evalAgency.isEnabled).toBe(true);

      // Multi-currency has explicit override for 'org_apex_digital'
      const evalOverride = FeatureFlagsEngine.evaluate("multi_currency_rate_cards", {
        organizationId: "org_apex_digital",
        subscriptionTier: "TRIAL"
      });
      expect(evalOverride.isEnabled).toBe(true);
      expect(evalOverride.reason).toContain("Explicit organization override");
    });

    it("should respect master kill-switch", () => {
      const evalKillSwitch = FeatureFlagsEngine.evaluate("slack_interactive_approval_buttons", {
        organizationId: "org_test",
        subscriptionTier: "ENTERPRISE"
      });
      expect(evalKillSwitch.isEnabled).toBe(false);
      expect(evalKillSwitch.reason).toContain("Master flag is disabled");
    });
  });

  describe("4. In-App Announcements & Targeted Broadcasts", () => {
    it("should filter announcements by audience subscription tier", () => {
      const activeForPro = AnnouncementsEngine.getActiveForUser({
        plan: "PROFESSIONAL",
        role: "OWNER"
      });
      // Should receive universal banner, but not agency-only modal
      expect(activeForPro.some((a) => a.id === "ann_1")).toBe(true);
      expect(activeForPro.some((a) => a.id === "ann_2")).toBe(false);

      const activeForAgency = AnnouncementsEngine.getActiveForUser({
        plan: "AGENCY",
        role: "OWNER"
      });
      expect(activeForAgency.some((a) => a.id === "ann_2")).toBe(true);
    });

    it("should toggle announcement active state", () => {
      const toggled = AnnouncementsEngine.toggleActive("ann_1", false);
      expect(toggled.isActive).toBe(false);

      AnnouncementsEngine.toggleActive("ann_1", true); // Restore
    });
  });

  describe("5. Operational RFC 4180 CSV Data Exports", () => {
    it("should export users, workspaces, audit logs, and analytics to valid CSV", () => {
      const userExport = OperationalExportEngine.generateExportCsv({ type: "USERS" });
      expect(userExport.filename).toContain("specforge-admin-users-");
      expect(userExport.csv).toContain("User ID,Full Name,Email,Role,Organization,Plan Tier,Created At,Status");
      expect(userExport.csv).toContain("Marcus Vance");

      const wsExport = OperationalExportEngine.generateExportCsv({ type: "WORKSPACES" });
      expect(wsExport.csv).toContain("Apex Digital Solutions");

      const auditExport = OperationalExportEngine.generateExportCsv({ type: "AUDIT_LOGS" });
      expect(auditExport.csv).toContain("PROPOSAL_APPROVED");

      const analyticsExport = OperationalExportEngine.generateExportCsv({ type: "ANALYTICS" });
      expect(analyticsExport.csv).toContain("Monthly Active Workspaces");
    });
  });
});

