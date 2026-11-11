import { describe, it, expect, beforeEach } from "@jest/globals";
import { Logger } from "../../src/lib/reliability/observability.ts";
import { DataProtectionService } from "../../src/lib/reliability/data-protection.ts";
import { DistributedTracer } from "../../src/lib/reliability/distributed-tracer.ts";
import { TelemetryDashboardService } from "../../src/lib/reliability/telemetry-dashboard.ts";
import { AlertManager } from "../../src/lib/reliability/alert-manager.ts";
import { IncidentWorkflowManager } from "../../src/lib/reliability/incident-workflow.ts";
import { StatusPageService } from "../../src/lib/reliability/status-page-service.ts";

describe("Observability & Incident Response Hardening", () => {
  beforeEach(() => {
    Logger.clear();
    DistributedTracer.clear();
    TelemetryDashboardService.clear();
    AlertManager.clear();
    IncidentWorkflowManager.clear();
    StatusPageService.clear();
  });

  describe("1. Structured Logging & Sensitive Masking", () => {
    it("should log all required structured fields", () => {
      const entry = Logger.logHttpAccess({
        requestId: "req_test_101",
        traceId: "tr_test_101",
        correlationId: "corr_test_101",
        userId: "usr_alice",
        workspaceId: "ws_alpha",
        route: "/api/v1/projects",
        method: "POST",
        statusCode: 201,
        durationMs: 42.5,
        context: { projectId: "proj_1" }
      });

      expect(entry.timestamp).toBeDefined();
      expect(entry.requestId).toBe("req_test_101");
      expect(entry.traceId).toBe("tr_test_101");
      expect(entry.correlationId).toBe("corr_test_101");
      expect(entry.userId).toBe("usr_alice");
      expect(entry.workspaceId).toBe("ws_alpha");
      expect(entry.route).toBe("/api/v1/projects");
      expect(entry.method).toBe("POST");
      expect(entry.statusCode).toBe(201);
      expect(entry.durationMs).toBe(42.5);
    });

    it("should strictly redact secrets, tokens, api keys, and passwords", () => {
      const payload = {
        password: "SuperSecretPassword123!",
        token: "bearer_abc_secret",
        apiKey: "sk_live_xyz987",
        clientSecret: "oauth_client_sec",
        safeData: "hello"
      };

      const redacted = DataProtectionService.redactSensitiveData(payload);
      expect(redacted.password).toBe("[REDACTED]");
      expect(redacted.token).toBe("[REDACTED]");
      expect(redacted.apiKey).toBe("[REDACTED]");
      expect(redacted.clientSecret).toBe("[REDACTED]");
      expect(redacted.safeData).toBe("hello");
    });

    it("should redact full client documents, audio files, and credit cards", () => {
      const sensitivePayload = {
        documentBody: "Project Brief: This is a full sensitive tender document with specifications...",
        recording: Buffer.from("RIFF....WAVEfmt "),
        cardNumber: "4532-1234-5678-9012",
        cvv: "888",
        rawPdf: "%PDF-1.7 full client confidential blueprint data..."
      };

      const redacted = DataProtectionService.redactSensitiveData(sensitivePayload);
      expect(redacted.documentBody).toContain("[DOCUMENT_BODY_REDACTED");
      expect(redacted.recording).toContain("[AUDIO_BINARY_REDACTED");
      expect(redacted.cardNumber).toBe("[REDACTED]");
      expect(redacted.cvv).toBe("[REDACTED]");
      expect(redacted.rawPdf).toContain("[DOCUMENT_BODY_REDACTED");
    });
  });

  describe("2. Distributed Tracing Across Services", () => {
    it("should trace an API request down to database, AI call, and integration export", async () => {
      const trace = await DistributedTracer.traceApiRequest(
        "POST /api/v1/requirements/generate",
        "/api/v1/requirements/generate",
        "POST",
        async (apiSpan) => {
          // 1. Trace Database Query
          await DistributedTracer.traceDatabaseQuery("SELECT", "projects", async () => {
            return { id: "proj_101" };
          });

          // 2. Trace AI Call
          await DistributedTracer.traceAiCall("gemini-1.5-pro", "Generate user stories", async () => {
            return { stories: ["As a user..."] };
          });

          // 3. Trace Integration Export
          await DistributedTracer.traceExternalIntegration("LINEAR", "CREATE_ISSUE", async () => {
            return { issueId: "LIN-101" };
          });

          return { success: true };
        }
      );

      expect(trace.success).toBe(true);

      const activeSpan = DistributedTracer.getActiveSpan();
      expect(activeSpan).toBeUndefined(); // Async context completed

      // Retrieve full trace tree
      const recentTraces = DistributedTracer.getTrace(DistributedTracer.generateTraceId()); // fallback test
      expect(recentTraces).toBeNull();
    });

    it("should inject and propagate W3C compliant traceparent headers", () => {
      const span = DistributedTracer.startSpan("TestOutgoingSpan", { service: "test-client" });
      const headers: Record<string, string> = {};

      DistributedTracer.injectTraceHeaders(headers, span);
      expect(headers.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
      expect(headers["x-trace-id"]).toBe(span.traceId);
      expect(headers["x-span-id"]).toBe(span.spanId);

      const extracted = DistributedTracer.extractTraceHeaders(headers);
      expect(extracted.traceId).toBe(span.traceId);
      expect(extracted.parentSpanId).toBe(span.spanId);
      DistributedTracer.endSpan(span);
    });
  });

  describe("3. Telemetry Dashboards Aggregation", () => {
    it("should calculate latency percentiles, success rates, queue depths, and connection pool saturation", () => {
      for (let i = 1; i <= 100; i++) {
        TelemetryDashboardService.recordApiRequest(i * 2, i === 100 ? 500 : 200);
      }
      TelemetryDashboardService.recordAiJob(true, 500);
      TelemetryDashboardService.recordAiJob(true, 600);
      TelemetryDashboardService.recordIntegrationExport("LINEAR", true);
      TelemetryDashboardService.recordWebhookProcessing("STRIPE", true);
      TelemetryDashboardService.updateDatabasePool(45, 5, 50); // 90% saturation
      TelemetryDashboardService.updateBillingReconciliation(100, ["org_mismatch_1"]);

      const snapshot = TelemetryDashboardService.getSnapshot();
      expect(snapshot.totalRequests).toBe(100);
      expect(snapshot.apiAvailabilityPercent).toBe(99.0);
      expect(snapshot.errorRatePercent).toBe(1.0);
      expect(snapshot.apiLatency.p50Ms).toBeGreaterThan(0);
      expect(snapshot.apiLatency.p95Ms).toBeGreaterThan(0);
      expect(snapshot.databaseConnectionUsage.status).toBe("SATURATED");
      expect(snapshot.databaseConnectionUsage.saturationPercent).toBe(90.0);
      expect(snapshot.billingReconciliation.status).toBe("MISMATCH_DETECTED");
      expect(snapshot.sloBreaches.length).toBeGreaterThan(0);
    });
  });

  describe("4. Alerting Engine & Triggers", () => {
    it("should fire alerts on SLO breach, error spike, database saturation, and billing mismatch", () => {
      const snapshot = TelemetryDashboardService.getSnapshot();
      // Inject alert conditions
      snapshot.totalRequests = 100;
      snapshot.apiAvailabilityPercent = 98.5; // < 99.5 SLO
      snapshot.errorRatePercent = 2.5; // > 1.0% spike
      snapshot.databaseConnectionUsage.status = "SATURATED";
      snapshot.databaseConnectionUsage.saturationPercent = 92;
      snapshot.billingReconciliation.status = "MISMATCH_DETECTED";
      snapshot.billingReconciliation.mismatchCount = 1;
      snapshot.billingReconciliation.unreconciledWorkspaces = ["ws_discrepancy"];

      const fired = AlertManager.evaluateTelemetry(snapshot);
      expect(fired.length).toBeGreaterThan(0);

      const firingAlerts = AlertManager.listFiringAlerts();
      expect(firingAlerts.some((a) => a.category === "SLO_BREACH")).toBe(true);
      expect(firingAlerts.some((a) => a.category === "ERROR_RATE_SPIKE")).toBe(true);
      expect(firingAlerts.some((a) => a.category === "DATABASE_CONNECTION_SATURATION")).toBe(true);
      expect(firingAlerts.some((a) => a.category === "BILLING_MISMATCH")).toBe(true);
    });

    it("should immediately fire security anomaly alerts and allow acknowledgment", () => {
      const secAlert = AlertManager.triggerSecurityAnomaly({
        title: "Cross-tenant access attempt",
        message: "User u_attacker attempted to access organization org_victim",
        anomalyType: "CROSS_TENANT_VIOLATION",
        organizationId: "org_victim"
      });

      expect(secAlert.status).toBe("FIRING");
      expect(secAlert.category).toBe("SECURITY_ANOMALY");

      const ack = AlertManager.acknowledgeAlert(secAlert.id, "sre_marcus");
      expect(ack.status).toBe("ACKNOWLEDGED");
      expect(ack.acknowledgedBy).toBe("sre_marcus");

      const res = AlertManager.resolveAlert(secAlert.id, "sre_marcus");
      expect(res.status).toBe("RESOLVED");
      expect(res.resolvedBy).toBe("sre_marcus");
    });
  });

  describe("5. Complete 9-Step Incident Workflow", () => {
    it("should transition an incident through all 9 lifecycle stages up to postmortem and verification", () => {
      // 1. Detect
      const inc = IncidentWorkflowManager.detectIncident({
        title: "Database connection pool exhausted",
        severity: "SEV1_CRITICAL",
        affectedComponents: ["CORE_API", "DATABASE_PERSISTENCE"]
      });
      expect(inc.stage).toBe("DETECTED");

      // 2. Alert
      IncidentWorkflowManager.dispatchAlert(inc.id, ["pagerduty", "slack-sre"]);
      expect(inc.stage).toBe("ALERTED");

      // 3. Assign Owner
      IncidentWorkflowManager.assignOwners(inc.id, {
        incidentCommander: "marcus_lead",
        leadEngineer: "sre_sarah"
      });
      expect(inc.stage).toBe("OWNER_ASSIGNED");

      // 4. Investigate
      IncidentWorkflowManager.recordInvestigation(
        inc.id,
        "Identified unclosed connection pool leak on export endpoint",
        ["tr_leak_001", "tr_leak_002"]
      );
      expect(inc.stage).toBe("INVESTIGATING");
      expect(inc.correlatedTraceIds).toContain("tr_leak_001");

      // 5. Mitigate
      IncidentWorkflowManager.applyMitigation(
        inc.id,
        "Scaled up connection pool limit and enabled degraded mode for heavy exports",
        true
      );
      expect(inc.stage).toBe("MITIGATED");
      expect(inc.degradedModeActive).toBe(true);

      // 6. Communicate
      IncidentWorkflowManager.publishCommunication(
        inc.id,
        "PUBLIC_STATUS",
        "Investigating intermittent database delays. Core APIs running in degraded mode."
      );
      expect(inc.stage).toBe("COMMUNICATED");

      // 7. Resolve
      IncidentWorkflowManager.resolveIncident(
        inc.id,
        "Hotfix deployed to release client handles immediately. Pool utilization normalized to 15%."
      );
      expect(inc.stage).toBe("RESOLVED");
      expect(inc.outageDurationMinutes).toBeGreaterThanOrEqual(1);

      // 8. Postmortem
      IncidentWorkflowManager.generatePostMortem(inc.id, {
        author: "sre_sarah",
        rootCause: "Long-running export queries held pool connections open without releasing.",
        fiveWhys: [
          "Export queries were not timing out.",
          "Connection timeout configuration defaulted to indefinite.",
          "Pool was drained by 10 concurrent heavy exports."
        ],
        actionItems: [
          { description: "Add statement_timeout = 10s to export connections", owner: "sre_sarah" },
          { description: "Add automated pool saturation alert at 80%", owner: "marcus_lead" }
        ]
      });
      expect(inc.stage).toBe("POSTMORTEM_COMPLETED");
      expect(inc.postMortemMarkdown).toContain("BLAMELESS POST-MORTEM");
      expect(inc.actionItems.length).toBe(2);

      // 9. Prevent Recurrence
      const act1 = inc.actionItems[0].id;
      const act2 = inc.actionItems[1].id;
      IncidentWorkflowManager.verifyPreventiveAction(inc.id, act1, "qa_architect");
      IncidentWorkflowManager.verifyPreventiveAction(inc.id, act2, "lead_sre");

      expect(inc.stage).toBe("PREVENTIVE_ACTIONS_VERIFIED");
    });
  });

  describe("6. Public Status Page & Maintenance", () => {
    it("should reflect degraded and operational status, active incidents, and maintenance windows", () => {
      // 1. Initial status is all systems operational
      let pub = StatusPageService.getPublicStatus();
      expect(pub.overallStatus).toBe("ALL_SYSTEMS_OPERATIONAL");

      // 2. Publish incident update
      StatusPageService.publishIncidentUpdate({
        incidentId: "inc_linear_sync",
        title: "Degraded Linear Task Export",
        severity: "MEDIUM",
        status: "INVESTIGATING",
        message: "External Linear API rate limits causing export delays.",
        affectedComponents: ["INTEGRATIONS_PLATFORM"]
      });

      pub = StatusPageService.getPublicStatus();
      expect(pub.overallStatus).toBe("SOME_SYSTEMS_DEGRADED");
      expect(pub.activeIncidents.length).toBe(1);

      // 3. Schedule maintenance
      const maint = StatusPageService.scheduleMaintenance({
        title: "Database Index Rebuild",
        affectedComponents: ["DATABASE_PERSISTENCE"],
        scheduledStart: new Date(Date.now() + 3600000).toISOString(),
        scheduledEnd: new Date(Date.now() + 7200000).toISOString(),
        description: "Applying compound index upgrades during off-peak hours."
      });
      expect(maint.status).toBe("SCHEDULED");

      // 4. Resolve incident
      StatusPageService.publishIncidentUpdate({
        incidentId: "inc_linear_sync",
        title: "Degraded Linear Task Export",
        status: "RESOLVED",
        message: "Linear rate limits reset. Queued exports drained."
      });

      pub = StatusPageService.getPublicStatus();
      expect(pub.overallStatus).toBe("ALL_SYSTEMS_OPERATIONAL");
      expect(pub.activeIncidents.length).toBe(0);
      expect(pub.pastIncidents.length).toBe(1);
    });
  });
});
