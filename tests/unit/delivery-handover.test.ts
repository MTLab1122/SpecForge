import { DeliveryHandoverOrchestrator } from "@/lib/integrations/orchestrator";
import { JiraCloudAdapter } from "@/lib/integrations/adapters/jira-adapter";
import { LinearAdapter } from "@/lib/integrations/adapters/linear-adapter";
import { TrelloAdapter } from "@/lib/integrations/adapters/trello-adapter";
import { GitHubIssuesAdapter } from "@/lib/integrations/adapters/github-adapter";
import { NotionExportAdapter } from "@/lib/integrations/adapters/notion-adapter";
import { SlackAdapter } from "@/lib/integrations/adapters/slack-adapter";
import {
  InternalTask,
  ExportTasksRequestSchema,
  WebhookSubscriptionCreateSchema
} from "@/lib/validations/delivery-handover";

describe("Reliable Delivery Handover Unit Tests", () => {
  const sampleTask: InternalTask = {
    id: "task-001",
    title: "Implement Authentication Middleware & Role Guardrails",
    description: "JWT cookie validation and role-based access control.",
    priority: "HIGH",
    status: "TODO",
    estimatedHours: 16,
    dueDate: "2026-03-15",
    labels: ["auth", "security", "backend"],
    assigneeEmail: "dev@agency.com",
    milestoneTitle: "Milestone 1: Core System",
    acceptanceCriteria: ["Valid token allows access", "Expired token redirects to login"]
  };

  describe("1. Integration Adapters & Task Transformation", () => {
    it("Jira adapter should format issue key, URL, and deterministic idempotency key", async () => {
      const adapter = new JiraCloudAdapter();
      const config = { targetProjectOrList: "SPEC", externalOrgId: "specforge.atlassian.net", apiKey: "mock-token" };

      const health = await adapter.testConnection(config);
      expect(health.healthy).toBe(true);
      expect(health.workspaceName).toBe("specforge.atlassian.net");

      const exportRes = await adapter.exportTask(sampleTask, config);
      expect(exportRes.success).toBe(true);
      expect(exportRes.externalId).toMatch(/^SPEC-\d+/);
      expect(exportRes.externalUrl).toContain("specforge.atlassian.net/browse/SPEC-");
      expect(exportRes.idempotencyKey).toHaveLength(64);
    });

    it("Linear adapter should format issue identifier and URL", async () => {
      const adapter = new LinearAdapter();
      const config = { targetProjectOrList: "ENG", apiKey: "mock-token" };

      const health = await adapter.testConnection(config);
      expect(health.healthy).toBe(true);

      const exportRes = await adapter.exportTask(sampleTask, config);
      expect(exportRes.success).toBe(true);
      expect(exportRes.externalId).toMatch(/^ENG-\d+/);
      expect(exportRes.externalUrl).toContain("linear.app/team/ENG/issue/ENG-");
    });

    it("Trello adapter should generate card ID and shortUrl", async () => {
      const adapter = new TrelloAdapter();
      const config = { targetProjectOrList: "list_123", apiKey: "mock-key" };

      const exportRes = await adapter.exportTask(sampleTask, config);
      expect(exportRes.success).toBe(true);
      expect(exportRes.externalId).toMatch(/^crd_[a-f0-9]{12}$/);
      expect(exportRes.externalUrl).toContain("trello.com/c/");
    });

    it("GitHub Issues adapter should map issue number and URL", async () => {
      const adapter = new GitHubIssuesAdapter();
      const config = { targetProjectOrList: "agency-org/client-repo", apiKey: "mock-token" };

      const exportRes = await adapter.exportTask(sampleTask, config);
      expect(exportRes.success).toBe(true);
      expect(exportRes.externalId).toMatch(/^#\d+/);
      expect(exportRes.externalUrl).toContain("github.com/agency-org/client-repo/issues/");
    });
  });

  describe("2. Explicit User Approval Enforcement Gate", () => {
    it("should strictly reject task exports if user approval is not confirmed", async () => {
      const outcome = await DeliveryHandoverOrchestrator.exportApprovedTasks({
        tasks: [sampleTask],
        provider: "LINEAR",
        config: { targetProjectOrList: "ENG", apiKey: "token" },
        confirmedByUser: false // Prohibited
      });

      expect(outcome.success).toBe(false);
      expect(outcome.error).toContain("Explicit user confirmation is required");
      expect(outcome.results.length).toBe(0);
    });

    it("should permit task export when explicit user approval is granted", async () => {
      const outcome = await DeliveryHandoverOrchestrator.exportApprovedTasks({
        tasks: [sampleTask],
        provider: "LINEAR",
        config: { targetProjectOrList: "ENG", apiKey: "token" },
        confirmedByUser: true // Approved
      });

      expect(outcome.success).toBe(true);
      expect(outcome.results.length).toBe(1);
      expect(outcome.results[0].syncStatus).toBe("SUCCESS");
    });
  });

  describe("3. Notion Export Adapter", () => {
    it("should format Notion database rows and page blocks accurately", () => {
      const exportRes = NotionExportAdapter.exportToNotion({
        projectTitle: "Logistics SaaS Portal",
        scopeSummary: "Full-stack client portal with real-time tracking.",
        estimateTotal: 25000,
        currency: "USD",
        tasks: [sampleTask],
        format: "DATABASE"
      });

      expect(exportRes.pageTitle).toBe("Logistics SaaS Portal");
      expect(exportRes.databaseRows?.length).toBe(1);

      const row = exportRes.databaseRows![0];
      expect(row.properties.Name.title[0].text.content).toBe(sampleTask.title);
      expect(row.properties.Priority.select.name).toBe("HIGH");
      expect(row.properties["Estimated Hours"].number).toBe(16);

      expect(exportRes.markdownContent).toContain("# Logistics SaaS Portal");
      expect(exportRes.markdownContent).toContain("USD 25,000");
    });
  });

  describe("4. Slack Notification Adapter", () => {
    it("should format Slack Block Kit messages for approval requests", () => {
      const message = SlackAdapter.formatMessage({
        channelWebhookUrl: "https://hooks.slack.com/services/...",
        notificationType: "APPROVAL_REQUEST",
        title: "Enterprise Scope v2.0",
        summary: "Client portal proposal is ready for client authorization.",
        metadata: {
          "Total Price": "$28,500",
          "Deliverables": "4 Core Phases"
        }
      });

      expect(message.text).toContain("Proposal Approval Requested");
      expect(message.blocks.length).toBeGreaterThanOrEqual(2);
      expect(message.blocks[0].text.text).toContain("Proposal Approval Requested");
    });
  });

  describe("5. HMAC SHA-256 Webhook Dispatcher", () => {
    it("should create a valid HMAC SHA-256 signed webhook delivery payload", () => {
      const secret = "whsec_test_secret_1234567890";
      const event = DeliveryHandoverOrchestrator.createSignedWebhookEvent({
        eventType: "proposal.approved",
        payload: { proposalId: "prop-42", approvedAmount: 28500 },
        secret
      });

      expect(event.eventType).toBe("proposal.approved");
      expect(event.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it("should verify webhook signature correctly and reject tampered payloads", () => {
      const secret = "whsec_test_secret_1234567890";
      const event = DeliveryHandoverOrchestrator.createSignedWebhookEvent({
        eventType: "scope.approved",
        payload: { projectId: "proj-1" },
        secret
      });

      const bodyString = JSON.stringify({
        id: event.id,
        event: event.eventType,
        timestamp: event.timestamp,
        data: event.payload
      });

      const isValid = DeliveryHandoverOrchestrator.verifyWebhookSignature(bodyString, event.signature, secret);
      expect(isValid).toBe(true);

      const isTampered = DeliveryHandoverOrchestrator.verifyWebhookSignature(bodyString, event.signature, "wrong_secret");
      expect(isTampered).toBe(false);
    });
  });

  describe("6. Zod Validation Schemas", () => {
    it("should reject export request if confirmedByUser is false", () => {
      const invalid = {
        projectId: "123e4567-e89b-12d3-a456-426614174000",
        provider: "JIRA" as const,
        taskIds: ["task-1"],
        confirmedByUser: false
      };

      const result = ExportTasksRequestSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("should validate webhook subscription creation", () => {
      const valid = {
        targetUrl: "https://api.example.com/webhooks",
        eventTypes: ["proposal.approved" as const, "task.created" as const]
      };

      const result = WebhookSubscriptionCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});
