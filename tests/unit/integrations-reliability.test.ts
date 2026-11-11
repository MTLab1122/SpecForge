import { DeliveryHandoverOrchestrator } from "@/lib/integrations/orchestrator";
import { JiraCloudAdapter } from "@/lib/integrations/adapters/jira-adapter";
import { LinearAdapter } from "@/lib/integrations/adapters/linear-adapter";
import { GitHubIssuesAdapter } from "@/lib/integrations/adapters/github-adapter";
import { IntegrationSyncService } from "@/lib/integrations/sync-service";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { AppError } from "@/lib/reliability/error-envelope";
import type { InternalTask } from "@/lib/validations/delivery-handover";

describe("Phase 3.6 — Integration Reliability & Two-Way Sync Suite", () => {
  const mockTask: InternalTask = {
    id: "task_arch_101",
    projectId: "proj_fintech_99",
    scopeDeliverableId: "deliv_1",
    title: "Implement Double-Entry Ledger Engine",
    description: "Multi-currency ledger with ACID balance checks.",
    priority: "HIGH",
    status: "TODO",
    estimatedHours: 24,
    tags: ["core", "fintech"],
    acceptanceCriteria: ["All ledger entries must balance to zero", "ACID rollback on violation"],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    DeliveryHandoverOrchestrator.registerAdapter("JIRA", new JiraCloudAdapter());
    DeliveryHandoverOrchestrator.registerAdapter("LINEAR", new LinearAdapter());
    DeliveryHandoverOrchestrator.registerAdapter("GITHUB", new GitHubIssuesAdapter());
    IntegrationSyncService.clear();
    CircuitBreakerRegistry.resetAll();
  });

  describe("1. Resilient Task Export & Sync Ledger", () => {
    it("should export an internal task to Jira Cloud and record sync ledger entry", async () => {
      const result = await IntegrationSyncService.exportTaskWithResilience({
        task: mockTask,
        provider: "JIRA",
        config: {
          apiKey: "jira_sec_token_999",
          targetProjectOrList: "FIN",
          externalOrgId: "fintech.atlassian.net"
        },
        organizationId: "org_alpha",
        userId: "usr_lead"
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.externalUrl).toContain("fintech.atlassian.net");
      expect(result.syncStatus).toBe("SUCCESS");

      const ledger = IntegrationSyncService.getLedgerEntry(result.idempotencyKey);
      expect(ledger).not.toBeNull();
      expect(ledger?.syncStatus).toBe("SUCCESS");
      expect(ledger?.taskId).toBe(mockTask.id);
    });

    it("should return cached export result on idempotent duplicate request without re-invoking external API", async () => {
      const exportParams = {
        task: mockTask,
        provider: "JIRA" as const,
        config: {
          apiKey: "jira_sec_token_999",
          targetProjectOrList: "FIN",
          externalOrgId: "fintech.atlassian.net"
        },
        organizationId: "org_alpha",
        userId: "usr_lead"
      };

      const first = await IntegrationSyncService.exportTaskWithResilience(exportParams);
      const second = await IntegrationSyncService.exportTaskWithResilience(exportParams);

      expect(second.externalId).toBe(first.externalId);
      expect(second.externalUrl).toBe(first.externalUrl);
      expect(second.idempotencyKey).toBe(first.idempotencyKey);
    });
  });

  describe("2. Circuit Breaker Fast-Fail Protection", () => {
    it("should fast-fail with 503 when integration circuit breaker is OPEN", async () => {
      const breaker = CircuitBreakerRegistry.get("JIRA");
      breaker.trip(); // Simulate consecutive upstream failures tripping breaker

      await expect(
        IntegrationSyncService.exportTaskWithResilience({
          task: mockTask,
          provider: "JIRA",
          config: { apiKey: "token" },
          organizationId: "org_alpha",
          userId: "usr_lead"
        })
      ).rejects.toThrow(AppError);

      try {
        await IntegrationSyncService.exportTaskWithResilience({
          task: mockTask,
          provider: "JIRA",
          config: { apiKey: "token" },
          organizationId: "org_alpha",
          userId: "usr_lead"
        });
      } catch (err: any) {
        expect(err.status).toBe(503);
        expect(err.code).toBe("INTEGRATION_CIRCUIT_OPEN");
        expect(err.retryAfterSec).toBe(30);
      }
    });
  });

  describe("3. Inbound Two-Way Status Synchronization", () => {
    it("should map Jira 'Resolved' and 'Done' statuses to internal 'DONE'", () => {
      const syncResult1 = IntegrationSyncService.processInboundStatusSync({
        provider: "JIRA",
        externalTaskId: "FIN-101",
        externalStatus: "Done",
        organizationId: "org_alpha",
        projectId: "proj_fintech_99",
        timestamp: new Date().toISOString()
      });

      expect(syncResult1.updatedInternalStatus).toBe("DONE");

      const syncResult2 = IntegrationSyncService.processInboundStatusSync({
        provider: "JIRA",
        externalTaskId: "FIN-102",
        externalStatus: "Resolved",
        organizationId: "org_alpha",
        projectId: "proj_fintech_99",
        timestamp: new Date().toISOString()
      });

      expect(syncResult2.updatedInternalStatus).toBe("DONE");
    });

    it("should map Linear 'started' status to internal 'IN_PROGRESS'", () => {
      const syncResult = IntegrationSyncService.processInboundStatusSync({
        provider: "LINEAR",
        externalTaskId: "LIN-42",
        externalStatus: "started",
        organizationId: "org_alpha",
        projectId: "proj_fintech_99",
        timestamp: new Date().toISOString()
      });

      expect(syncResult.updatedInternalStatus).toBe("IN_PROGRESS");
    });

    it("should map Jira 'Backlog' or 'To Do' to internal 'TODO'", () => {
      const syncResult = IntegrationSyncService.processInboundStatusSync({
        provider: "JIRA",
        externalTaskId: "FIN-103",
        externalStatus: "Backlog",
        organizationId: "org_alpha",
        projectId: "proj_fintech_99",
        timestamp: new Date().toISOString()
      });

      expect(syncResult.updatedInternalStatus).toBe("TODO");
    });
  });

  describe("4. Connection Health & Webhook Verification", () => {
    it("should report HEALTHY status for valid configuration and DISCONNECTED for missing token", async () => {
      const jiraAdapter = new JiraCloudAdapter();

      const healthyRes = await jiraAdapter.testConnection({
        apiKey: "valid_token",
        externalOrgId: "mycompany.atlassian.net"
      });
      expect(healthyRes.status).toBe("HEALTHY");
      expect(healthyRes.healthy).toBe(true);

      const disconnRes = await jiraAdapter.testConnection({});
      expect(disconnRes.status).toBe("DISCONNECTED");
      expect(disconnRes.healthy).toBe(false);
    });

    it("should sign and verify HMAC-SHA256 webhook events", () => {
      const secret = "webhook_hmac_secret_key_123";
      const event = DeliveryHandoverOrchestrator.createSignedWebhookEvent({
        eventType: "TASK_EXPORTED",
        payload: { taskId: "task_1", externalId: "JIRA-99" },
        secret
      });

      expect(event.signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      const bodyString = JSON.stringify({
        id: event.id,
        event: event.eventType,
        timestamp: event.timestamp,
        data: event.payload
      });

      const isValid = DeliveryHandoverOrchestrator.verifyWebhookSignature(bodyString, event.signature, secret);
      expect(isValid).toBe(true);
    });
  });
});
