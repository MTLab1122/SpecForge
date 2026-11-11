export type JobType =
  | "DOCUMENT_PROCESSING"
  | "AI_EXTRACTION"
  | "TRANSCRIPTION"
  | "EXPORT_GENERATION"
  | "INTEGRATION_SYNC"
  | "NOTIFICATION_DISPATCH"
  | "WEBHOOK_PROCESSING";

export type JobState =
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "RETRYING"
  | "DEAD_LETTER"
  | "CANCELLED";

export interface JobTelemetry {
  modelName?: string;
  modelVersion?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
  creditsCharged?: number;
  isCached?: boolean;
}

export const JOB_TIMEOUTS_MS: Record<JobType, number> = {
  DOCUMENT_PROCESSING: 2 * 60 * 1000,   // 2 minutes
  AI_EXTRACTION: 3 * 60 * 1000,         // 3 minutes
  TRANSCRIPTION: 10 * 60 * 1000,        // 10 minutes
  EXPORT_GENERATION: 2 * 60 * 1000,     // 2 minutes
  INTEGRATION_SYNC: 2 * 60 * 1000,      // 2 minutes
  NOTIFICATION_DISPATCH: 1 * 60 * 1000, // 1 minute
  WEBHOOK_PROCESSING: 1 * 60 * 1000     // 1 minute
};

export interface DurableJob<T = any, R = any> {
  id: string;
  organizationId: string;
  userId: string;
  jobType: JobType;
  idempotencyKey: string;
  status: JobState;
  priority: number;
  payload: T;
  result?: R | null;
  attempts: number;
  maxAttempts: number;
  creditsReserved: number;
  creditsCommitted: number;
  telemetry?: JobTelemetry;
  humanReviewRequired?: boolean;
  errorMessage?: string | null;
  errorStack?: string | null;
  timeoutMs: number;
  nextRunAt: Date;
  lockedAt?: Date | null;
  lockedBy?: string | null;
  leaseExpiresAt?: Date | null;
  heartbeatAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}
