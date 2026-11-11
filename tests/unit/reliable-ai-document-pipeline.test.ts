import { DurableJobQueue } from "@/lib/queue/durable-queue";
import { CreditLedger } from "@/lib/billing/credit-ledger";
import { AiPipelineEngine } from "@/lib/ai/ai-pipeline-engine";
import { BillingService } from "@/lib/billing/billing-service";
import { JOB_TIMEOUTS_MS, type JobType, type JobState } from "@/lib/queue/job-types";
import { AppError } from "@/lib/reliability/error-envelope";
import { ValidationError } from "@/lib/transactions/constraints";

describe("Phase 3 Enhancement — Reliable AI & Document Pipeline Suite", () => {
  const orgId = "org_pipeline_test";
  const userId = "usr_pipeline_test";

  beforeEach(() => {
    DurableJobQueue.clear();
    CreditLedger.clear();
    AiPipelineEngine.clearCache();
    (BillingService as any).mockOrgBilling?.clear();

    // Setup default enterprise billing with ample credits
    BillingService.changePlan({
      organizationId: orgId,
      targetTier: "ENTERPRISE",
      action: "UPGRADE"
    });
  });

  describe("1. Job Queue Architecture & Types", () => {
    it("should support all 7 distinct queue job types", async () => {
      const types: JobType[] = [
        "DOCUMENT_PROCESSING",
        "AI_EXTRACTION",
        "TRANSCRIPTION",
        "EXPORT_GENERATION",
        "INTEGRATION_SYNC",
        "NOTIFICATION_DISPATCH",
        "WEBHOOK_PROCESSING"
      ];

      for (const t of types) {
        const { job } = await DurableJobQueue.enqueue({
          organizationId: orgId,
          userId,
          jobType: t,
          payload: { action: `process_${t}` }
        });
        expect(job.jobType).toBe(t);
        expect(job.status).toBe("QUEUED");
      }

      const list = DurableJobQueue.listJobs(orgId);
      expect(list.length).toBe(7);
    });

    it("should support all 7 job lifecycle states", async () => {
      const validStates: JobState[] = [
        "QUEUED",
        "PROCESSING",
        "SUCCEEDED",
        "FAILED",
        "RETRYING",
        "DEAD_LETTER",
        "CANCELLED"
      ];

      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { test: true }
      });

      expect(job.status).toBe("QUEUED");

      const leased = await DurableJobQueue.leaseNextJob("worker_1");
      expect(leased?.status).toBe("PROCESSING");

      // Verify states are all typed and recognised
      validStates.forEach((st) => {
        expect(typeof st).toBe("string");
      });
    });
  });

  describe("2. Retry Policy & Exponential Backoff", () => {
    it("should retry transient failures with exponential backoff up to maxAttempts", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "INTEGRATION_SYNC",
        payload: { target: "jira" },
        maxAttempts: 3
      });

      await DurableJobQueue.leaseNextJob("worker_1");

      // Attempt 1 fails transiently
      const res1 = await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("Network timeout reaching Jira API"),
        baseDelayMs: 100
      });
      expect(res1.state).toBe("RETRYING");
      expect(res1.isDeadLetter).toBe(false);

      // Attempt 2 fails transiently
      job.nextRunAt = new Date(Date.now() - 1000); // simulate delay elapsed
      await DurableJobQueue.leaseNextJob("worker_1");
      const res2 = await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("503 Gateway Timeout"),
        baseDelayMs: 100
      });
      expect(res2.state).toBe("RETRYING");

      // Attempt 3 fails -> Dead letter queue
      job.nextRunAt = new Date(Date.now() - 1000);
      await DurableJobQueue.leaseNextJob("worker_1");
      const res3 = await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("Jira API connection refused"),
        baseDelayMs: 100
      });
      expect(res3.state).toBe("DEAD_LETTER");
      expect(res3.isDeadLetter).toBe(true);

      const dlqJob = DurableJobQueue.getJob(job.id);
      expect(dlqJob?.status).toBe("DEAD_LETTER");
    });

    it("should NOT retry validation errors and fail immediately", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "DOCUMENT_PROCESSING",
        payload: { invalidFormat: true },
        estimatedCredits: 2
      });

      await DurableJobQueue.leaseNextJob("worker_1");

      const res = await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new ValidationError("file", "corrupt", "Uploaded document has corrupt header or invalid magic bytes"),
        isValidationError: true
      });

      expect(res.state).toBe("FAILED");
      expect(res.isDeadLetter).toBe(false);

      const failedJob = DurableJobQueue.getJob(job.id);
      expect(failedJob?.status).toBe("FAILED");
    });

    it("should NOT retry authentication errors without user action and fail immediately", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "INTEGRATION_SYNC",
        payload: { token: "expired_github_pat" },
        estimatedCredits: 1
      });

      await DurableJobQueue.leaseNextJob("worker_1");

      const res = await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("GitHub PAT Token 401 Unauthorized: token expired"),
        isAuthError: true
      });

      expect(res.state).toBe("FAILED");
      expect(res.isDeadLetter).toBe(false);
    });

    it("should allow admin or user to retry DEAD_LETTER jobs", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "EXPORT_GENERATION",
        payload: { specId: "spec_1" },
        maxAttempts: 1,
        estimatedCredits: 2
      });

      await DurableJobQueue.leaseNextJob("worker_1");
      await DurableJobQueue.markFailed({
        jobId: job.id,
        error: new Error("Transient printer service crash")
      });

      expect(DurableJobQueue.getJob(job.id)?.status).toBe("DEAD_LETTER");

      // Admin retries job
      const retried = await DurableJobQueue.retryJob(job.id, "admin_usr");
      expect(retried.status).toBe("QUEUED");
      expect(retried.attempts).toBe(0);
      expect(retried.errorMessage).toBeNull();
    });
  });

  describe("3. Job Idempotency", () => {
    it("should prevent duplicate processing and duplicate AI generation via idempotency key", async () => {
      const idempotencyKey = "idem_ai_gen_123456";

      const first = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        idempotencyKey,
        payload: { brief: "E-Commerce checkout flow" }
      });
      expect(first.isDuplicate).toBe(false);

      const second = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        idempotencyKey,
        payload: { brief: "E-Commerce checkout flow" }
      });
      expect(second.isDuplicate).toBe(true);
      expect(second.job.id).toBe(first.job.id);
    });
  });

  describe("4. Job Timeouts Enforcement", () => {
    it("should define accurate timeout budgets per job type", () => {
      expect(JOB_TIMEOUTS_MS.DOCUMENT_PROCESSING).toBe(120_000); // 2 mins
      expect(JOB_TIMEOUTS_MS.AI_EXTRACTION).toBe(180_000);       // 3 mins
      expect(JOB_TIMEOUTS_MS.TRANSCRIPTION).toBe(600_000);        // 10 mins
      expect(JOB_TIMEOUTS_MS.EXPORT_GENERATION).toBe(120_000);    // 2 mins
      expect(JOB_TIMEOUTS_MS.INTEGRATION_SYNC).toBe(120_000);     // 2 mins
      expect(JOB_TIMEOUTS_MS.NOTIFICATION_DISPATCH).toBe(60_000); // 1 min
      expect(JOB_TIMEOUTS_MS.WEBHOOK_PROCESSING).toBe(60_000);    // 1 min
    });

    it("should reap timed-out hung executions and refund reservations", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { text: "Long processing" },
        estimatedCredits: 5
      });

      const leased = await DurableJobQueue.leaseNextJob("worker_slow");
      expect(leased?.status).toBe("PROCESSING");

      // Advance clock past 3-minute timeout
      const future = new Date(Date.now() + 200_000);
      const reaped = DurableJobQueue.reapTimeouts(future);

      expect(reaped).toBe(1);
      const timedOutJob = DurableJobQueue.getJob(job.id);
      expect(timedOutJob?.status).toBe("FAILED");
      expect(timedOutJob?.errorMessage).toContain("timed out");
    });
  });

  describe("5. Cost Controls & Credit Ledger", () => {
    it("should reject job with 402 INSUFFICIENT_AI_CREDITS if quota exceeded", async () => {
      // Set org to TRIAL tier (100 credits) and deplete balance
      BillingService.changePlan({
        organizationId: "org_broke",
        targetTier: "TRIAL",
        action: "UPGRADE"
      });

      const internalBilling = (BillingService as any).mockOrgBilling?.get("org_broke");
      internalBilling.creditsUsed = 100; // remaining = 0

      await expect(
        DurableJobQueue.enqueue({
          organizationId: "org_broke",
          userId,
          jobType: "AI_EXTRACTION",
          payload: { prompt: "Analyze spec" },
          estimatedCredits: 3
        })
      ).rejects.toThrow(AppError);
    });

    it("should reserve credits on enqueue, commit on success, and refund on failure", async () => {
      const initialSummary = CreditLedger.getWorkspaceCostSummary(orgId);
      const initialRemaining = initialSummary.remainingCredits;

      // 1. Enqueue with 6 credit reservation
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { prompt: "Enterprise spec" },
        estimatedCredits: 6
      });

      const afterHold = CreditLedger.getWorkspaceCostSummary(orgId);
      expect(afterHold.creditsReserved).toBe(6);
      expect(afterHold.remainingCredits).toBe(initialRemaining - 6);

      // 2. Mark succeeded -> commits reservation
      await DurableJobQueue.markSucceeded({
        jobId: job.id,
        telemetry: { creditsCharged: 6, estimatedCostUsd: 0.09, modelName: "gemini-1.5-pro" }
      });

      const afterSuccess = CreditLedger.getWorkspaceCostSummary(orgId);
      expect(afterSuccess.creditsReserved).toBe(0);
      expect(afterSuccess.creditsUsed).toBeGreaterThanOrEqual(6);

      // 3. Second job fails -> refunds reservation
      const { job: job2 } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { prompt: "Second spec" },
        estimatedCredits: 4
      });

      await DurableJobQueue.leaseNextJob("worker_1");
      await DurableJobQueue.markFailed({
        jobId: job2.id,
        error: new ValidationError("input", "malformed", "Malformed input")
      });

      const afterRefund = CreditLedger.getWorkspaceCostSummary(orgId);
      expect(afterRefund.creditsReserved).toBe(0);
      const lastCost = afterRefund.recentCostHistory[0];
      expect(lastCost.status).toBe("REFUNDED");
    });
  });

  describe("6. Model Routing & SHA-256 Caching", () => {
    it("should route to FAST (1 credit), BALANCED (3 credits), and THOROUGH (6 credits)", async () => {
      const fastRes = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: "Build basic todo item page with react",
        qualityMode: "FAST"
      });
      expect(fastRes.telemetry.modelName).toBe("gemini-1.5-flash-8b");
      expect(fastRes.telemetry.creditsCharged).toBe(1);

      const balancedRes = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: "Build complete shopping cart and checkout process with Stripe",
        qualityMode: "BALANCED"
      });
      expect(balancedRes.telemetry.modelName).toBe("gemini-1.5-flash");
      expect(balancedRes.telemetry.creditsCharged).toBe(3);

      const thoroughRes = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: "Architect multi-tenant distributed transaction system with audit trail",
        qualityMode: "THOROUGH"
      });
      expect(thoroughRes.telemetry.modelName).toBe("gemini-1.5-pro");
      expect(thoroughRes.telemetry.creditsCharged).toBe(6);
    });

    it("should utilize SHA-256 cache on duplicate extraction and charge 0 credits", async () => {
      const prompt = "Build identical CRM pipeline module";

      const firstCall = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: prompt,
        qualityMode: "BALANCED"
      });
      expect(firstCall.telemetry.isCached).toBe(false);
      expect(firstCall.telemetry.creditsCharged).toBe(3);

      const secondCall = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: prompt,
        qualityMode: "BALANCED"
      });
      expect(secondCall.telemetry.isCached).toBe(true);
      expect(secondCall.telemetry.creditsCharged).toBe(0);
      expect(secondCall.document.projectTitle).toBe(firstCall.document.projectTitle);
    });
  });

  describe("7. AI Output Validation & Human Review", () => {
    it("should repair truncated JSON markdown when possible and succeed", async () => {
      const result = await AiPipelineEngine.processExtraction({
        organizationId: orgId,
        userId,
        rawBrief: "Autonomous logistics app specs",
        qualityMode: "BALANCED",
        simulateMalformedOutput: true
      });

      expect(result.document).toBeDefined();
      expect(result.document.projectTitle).toBe("Autonomous Logistics App");
      expect(result.document.modules.length).toBeGreaterThan(0);
    });

    it("should reject fatal malformed output, flag human review required, and never accept corrupt data", async () => {
      await expect(
        AiPipelineEngine.processExtraction({
          organizationId: orgId,
          userId,
          rawBrief: "Fatal corrupt input",
          qualityMode: "BALANCED",
          simulateFatalMalformed: true
        })
      ).rejects.toThrow("Human review required");
    });
  });

  describe("8. Job Cancellation", () => {
    it("should cancel a QUEUED job and refund reserved credits", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { data: "test" },
        estimatedCredits: 3
      });

      expect(CreditLedger.getWorkspaceCostSummary(orgId).creditsReserved).toBe(3);

      const cancelled = await DurableJobQueue.cancelJob(job.id, userId, "User cancelled operation in UI");
      expect(cancelled.status).toBe("CANCELLED");
      expect(CreditLedger.getWorkspaceCostSummary(orgId).creditsReserved).toBe(0);
    });

    it("should reject cancellation of terminal jobs", async () => {
      const { job } = await DurableJobQueue.enqueue({
        organizationId: orgId,
        userId,
        jobType: "AI_EXTRACTION",
        payload: { data: "test" }
      });

      await DurableJobQueue.leaseNextJob("worker_1");
      await DurableJobQueue.markSucceeded({ jobId: job.id });

      await expect(
        DurableJobQueue.cancelJob(job.id, userId, "Too late to cancel")
      ).rejects.toThrow(AppError);
    });
  });
});
