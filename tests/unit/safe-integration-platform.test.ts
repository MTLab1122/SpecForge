import {
  SafeIntegrationPlatform,
  SafeJiraAdapter,
  SafeLinearAdapter,
  SafeTrelloAdapter,
  SafeGitHubAdapter,
  SafeNotionAdapter,
  SafeSlackAdapter,
  type IntegrationProvider,
  type Task
} from "@/lib/integrations/safe-integration-platform";
import { DataProtectionService } from "@/lib/reliability/data-protection";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { AuditLogger } from "@/lib/reliability/observability";
import { AppError } from "@/lib/reliability/error-envelope";

describe("Phase 3 Enhancement — Safe Integration Platform Suite", () => {
  const orgAlpha = "org_safe_integrations";
  const userLead = "usr_lead_integrator";

  beforeEach(() => {
    SafeIntegrationPlatform.clear();
    AuditLogger.clear();
    CircuitBreakerRegistry.resetAll();
  });

  describe("1. Integration Adapter Pattern for All 6 Providers", () => {
    it("should instantiate and register adapters for Jira, Linear, Trello, GitHub, Notion, and Slack", () => {
      const providers: IntegrationProvider[] = ["JIRA", "LINEAR", "TRELLO", "GITHUB", "NOTION", "SLACK"];

      providers.forEach((p) => {
        const adapter = SafeIntegrationPlatform.getAdapter(p);
        expect(adapter).toBeDefined();
        expect(adapter.provider).toBe(p);
        expect(typeof adapter.connect).toBe("function");
        expect(typeof adapter.disconnect).toBe("function");
        expect(typeof adapter.healthCheck).toBe("function");
        expect(typeof adapter.exportTask).toBe("function");
        expect(typeof adapter.listConnections).toBe("function");
      });
    });
  });

  describe("2. Connection Lifecycle & Token Encryption", () => {
    it("should connect, encrypt credentials with AES-256-GCM, and record audit event", async () => {
      const rawSecretToken = "jira_api_token_super_secret_xyz123";

      const result = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "JIRA",
        token: rawSecretToken,
        scopes: ["read:jira-work", "write:jira-work"],
        accountName: "admin@agency.io",
        workspaceName: "agency.atlassian.net"
      });

      expect(result.status).toBe("CONNECTED");
      expect(result.connectionId).toBe(`conn_jira_${orgAlpha}`);
      expect(result.scopes).toContain("read:jira-work");

      // Verify token is encrypted at rest and matches when decrypted
      const connections = SafeIntegrationPlatform.listConnections(orgAlpha);
      expect(connections.length).toBe(1);
      const conn = connections[0];
      expect(conn.encryptedToken).toBeDefined();
      expect(conn.encryptedToken.ciphertext).not.toBe(rawSecretToken); // encrypted!

      const decrypted = DataProtectionService.decryptField(conn.encryptedToken);
      expect(decrypted).toBe(rawSecretToken);

      // Verify audit trail
      const logs = AuditLogger.getRecentEvents(orgAlpha);
      const audit = logs.find((l) => l.action === "INTEGRATION_CONNECTED");
      expect(audit).toBeDefined();
      expect(audit?.entityId).toBe(result.connectionId);
    });

    it("should disconnect and revoke integration credentials", async () => {
      const { connectionId } = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "LINEAR",
        token: "lin_api_key_test"
      });

      await SafeIntegrationPlatform.disconnect({
        connectionId,
        organizationId: orgAlpha,
        userId: userLead
      });

      const health = await SafeIntegrationPlatform.healthCheck(connectionId, orgAlpha);
      expect(health.status).toBe("DISCONNECTED");
      expect(health.healthy).toBe(false);
    });
  });

  describe("3. Scope Limitation & Least Privilege Guard", () => {
    it("should accept valid least-privilege OAuth scopes", async () => {
      const result = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "GITHUB",
        token: "ghp_valid_pat_token",
        scopes: ["public_repo", "issues:write"]
      });

      expect(result.status).toBe("CONNECTED");
    });

    it("should strictly reject excessive or destructive scopes with EXCESSIVE_SCOPES_PROHIBITED", async () => {
      // 1. Jira excessive admin/delete
      await expect(
        SafeIntegrationPlatform.connect({
          organizationId: orgAlpha,
          userId: userLead,
          provider: "JIRA",
          token: "jira_token",
          scopes: ["admin:jira", "delete:jira-work"]
        })
      ).rejects.toThrow("Excessive or destructive OAuth scope");

      // 2. GitHub delete_repo / full repo
      await expect(
        SafeIntegrationPlatform.connect({
          organizationId: orgAlpha,
          userId: userLead,
          provider: "GITHUB",
          token: "gh_pat",
          scopes: ["delete_repo"]
        })
      ).rejects.toThrow("EXCESSIVE_SCOPES_PROHIBITED");

      // 3. Notion workspace:admin
      await expect(
        SafeIntegrationPlatform.connect({
          organizationId: orgAlpha,
          userId: userLead,
          provider: "NOTION",
          token: "notion_secret",
          scopes: ["workspace:admin"]
        })
      ).rejects.toThrow("EXCESSIVE_SCOPES_PROHIBITED");
    });
  });

  describe("4. Task Approval Requirement Guard", () => {
    beforeEach(async () => {
      await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "JIRA",
        token: "jira_token_approved"
      });
    });

    it("should reject export of an unapproved task with UNAPPROVED_TASK_EXPORT_DENIED", async () => {
      const unapprovedTask: Task = {
        id: "task_unapproved_101",
        title: "Experimental unapproved feature",
        description: "Draft deliverable",
        priority: "MEDIUM",
        status: "TODO",
        estimatedHours: 8,
        isApproved: false // Not approved!
      };

      await expect(
        SafeIntegrationPlatform.exportTask("JIRA", unapprovedTask, {
          organizationId: orgAlpha,
          userId: userLead
        })
      ).rejects.toThrow("Task Approval Guard");
    });

    it("should allow export of an approved task", async () => {
      const approvedTask: Task = {
        id: "task_approved_202",
        title: "Setup Postgres Connection Pool",
        description: "Production ready pool",
        priority: "HIGH",
        status: "APPROVED",
        estimatedHours: 12,
        isApproved: true // Approved!
      };

      const result = await SafeIntegrationPlatform.exportTask("JIRA", approvedTask, {
        organizationId: orgAlpha,
        userId: userLead
      });

      expect(result.status).toBe("SUCCESS");
      expect(result.externalResourceId).toBeDefined();
      expect(result.externalUrl).toContain("atlassian.net");
    });
  });

  describe("5. Export Idempotency & Mapping Persistence", () => {
    beforeEach(async () => {
      await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "LINEAR",
        token: "linear_key_idem"
      });
    });

    it("should prevent duplicate export and return ALREADY_EXPORTED with original external issue key", async () => {
      const task: Task = {
        id: "task_idem_303",
        title: "Build Idempotent Webhook Handler",
        description: "Zero duplicate transactions",
        priority: "CRITICAL",
        status: "APPROVED",
        estimatedHours: 10,
        isApproved: true
      };

      // First export
      const first = await SafeIntegrationPlatform.exportTask("LINEAR", task, {
        organizationId: orgAlpha,
        userId: userLead,
        targetProjectOrList: "ENG"
      });

      expect(first.status).toBe("SUCCESS");
      const originalExternalId = first.externalResourceId;

      // Duplicate export call with same parameters
      const second = await SafeIntegrationPlatform.exportTask("LINEAR", task, {
        organizationId: orgAlpha,
        userId: userLead,
        targetProjectOrList: "ENG"
      });

      expect(second.status).toBe("ALREADY_EXPORTED");
      expect(second.externalResourceId).toBe(originalExternalId); // Identical external issue
      expect(second.userFacingMessage).toContain("already been exported");

      // Verify mapping history
      const history = SafeIntegrationPlatform.listExportHistory(orgAlpha);
      expect(history.length).toBe(1);
      expect(history[0].externalResourceId).toBe(originalExternalId);
    });

    it("should allow manual retry of export", async () => {
      const task: Task = {
        id: "task_retry_404",
        title: "Setup Slack Alerts",
        description: "Real-time webhook notifications",
        priority: "MEDIUM",
        status: "APPROVED",
        estimatedHours: 4,
        isApproved: true
      };

      const retried = await SafeIntegrationPlatform.retryExport({
        provider: "LINEAR",
        task,
        context: {
          organizationId: orgAlpha,
          userId: userLead
        }
      });

      expect(retried.status).toBe("SUCCESS");
      expect(retried.externalResourceId).toBeDefined();
    });
  });

  describe("6. Connection Health Monitoring & Actionable Guidance", () => {
    it("should report TOKEN_EXPIRED when credentials have lapsed with user guidance", async () => {
      const { connectionId } = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "TRELLO",
        token: "trello_token_expired",
        simulateExpired: true
      });

      const health = await SafeIntegrationPlatform.healthCheck(connectionId, orgAlpha);
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("TOKEN_EXPIRED");
      expect(health.userFacingGuidance).toContain("Reconnect");
    });

    it("should report RATE_LIMITED when API quota is exhausted with reset guidance", async () => {
      const { connectionId } = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "GITHUB",
        token: "gh_rate_limit_token",
        simulateRateLimited: true
      });

      const health = await SafeIntegrationPlatform.healthCheck(connectionId, orgAlpha);
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("RATE_LIMITED");
      expect(health.rateLimitRemaining).toBe(0);
      expect(health.userFacingGuidance).toContain("Rate limit quota exhausted");
    });

    it("should report DEGRADED when downstream circuit breaker is open", async () => {
      const { connectionId } = await SafeIntegrationPlatform.connect({
        organizationId: orgAlpha,
        userId: userLead,
        provider: "SLACK",
        token: "xoxb_slack_breaker_token"
      });

      const breaker = CircuitBreakerRegistry.get("SLACK");
      breaker.trip(); // Open the circuit

      const health = await SafeIntegrationPlatform.healthCheck(connectionId, orgAlpha);
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("DEGRADED");
      expect(health.userFacingGuidance).toContain("temporarily degraded");
    });
  });
});

