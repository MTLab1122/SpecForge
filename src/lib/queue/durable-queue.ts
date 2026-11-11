import crypto from "node:crypto";
import {
  type JobType,
  type JobState,
  type DurableJob,
  type JobTelemetry,
  JOB_TIMEOUTS_MS
} from "./job-types.ts";
import { CreditLedger } from "../billing/credit-ledger.ts";
import { AppError, TenantIsolationError } from "../reliability/error-envelope.ts";
import { ValidationError } from "../transactions/constraints.ts";
import { Logger, AuditLogger } from "../reliability/observability.ts";

export interface EnqueueDurableJobOptions<T = any> {
  organizationId: string;
  userId: string;
  jobType: JobType;
  idempotencyKey?: string;
  payload: T;
  priority?: number;
  maxAttempts?: number;
  estimatedCredits?: number;
}

export class DurableJobQueue {
  private static jobs: Map<string, DurableJob> = new Map();
  private static idempotencyIndex: Map<string, string> = new Map(); // idempotencyKey -> jobId

  /**
   * Enqueues a new background job with idempotency deduplication and credit reservation.
   */
  public static async enqueue<T = any, R = any>(
    options: EnqueueDurableJobOptions<T>
  ): Promise<{ job: DurableJob<T, R>; isDuplicate: boolean }> {
    const key =
      options.idempotencyKey ||
      crypto
        .createHash("sha256")
        .update(`${options.organizationId}:${options.jobType}:${JSON.stringify(options.payload)}`)
        .digest("hex");

    // 1. Idempotency Check
    const existingJobId = this.idempotencyIndex.get(key);
    if (existingJobId) {
      const existing = this.jobs.get(existingJobId);
      if (existing) {
        Logger.info(`Idempotent enqueue hit for job '${existing.id}' (${existing.status})`, {
          organizationId: options.organizationId,
          userId: options.userId,
          context: { idempotencyKey: key, status: existing.status }
        });
        return { job: existing as DurableJob<T, R>, isDuplicate: true };
      }
    }

    const jobId = `djob_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const timeoutMs = JOB_TIMEOUTS_MS[options.jobType] || 2 * 60 * 1000;
    const creditsToReserve = options.estimatedCredits || 0;

    // 2. Cost Control: Credit Reservation
    if (creditsToReserve > 0) {
      CreditLedger.reserveCredits({
        organizationId: options.organizationId,
        jobId,
        amount: creditsToReserve
      });
    }

    const now = new Date();
    const job: DurableJob<T, R> = {
      id: jobId,
      organizationId: options.organizationId,
      userId: options.userId,
      jobType: options.jobType,
      idempotencyKey: key,
      status: "QUEUED",
      priority: options.priority ?? 0,
      payload: options.payload,
      result: null,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      creditsReserved: creditsToReserve,
      creditsCommitted: 0,
      timeoutMs,
      nextRunAt: now,
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null
    };

    this.jobs.set(jobId, job);
    this.idempotencyIndex.set(key, jobId);

    await AuditLogger.record({
      organizationId: options.organizationId,
      userId: options.userId,
      action: "JOB_ENQUEUED",
      entityName: "JOB",
      entityId: jobId,
      metadata: { jobType: options.jobType, priority: job.priority, creditsReserved: creditsToReserve }
    });

    return { job, isDuplicate: false };
  }

  /**
   * Atomically leases the highest-priority queued or retrying job ready to execute.
   */
  public static async leaseNextJob(workerId: string): Promise<DurableJob | null> {
    const now = new Date();

    const candidates = Array.from(this.jobs.values())
      .filter((j) => (j.status === "QUEUED" || j.status === "RETRYING") && j.nextRunAt <= now)
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

    if (candidates.length === 0) return null;

    const job = candidates[0];
    job.status = "PROCESSING";
    job.lockedAt = now;
    job.lockedBy = workerId;
    job.heartbeatAt = now;
    job.leaseExpiresAt = new Date(now.getTime() + job.timeoutMs);
    job.attempts += 1;
    job.updatedAt = now;

    return job;
  }

  /**
   * Marks a job as successfully finished and commits reserved credits.
   */
  public static async markSucceeded<R = any>(params: {
    jobId: string;
    result?: R;
    telemetry?: JobTelemetry;
  }): Promise<DurableJob> {
    const job = this.jobs.get(params.jobId);
    if (!job) throw new Error(`Job '${params.jobId}' not found.`);

    job.status = "SUCCEEDED";
    job.result = params.result || null;
    job.lockedAt = null;
    job.lockedBy = null;
    job.completedAt = new Date();
    job.updatedAt = new Date();
    job.telemetry = params.telemetry;

    // Commit credits in CreditLedger
    if (job.creditsReserved > 0) {
      const creditsToCharge = params.telemetry?.creditsCharged ?? job.creditsReserved;
      await CreditLedger.commitReservation({
        organizationId: job.organizationId,
        jobId: job.id,
        actualAmount: creditsToCharge,
        jobType: job.jobType,
        modelName: params.telemetry?.modelName,
        inputTokens: params.telemetry?.inputTokens,
        outputTokens: params.telemetry?.outputTokens,
        estimatedCostUsd: params.telemetry?.estimatedCostUsd
      });
      job.creditsCommitted = creditsToCharge;
    }

    await AuditLogger.record({
      organizationId: job.organizationId,
      userId: job.userId,
      action: "JOB_SUCCEEDED",
      entityName: "JOB",
      entityId: job.id,
      metadata: { jobType: job.jobType, attempts: job.attempts, latencyMs: params.telemetry?.latencyMs }
    });

    return job;
  }

  /**
   * Handles job failure: inspects error type to determine whether to retry or fail permanently.
   */
  public static async markFailed(params: {
    jobId: string;
    error: Error | string;
    isValidationError?: boolean;
    isAuthError?: boolean;
    baseDelayMs?: number;
  }): Promise<{ state: JobState; isDeadLetter: boolean; nextRunAt?: Date }> {
    const job = this.jobs.get(params.jobId);
    if (!job) throw new Error(`Job '${params.jobId}' not found.`);

    const err = typeof params.error === "string" ? new Error(params.error) : params.error;
    job.errorMessage = err.message;
    job.errorStack = err.stack || null;
    job.lockedAt = null;
    job.lockedBy = null;
    job.updatedAt = new Date();

    // 1. NON-RETRYABLE CHECKS
    // Rule: Do not retry validation errors or authentication errors without user action
    const isValidation =
      params.isValidationError ||
      err instanceof ValidationError ||
      err.name === "ValidationError" ||
      err.message.toLowerCase().includes("validation") ||
      err.message.toLowerCase().includes("schema");

    const isAuth =
      params.isAuthError ||
      err instanceof TenantIsolationError ||
      (err as any).status === 401 ||
      (err as any).status === 403 ||
      err.message.toLowerCase().includes("unauthenticated") ||
      err.message.toLowerCase().includes("unauthorized") ||
      err.message.toLowerCase().includes("api token");

    if (isValidation || isAuth) {
      job.status = "FAILED";
      // Refund reserved credits
      if (job.creditsReserved > 0) {
        await CreditLedger.refundReservation({
          organizationId: job.organizationId,
          jobId: job.id,
          reason: isValidation ? "Validation Error (Non-retryable)" : "Authentication Error (Requires user action)"
        });
      }
      return { state: "FAILED", isDeadLetter: false };
    }

    // 2. MAX ATTEMPTS EXCEEDED -> DEAD_LETTER
    if (job.attempts >= job.maxAttempts) {
      job.status = "DEAD_LETTER";
      if (job.creditsReserved > 0) {
        await CreditLedger.refundReservation({
          organizationId: job.organizationId,
          jobId: job.id,
          reason: `Max retry attempts (${job.maxAttempts}) exhausted.`
        });
      }
      return { state: "DEAD_LETTER", isDeadLetter: true };
    }

    // 3. TRANSIENT FAILURE -> RETRY WITH EXPONENTIAL BACKOFF
    const baseDelay = params.baseDelayMs ?? 1000;
    const jitter = Math.floor(Math.random() * 200);
    const delayMs = baseDelay * Math.pow(2, job.attempts - 1) + jitter;
    const nextRun = new Date(Date.now() + delayMs);

    job.status = "RETRYING";
    job.nextRunAt = nextRun;

    Logger.info(`Job '${job.id}' failed transiently (Attempt ${job.attempts}/${job.maxAttempts}). Retrying in ${delayMs}ms.`, {
      organizationId: job.organizationId,
      context: { errorMessage: err.message, nextRunAt: nextRun.toISOString() }
    });

    return { state: "RETRYING", isDeadLetter: false, nextRunAt: nextRun };
  }

  /**
   * Manually retries a DEAD_LETTER or FAILED job.
   */
  public static async retryJob(jobId: string, requestedByUserId: string): Promise<DurableJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    if (job.status !== "DEAD_LETTER" && job.status !== "FAILED") {
      throw new AppError({
        message: `Only DEAD_LETTER or FAILED jobs can be retried (current: '${job.status}').`,
        status: 400,
        code: "INVALID_JOB_STATE_FOR_RETRY"
      });
    }

    // Re-reserve credits if necessary
    if (job.creditsReserved > 0) {
      CreditLedger.reserveCredits({
        organizationId: job.organizationId,
        jobId: job.id,
        amount: job.creditsReserved
      });
    }

    const now = new Date();
    job.status = "QUEUED";
    job.attempts = 0;
    job.nextRunAt = now;
    job.errorMessage = null;
    job.errorStack = null;
    job.updatedAt = now;

    await AuditLogger.record({
      organizationId: job.organizationId,
      userId: requestedByUserId,
      action: "JOB_RETRY_INITIATED",
      entityName: "JOB",
      entityId: job.id,
      metadata: { previousState: "DEAD_LETTER" }
    });

    return job;
  }

  /**
   * Cancels a QUEUED or PROCESSING job.
   */
  public static async cancelJob(jobId: string, requestedByUserId: string, reason: string): Promise<DurableJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job '${jobId}' not found.`);

