import crypto from "node:crypto";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";

export interface QueueJob<T = any> {
  id: string;
  organizationId: string;
  jobType: string;
  payload: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  leaseExpiresAt?: Date | null;
  heartbeatAt?: Date | null;
  errorMessage?: string | null;
  errorStack?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnqueueOptions {
  organizationId: string;
  jobType: string;
  payload: any;
  priority?: number;
  maxAttempts?: number;
  runAt?: Date;
}

export class ReliableJobQueue {
  private static inMemoryQueue: Map<string, QueueJob> = new Map();

  /**
   * Enqueues a new background task.
   */
  public static async enqueue(options: EnqueueOptions): Promise<QueueJob> {
    const job: QueueJob = {
      id: `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      organizationId: options.organizationId,
      jobType: options.jobType,
      payload: options.payload,
      status: "PENDING",
      priority: options.priority ?? 0,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      nextRunAt: options.runAt ?? new Date(),
      lockedAt: null,
      lockedBy: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
      errorMessage: null,
      errorStack: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.inMemoryQueue.set(job.id, job);
    return job;
  }

  /**
   * Atomically leases the highest-priority pending job ready to run.
   */
  public static async dequeue(workerId: string, leaseDurationMs: number = 300_000): Promise<QueueJob | null> {
    const now = new Date();

    const candidates = Array.from(this.inMemoryQueue.values())
      .filter((j) => j.status === "PENDING" && j.nextRunAt <= now)
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

    if (candidates.length === 0) return null;

    const job = candidates[0];
    job.status = "PROCESSING";
    job.lockedAt = new Date();
    job.lockedBy = workerId;
    job.heartbeatAt = new Date();
    job.leaseExpiresAt = new Date(Date.now() + leaseDurationMs);
    job.attempts += 1;
    job.updatedAt = new Date();

    return job;
  }

  /**
   * Renews worker lease via heartbeat.
   */
  public static heartbeat(jobId: string, workerId: string, extendByMs: number = 300_000): boolean {
    const job = this.inMemoryQueue.get(jobId);
    if (!job || job.status !== "PROCESSING" || job.lockedBy !== workerId) {
      return false;
    }

    const now = new Date();
    job.heartbeatAt = now;
    job.leaseExpiresAt = new Date(now.getTime() + extendByMs);
    job.updatedAt = now;
    return true;
  }

  /**
   * Reaps hung or abandoned jobs whose lease has expired and resets them to PENDING.
   */
  public static reapExpiredLeases(now: Date = new Date()): number {
    let reapedCount = 0;
    for (const job of this.inMemoryQueue.values()) {
      if (job.status === "PROCESSING" && job.leaseExpiresAt && job.leaseExpiresAt <= now) {
        job.status = "PENDING";
        job.lockedAt = null;
        job.lockedBy = null;
        job.leaseExpiresAt = null;
        job.heartbeatAt = null;
        job.updatedAt = now;
        reapedCount++;
      }
    }
    return reapedCount;
  }

  /**
   * Fetches job by ID.
   */
  public static getJob(jobId: string): QueueJob | null {
    return this.inMemoryQueue.get(jobId) || null;
  }

  /**
   * Marks a job as successfully completed.
   */
  public static async markCompleted(jobId: string): Promise<void> {
    const job = this.inMemoryQueue.get(jobId);
    if (!job) return;

    job.status = "COMPLETED";
    job.lockedAt = null;
    job.lockedBy = null;
    job.updatedAt = new Date();
  }

  /**
   * Handles job failure: computes exponential backoff retry or routes to Dead-Letter Queue (DLQ).
   */
  public static async markFailed(params: {
    jobId: string;
    error: Error | string;
    baseDelayMs?: number;
    backoffFactor?: number;
  }): Promise<{ isDeadLetter: boolean; nextRunAt?: Date }> {
    const job = this.inMemoryQueue.get(params.jobId);
    if (!job) {
      throw new Error(`Job '${params.jobId}' not found.`);
    }

    const err = typeof params.error === "string" ? new Error(params.error) : params.error;
    job.errorMessage = err.message;
    job.errorStack = err.stack || null;
    job.lockedAt = null;
    job.lockedBy = null;
    job.updatedAt = new Date();

    if (job.attempts >= job.maxAttempts) {
      job.status = "DEAD_LETTER";
      return { isDeadLetter: true };
    }

    // Exponential backoff formula with jitter
    const baseDelay = params.baseDelayMs ?? 1000;
    const factor = params.backoffFactor ?? 2;
    const jitter = Math.floor(Math.random() * 200);
    const delayMs = baseDelay * Math.pow(factor, job.attempts - 1) + jitter;

    const nextRun = new Date(Date.now() + delayMs);
    job.status = "PENDING";
    job.nextRunAt = nextRun;

    return { isDeadLetter: false, nextRunAt: nextRun };
  }

  /**
   * Retrieves all failed jobs in the Dead-Letter Queue for an organization.
   */
  public static listDeadLetters(organizationId?: string): QueueJob[] {
    return Array.from(this.inMemoryQueue.values()).filter(
      (j) => j.status === "DEAD_LETTER" && (!organizationId || j.organizationId === organizationId)
    );
  }

  /**
   * Manually replays a Dead-Letter Queue job after fixing upstream configuration.
   */
  public static async replayDeadLetter(jobId: string): Promise<QueueJob> {
    const job = this.inMemoryQueue.get(jobId);
    if (!job || job.status !== "DEAD_LETTER") {
      throw new Error(`Dead-Letter job '${jobId}' not found.`);
    }

    job.status = "PENDING";
    job.attempts = 0;
    job.nextRunAt = new Date();
    job.errorMessage = null;
    job.errorStack = null;
    job.updatedAt = new Date();

    return job;
  }

  /**
   * Clears in-memory queue (used in testing).
   */
  public static resetQueue(): void {
    this.inMemoryQueue.clear();
  }
}

// ----------------------------------------------------------------------------
// IDEMPOTENT OPERATIONS SERVICE
// ----------------------------------------------------------------------------

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  isProcessing: boolean;
  cachedResponse?: {
    statusCode: number;
    body: any;
  };
}

export class IdempotencyService {
  private static store: Map<
    string,
    {
      requestHash: string;
      status: "PROCESSING" | "COMPLETED";
      statusCode?: number;
      body?: any;
      expiresAt: Date;
    }
  > = new Map();

  /**
   * Computes a canonical hash of the request payload.
   */
  public static computeRequestHash(payload: any): string {
    const canonical = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }

  /**
   * Checks if an idempotency key was previously executed or is currently processing.
   */
  public static check(key: string, currentRequestHash: string): IdempotencyCheckResult {
    const record = this.store.get(key);
    if (!record) {
      // Reserve key in PROCESSING state
      this.store.set(key, {
        requestHash: currentRequestHash,
        status: "PROCESSING",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
      return { isDuplicate: false, isProcessing: false };
    }

    // Check payload consistency
    if (record.requestHash !== currentRequestHash) {
      throw new Error(
        `Idempotency Conflict: Key '${key}' was previously used with a different request payload.`
      );
    }

    if (record.status === "PROCESSING") {
      return { isDuplicate: true, isProcessing: true };
    }

    return {
      isDuplicate: true,
      isProcessing: false,
      cachedResponse: {
        statusCode: record.statusCode ?? 200,
        body: record.body
      }
    };
  }

  /**
   * Stores the final successful response for an idempotency key.
   */
  public static storeResult(key: string, statusCode: number, body: any): void {
    const record = this.store.get(key);
    if (record) {
      record.status = "COMPLETED";
      record.statusCode = statusCode;
      record.body = body;
    }
  }

  public static clear(): void {
    this.store.clear();
  }
}
