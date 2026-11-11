import { RequestContextHolder } from "@/lib/reliability/request-context";
import {
  ErrorEnvelope,
  AppError,
  TenantIsolationError,
  CircuitBreakerOpenError,
  ValidationFailedError,
  RateLimitExceededError
} from "@/lib/reliability/error-envelope";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";
import { withReliability } from "@/lib/reliability/api-guard";

describe("Phase 3.1 — Reliability Baseline Unit & Integration Tests", () => {
  beforeEach(() => {
    CircuitBreakerRegistry.resetAll();
  });

  describe("1. Request Context & Distributed Tracing", () => {
    it("should initialize and propagate context within AsyncLocalStorage", async () => {
      const mockContext = {
        traceId: "trace_alpha_123",
        spanId: "span_root_001",
        organizationId: "org_apex_digital",
        userId: "usr_lead_dev",
        startTime: Date.now()
      };

      await RequestContextHolder.run(mockContext, async () => {
        expect(RequestContextHolder.getTraceId()).toBe("trace_alpha_123");
        expect(RequestContextHolder.getTenantId()).toBe("org_apex_digital");
        expect(RequestContextHolder.getUserId()).toBe("usr_lead_dev");
      });
    });

    it("should parse incoming HTTP headers into structured RequestContext", () => {
      const headers = new Headers({
        "x-trace-id": "trace_client_req_99",
        "x-organization-id": "org_client_tenant",
        "x-user-id": "usr_client_01",
        "x-forwarded-for": "203.0.113.195, 10.0.0.1",
        "user-agent": "Mozilla/5.0 Test Runner"
      });

      const ctx = RequestContextHolder.createFromHeaders(headers, "/api/v1/projects");
      expect(ctx.traceId).toBe("trace_client_req_99");
      expect(ctx.organizationId).toBe("org_client_tenant");
      expect(ctx.userId).toBe("usr_client_01");
      expect(ctx.clientIp).toBe("203.0.113.195");
      expect(ctx.routePath).toBe("/api/v1/projects");
    });
  });

  describe("2. RFC 7807 Problem Details & Domain Error Hierarchy", () => {
    it("should serialize TenantIsolationError to RFC 7807 format with status 403", () => {
      const error = new TenantIsolationError("Unauthorized tenant boundary breach");
      const problem = ErrorEnvelope.toProblemDetails(error, "/api/v1/estimates");

      expect(problem.status).toBe(403);
      expect(problem.code).toBe("TENANT_ACCESS_FORBIDDEN");
      expect(problem.type).toBe("https://specforge.io/errors/tenant-access-forbidden");
      expect(problem.detail).toContain("Unauthorized tenant boundary breach");
      expect(problem.traceId).toBeDefined();
    });

    it("should format CircuitBreakerOpenError with degradedMode and retryAfterSec", () => {
      const error = new CircuitBreakerOpenError("LLM_OPENAI", 45);
      const problem = ErrorEnvelope.toProblemDetails(error, "/api/v1/ai/extract");

      expect(problem.status).toBe(503);
      expect(problem.code).toBe("CIRCUIT_BREAKER_OPEN");
      expect(problem.degradedMode).toBe(true);
      expect(problem.retryAfterSec).toBe(45);
    });

    it("should attach invalidParams array for ValidationFailedError", () => {
      const error = new ValidationFailedError([
        { name: "totalHours", reason: "Expected positive integer" },
        { name: "currency", reason: "Invalid ISO 4217 currency code" }
      ]);
      const problem = ErrorEnvelope.toProblemDetails(error, "/api/v1/estimates");

      expect(problem.status).toBe(422);
      expect(problem.invalidParams).toHaveLength(2);
      expect(problem.invalidParams![0].name).toBe("totalHours");
    });

    it("should convert error to HTTP Response with application/problem+json content-type", async () => {
      const error = new RateLimitExceededError(30);
      const response = ErrorEnvelope.toResponse(error, "/api/v1/proposals");

      expect(response.status).toBe(429);
      expect(response.headers.get("Content-Type")).toContain("application/problem+json");
      expect(response.headers.get("Retry-After")).toBe("30");

      const body = await response.json();
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("3. Circuit Breaker Registry & Graceful Degradation", () => {
    it("should execute operations in CLOSED state normally", async () => {
      let callCount = 0;
      const result = await CircuitBreakerRegistry.executeWithDegradation(
        "EMAIL_RESEND",
        async () => {
          callCount++;
          return { sent: true, messageId: "msg_123" };
        }
      );

      expect(result.sent).toBe(true);
      expect(callCount).toBe(1);
    });

    it("should trip breaker to OPEN state after consecutive failures and engage fallback", async () => {
      const failingOp = async () => {
        throw new Error("504 Gateway Timeout from Upstream");
      };

      const fallbackOp = async () => {
        return { fallbackEngaged: true, data: "cached_fallback_response" };
      };

      // Trip the breaker (threshold = 3 for LLM_OPENAI)
      for (let i = 0; i < 3; i++) {
        await expect(
          CircuitBreakerRegistry.executeWithDegradation("LLM_OPENAI", failingOp)
        ).rejects.toThrow(/504 Gateway Timeout/);
      }

      const breaker = CircuitBreakerRegistry.getBreaker("LLM_OPENAI");
      expect(breaker.getState()).toBe("OPEN");

      // Once OPEN, fallback should execute smoothly
      const fallbackResult = await CircuitBreakerRegistry.executeWithDegradation(
        "LLM_OPENAI",
        failingOp,
        fallbackOp
      );

      expect(fallbackResult.fallbackEngaged).toBe(true);
      expect(fallbackResult.data).toBe("cached_fallback_response");
    });

    it("should report global reliability status as DEGRADED when non-critical breaker is open", async () => {
      const initialStatus = CircuitBreakerRegistry.getGlobalStatus();
      expect(initialStatus.status).toBe("HEALTHY");

      // Force JIRA breaker open
      for (let i = 0; i < 3; i++) {
        await expect(
          CircuitBreakerRegistry.executeWithDegradation("JIRA", async () => {
            throw new Error("Jira API Unreachable");
          })
        ).rejects.toThrow();
      }

      const updatedStatus = CircuitBreakerRegistry.getGlobalStatus();
      expect(updatedStatus.status).toBe("DEGRADED");
      expect(updatedStatus.openServices).toContain("JIRA");
    });
  });

  describe("4. API Guard Higher-Order Wrapper", () => {
    it("should wrap route execution, inject security headers, and return traceId", async () => {
      const guardedHandler = withReliability(async (req, ctx) => {
        return new Response(JSON.stringify({ success: true, message: "OK" }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      });

      const request = new Request("https://specforge.io/api/v1/projects", {
        method: "GET",
        headers: { "x-trace-id": "trace_test_suite_42" }
      });

      const response = await guardedHandler(request);
      expect(response.status).toBe(200);
      expect(response.headers.get("x-trace-id")).toBe("trace_test_suite_42");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("DENY");
      expect(response.headers.get("x-latency-ms")).toBeDefined();
    });

    it("should enforce tenant requirement and return 403 RFC 7807 when tenant header is missing", async () => {
      const tenantGuardedHandler = withReliability(
        async (req, ctx) => {
          return new Response(JSON.stringify({ success: true }), { status: 200 });
        },
        { requireTenant: true }
      );

      const requestWithoutTenant = new Request("https://specforge.io/api/v1/projects", {
        method: "POST"
      });

      const response = await tenantGuardedHandler(requestWithoutTenant);
      expect(response.status).toBe(403);
      expect(response.headers.get("Content-Type")).toContain("application/problem+json");

      const body = await response.json();
      expect(body.code).toBe("TENANT_ACCESS_FORBIDDEN");
      expect(body.detail).toContain("Missing x-organization-id");
    });
  });
});

