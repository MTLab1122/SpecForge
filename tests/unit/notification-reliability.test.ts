import { NotificationService } from "@/lib/notifications/notification-service";
import { NotificationTemplateEngine, type NotificationTemplateId } from "@/lib/notifications/notification-templates";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { AppError } from "@/lib/reliability/error-envelope";

describe("Phase 3.8 — Reliable Notification System Suite", () => {
  beforeEach(() => {
    NotificationService.clear();
    CircuitBreakerRegistry.resetAll();
  });

  describe("1. Multi-Channel Dispatch & In-App Storage", () => {
    it("should dispatch notification to IN_APP, EMAIL, and SLACK channels", async () => {
      const summary = await NotificationService.dispatch({
        organizationId: "org_alpha",
        userId: "usr_developer",
        recipientEmail: "dev@specforge.io",
        slackWebhookUrl: "https://hooks.slack.com/services/T00/B00/X00",
        eventType: "SCOPE_APPROVED",
        title: "Scope Approved by Client",
        message: "Deliverables approved for sprint kickoff."
      });

      expect(summary.channelsDispatched).toContain("IN_APP");
      expect(summary.channelsDispatched).toContain("EMAIL");
      expect(summary.channelsDispatched).toContain("SLACK");
      expect(summary.emailStatus).toBe("SENT");
      expect(summary.slackStatus).toBe("SENT");
      expect(summary.inAppStatus).toBe("STORED");

      const inAppItems = NotificationService.getInAppNotifications("usr_developer");
      expect(inAppItems.length).toBe(1);
      expect(inAppItems[0].isRead).toBe(false);
      expect(inAppItems[0].title).toBe("Scope Approved by Client");
    });

    it("should mark in-app notifications as read", async () => {
      await NotificationService.dispatch({
        organizationId: "org_alpha",
        userId: "usr_developer",
        eventType: "TASK_EXPORTED",
        title: "Task Exported",
        message: "FIN-101 exported to Jira."
      });

      const items = NotificationService.getInAppNotifications("usr_developer");
      expect(items[0].isRead).toBe(false);

      NotificationService.markRead("usr_developer", items[0].id);
      const updated = NotificationService.getInAppNotifications("usr_developer");
      expect(updated[0].isRead).toBe(true);
    });
  });

  describe("2. Notification Templates Rendering (All 11 Required Templates)", () => {
    const requiredTemplates: NotificationTemplateId[] = [
      "SCOPE_SHARED",
      "APPROVAL_REQUESTED",
      "APPROVAL_RECEIVED",
      "CHANGE_REQUESTED",
      "CHANGE_APPROVED_REJECTED",
      "PROPOSAL_SENT",
      "PROPOSAL_APPROVED_REJECTED",
      "MILESTONE_DUE",
      "PAYMENT_OVERDUE",
      "EXPORT_READY",
      "INTEGRATION_FAILURE"
    ];

    it.each(requiredTemplates)("should render template '%s' with subject, bodyText, and HTML", (templateId) => {
      const rendered = NotificationTemplateEngine.render(templateId, {
        recipientName: "Alice",
        projectName: "FinTech Discovery",
        amount: "$12,500.00",
        dueDate: "2026-12-01",
        actionUrl: "https://app.specforge.io/p/123",
        providerName: "Jira Cloud",
        errorMessage: "Token expired"
      });

      expect(rendered.templateId).toBe(templateId);
      expect(rendered.subject).toBeDefined();
      expect(rendered.subject.length).toBeGreaterThan(5);
      expect(rendered.bodyText).toBeDefined();
      expect(rendered.bodyHtml).toContain("<div");
      expect(rendered.category).toBeDefined();
    });
  });

  describe("3. Notification Preferences & Opt-In Safeguards", () => {
    it("should enforce marketing emails are strictly opt-in (default false)", () => {
      const prefs = NotificationService.getPreferences("usr_new_client");
      expect(prefs.marketingEmails).toBe(false);
      expect(prefs.approvalAlerts).toBe(true);
      expect(prefs.paymentAlerts).toBe(true);
    });

    it("should suppress marketing emails when opt-in is false", async () => {
      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_consumer",
        channel: "EMAIL",
        eventType: "MARKETING_UPDATE",
        templateId: "MARKETING_UPDATE",
        recipient: "consumer@example.com",
        title: "New Feature Announcement",
        message: "Check out our newest AI tools"
      });

      expect(job.status).toBe("SUPPRESSED");
      expect(job.error).toContain("Marketing emails are opt-in only");
    });

    it("should allow marketing emails when user explicitly opts in", async () => {
      NotificationService.updatePreferences("usr_consumer", { marketingEmails: true });

      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_consumer",
        channel: "EMAIL",
        eventType: "MARKETING_UPDATE",
        templateId: "MARKETING_UPDATE",
        recipient: "consumer@example.com",
        title: "New Feature Announcement",
        message: "Check out our newest AI tools"
      });

      expect(job.status).toBe("DELIVERED");
    });

    it("should suppress approval alerts when user disables approvalAlerts", async () => {
      NotificationService.updatePreferences("usr_busy_lead", { approvalAlerts: false });

      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_busy_lead",
        channel: "EMAIL",
        eventType: "APPROVAL_REQUESTED",
        templateId: "APPROVAL_REQUESTED",
        recipient: "lead@example.com",
        title: "Approval Requested",
        message: "Please approve deliverables"
      });

      expect(job.status).toBe("SUPPRESSED");
      expect(job.error).toContain("User disabled approval alerts");
    });

    it("should NOT suppress essential payment overdue notice even if paymentAlerts is false", async () => {
      NotificationService.updatePreferences("usr_admin", { paymentAlerts: false });

      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_admin",
        channel: "EMAIL",
        eventType: "PAYMENT_OVERDUE",
        templateId: "PAYMENT_OVERDUE",
        recipient: "admin@example.com",
        title: "Invoice Overdue",
        message: "Invoice #101 is overdue"
      });

      // Essential alerts cannot be silenced
      expect(job.status).toBe("DELIVERED");
    });
  });

  describe("4. Deduplication & Repeated Event Collapsing", () => {
    it("should prevent duplicate delivery and collapse repeated events within window", async () => {
      const first = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_dev",
        channel: "EMAIL",
        eventType: "SCOPE_SHARED",
        recipient: "dev@example.com",
        entityId: "scope_v1",
        title: "Scope Updated",
        message: "Scope v1 has been updated"
      });

      expect(first.status).toBe("DELIVERED");
      expect(first.collapsedCount).toBeUndefined();

      // Second identical event within 10-minute window
      const second = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_dev",
        channel: "EMAIL",
        eventType: "SCOPE_SHARED",
        recipient: "dev@example.com",
        entityId: "scope_v1",
        title: "Scope Updated",
        message: "Scope v1 has been updated"
      });

      // Returns the collapsed job with incremented count
      expect(second.id).toBe(first.id);
      expect(second.collapsedCount).toBe(2);
      expect(second.message).toContain("Repeated 2 times");
    });
  });

  describe("5. Delivery Tracking & Failed Job Retry", () => {
    it("should track delivery state transitions (DELIVERED -> OPENED)", async () => {
      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_tracker",
        channel: "EMAIL",
        eventType: "EXPORT_READY",
        recipient: "tracker@example.com",
        title: "Export Ready",
        message: "Your CSV is ready"
      });

      expect(job.status).toBe("DELIVERED");
      expect(job.deliveredAt).toBeDefined();

      NotificationService.markOpened(job.id);
      const history = NotificationService.getHistory("usr_tracker");
      expect(history[0].status).toBe("OPENED");
      expect(history[0].openedAt).toBeDefined();
    });

    it("should allow manual retry of failed notification jobs", async () => {
      const breaker = CircuitBreakerRegistry.get("EMAIL_RESEND");
      breaker.trip(); // Trip breaker to cause failure

      const job = await NotificationService.enqueue({
        organizationId: "org_alpha",
        userId: "usr_fail_test",
        channel: "EMAIL",
        eventType: "EXPORT_READY",
        recipient: "fail@example.com",
        title: "Export Ready",
        message: "Download ready"
      });

      // Breaker is open, so it fails or queues for retry
      expect(["QUEUED", "FAILED"]).toContain(job.status);

      // Now reset breaker and retry
      CircuitBreakerRegistry.resetAll();
      const retried = await NotificationService.retryJob(job.id);
      expect(retried.status).toBe("DELIVERED");
    });
  });

  describe("6. Cryptographic Unsubscribe Links", () => {
    it("should generate and verify HMAC-SHA256 unsubscribe token", () => {
      const token = NotificationService.generateUnsubscribeToken("usr_client", "TASK_EXPORTED");
      expect(token).toBeDefined();

      const result = NotificationService.handleUnsubscribe(token);
      expect(result.success).toBe(true);
      expect(result.userId).toBe("usr_client");
      expect(result.eventType).toBe("TASK_EXPORTED");

      const prefs = NotificationService.getPreferences("usr_client");
      expect(prefs.unsubscribedEventTypes).toContain("TASK_EXPORTED");
    });

    it("should reject tampered unsubscribe token with 403 Forbidden", () => {
      const token = NotificationService.generateUnsubscribeToken("usr_client", "TASK_EXPORTED");
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      decoded.payload = "usr_client:SECURITY_ALERT"; // Tamper payload!
      const tampered = Buffer.from(JSON.stringify(decoded)).toString("base64url");

      expect(() => {
        NotificationService.handleUnsubscribe(tampered);
      }).toThrow(AppError);
    });
  });
});