    if (job.status === "SUCCEEDED" || job.status === "CANCELLED") {
      throw new AppError({
        message: `Cannot cancel job in terminal state '${job.status}'.`,
        status: 400,
        code: "CANNOT_CANCEL_TERMINAL_JOB"
      });
    }

    job.status = "CANCELLED";
    job.lockedAt = null;
    job.lockedBy = null;
    job.errorMessage = `Cancelled: ${reason}`;
    job.updatedAt = new Date();

    if (job.creditsReserved > 0) {
      await CreditLedger.refundReservation({
        organizationId: job.organizationId,
        jobId: job.id,
        reason: `Job cancelled: ${reason}`
      });
    }

    await AuditLogger.record({
      organizationId: job.organizationId,
      userId: requestedByUserId,
      action: "JOB_CANCELLED",
      entityName: "JOB",
      entityId: job.id,
      metadata: { reason }
    });

    return job;
  }

  /**
   * Enforces job timeouts and reaps timed-out or hung executions.
   */
  public static reapTimeouts(now: Date = new Date()): number {
    let reapedCount = 0;
    for (const job of this.jobs.values()) {
      if (job.status === "PROCESSING" && job.leaseExpiresAt && job.leaseExpiresAt <= now) {
        job.status = "FAILED";
        job.lockedAt = null;
        job.lockedBy = null;
        job.errorMessage = `Job execution timed out after ${job.timeoutMs / 60000} minutes.`;
        job.updatedAt = now;
        reapedCount++;

        if (job.creditsReserved > 0) {
          CreditLedger.refundReservation({
            organizationId: job.organizationId,
            jobId: job.id,
            reason: "Execution timed out."
          });
        }
      }
    }
    return reapedCount;
  }

  /**
   * Retrieves job by ID.
   */
  public static getJob(jobId: string): DurableJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Lists jobs for an organization with optional status and type filtering.
   */
  public static listJobs(organizationId: string, filter?: { status?: JobState; jobType?: JobType }): DurableJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => {
        if (j.organizationId !== organizationId) return false;
        if (filter?.status && j.status !== filter.status) return false;
        if (filter?.jobType && j.jobType !== filter.jobType) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Clears in-memory queue (for tests).
   */
  public static clear(): void {
    this.jobs.clear();
    this.idempotencyIndex.clear();
  }
}
