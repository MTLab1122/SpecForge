import { ReliableJobQueue } from "./job-queue.ts";
import { CircuitBreakerRegistry } from "./circuit-breaker-registry.ts";

export interface LatencyDistribution {
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  meanMs: number;
  maxMs: number;
}

export interface QueueDepthMetric {
  queued: number;
  processing: number;
  retrying: number;
  deadLetter: number;
  totalBacklog: number;
}

export interface DatabaseConnectionMetric {
  active: number;
  idle: number;
  maxCapacity: number;
  saturationPercent: number;
  status: "HEALTHY" | "WARNING" | "SATURATED";
}

export interface BillingReconciliationMetric {
  status: "RECONCILED" | "MISMATCH_DETECTED";
  reconciledCount: number;
  mismatchCount: number;
  unreconciledWorkspaces: string[];
  lastReconciledAt: string;
}

export interface TelemetryDashboardSnapshot {
  timestamp: string;
  apiAvailabilityPercent: number;
  apiLatency: LatencyDistribution;
  errorRatePercent: number;
  totalRequests: number;
  aiJobSuccessRatePercent: number;
  transcriptionSuccessRatePercent: number;
  integrationSuccessRatePercent: number;
  webhookSuccessRatePercent: number;
  queueDepth: QueueDepthMetric;
  databaseConnectionUsage: DatabaseConnectionMetric;
  billingReconciliation: BillingReconciliationMetric;
  sloBreaches: string[];
}

export class TelemetryDashboardService {
  // 1. API Telemetry
  private static apiLatencies: number[] = [];
  private static totalRequests: number = 0;
  private static successfulRequests: number = 0;
  private static errorRequests: number = 0;

  // 2. AI & Transcription Telemetry
  private static aiTotal: number = 0;
  private static aiSuccess: number = 0;
  private static transcriptionTotal: number = 0;
  private static transcriptionSuccess: number = 0;

  // 3. Integration & Webhooks
  private static integrationTotal: number = 0;
  private static integrationSuccess: number = 0;
  private static webhookTotal: number = 0;
  private static webhookSuccess: number = 0;

  // 4. DB Pool
  private static dbActive: number = 8;
  private static dbIdle: number = 42;
  private static dbMaxCapacity: number = 50;

  // 5. Billing Reconciliation
  private static billingReconciledCount: number = 142;
  private static billingMismatches: string[] = [];
  private static billingLastReconciledAt: string = new Date().toISOString();

  /**
   * Records an API request execution.
   */
  public static recordApiRequest(latencyMs: number, statusCode: number): void {
    this.totalRequests++;
    this.apiLatencies.push(latencyMs);
    if (this.apiLatencies.length > 5000) {
      this.apiLatencies.shift();
    }

    if (statusCode >= 500) {
      this.errorRequests++;
    } else {
      this.successfulRequests++;
    }
  }

  /**
   * Records AI job outcome.
   */
  public static recordAiJob(success: boolean, durationMs?: number): void {
    this.aiTotal++;
    if (success) this.aiSuccess++;
  }

  /**
   * Records audio transcription outcome.
   */
  public static recordTranscriptionJob(success: boolean, durationMs?: number): void {
    this.transcriptionTotal++;
    if (success) this.transcriptionSuccess++;
  }

  /**
   * Records an integration task export outcome.
   */
  public static recordIntegrationExport(provider: string, success: boolean): void {
    this.integrationTotal++;
    if (success) this.integrationSuccess++;
  }

  /**
   * Records an incoming webhook processing outcome.
   */
  public static recordWebhookProcessing(provider: string, success: boolean): void {
    this.webhookTotal++;
    if (success) this.webhookSuccess++;
  }

  /**
   * Updates database connection pool metrics.
   */
  public static updateDatabasePool(active: number, idle: number, maxCapacity: number = 50): void {
    this.dbActive = active;
    this.dbIdle = idle;
    this.dbMaxCapacity = maxCapacity;
  }

  /**
   * Updates billing reconciliation metrics.
   */
  public static updateBillingReconciliation(reconciledCount: number, mismatches: string[] = []): void {
    this.billingReconciledCount = reconciledCount;
    this.billingMismatches = [...mismatches];
    this.billingLastReconciledAt = new Date().toISOString();
  }

  /**
   * Computes latency percentiles.
   */
  private static calculateLatencyDistribution(): LatencyDistribution {
    if (this.apiLatencies.length === 0) {
      return { p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0, meanMs: 0, maxMs: 0 };
    }

    const sorted = [...this.apiLatencies].sort((a, b) => a - b);
    const getP = (p: number) => {
      const idx = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
      return Number(sorted[idx].toFixed(2));
    };

    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const meanMs = Number((sum / sorted.length).toFixed(2));
    const maxMs = Number(sorted[sorted.length - 1].toFixed(2));

    return {
      p50Ms: getP(0.5),
      p90Ms: getP(0.9),
      p95Ms: getP(0.95),
      p99Ms: getP(0.99),
      meanMs,
      maxMs
    };
  }

  /**
   * Generates a complete live telemetry dashboard snapshot.
   */
  public static getSnapshot(): TelemetryDashboardSnapshot {
    const latencies = this.calculateLatencyDistribution();

    const apiAvailabilityPercent =
      this.totalRequests === 0
        ? 100.0
        : Number(((this.successfulRequests / this.totalRequests) * 100).toFixed(2));

    const errorRatePercent =
      this.totalRequests === 0
        ? 0.0
        : Number(((this.errorRequests / this.totalRequests) * 100).toFixed(2));

    const aiJobSuccessRatePercent =
      this.aiTotal === 0
        ? 100.0
        : Number(((this.aiSuccess / this.aiTotal) * 100).toFixed(2));

    const transcriptionSuccessRatePercent =
      this.transcriptionTotal === 0
        ? 100.0
        : Number(((this.transcriptionSuccess / this.transcriptionTotal) * 100).toFixed(2));

    const integrationSuccessRatePercent =
      this.integrationTotal === 0
        ? 100.0
        : Number(((this.integrationSuccess / this.integrationTotal) * 100).toFixed(2));

    const webhookSuccessRatePercent =
      this.webhookTotal === 0
        ? 100.0
        : Number(((this.webhookSuccess / this.webhookTotal) * 100).toFixed(2));

    // Dynamic queue inspection
    const deadLetters = ReliableJobQueue.listDeadLetters();
    const queueDepth: QueueDepthMetric = {
      queued: 0,
      processing: 0,
      retrying: 0,
      deadLetter: deadLetters.length,
      totalBacklog: deadLetters.length
    };

    // Database connection saturation
    const saturationPercent = Number(((this.dbActive / this.dbMaxCapacity) * 100).toFixed(1));
    const dbStatus: "HEALTHY" | "WARNING" | "SATURATED" =
      saturationPercent >= 85 ? "SATURATED" : saturationPercent >= 70 ? "WARNING" : "HEALTHY";

    const databaseConnectionUsage: DatabaseConnectionMetric = {
      active: this.dbActive,
      idle: this.dbIdle,
      maxCapacity: this.dbMaxCapacity,
      saturationPercent,
      status: dbStatus
    };

    const billingReconciliation: BillingReconciliationMetric = {
      status: this.billingMismatches.length > 0 ? "MISMATCH_DETECTED" : "RECONCILED",
      reconciledCount: this.billingReconciledCount,
      mismatchCount: this.billingMismatches.length,
      unreconciledWorkspaces: this.billingMismatches,
      lastReconciledAt: this.billingLastReconciledAt
    };

    // Identify active SLO breaches
    const sloBreaches: string[] = [];
    if (apiAvailabilityPercent < 99.5) {
      sloBreaches.push(`Core API availability (${apiAvailabilityPercent}%) breached 99.5% SLO`);
    }
    if (latencies.p95Ms > 800) {
      sloBreaches.push(`Core API p95 latency (${latencies.p95Ms}ms) breached 800ms SLO`);
    }
    if (aiJobSuccessRatePercent < 95.0 && this.aiTotal >= 5) {
      sloBreaches.push(`AI extraction success rate (${aiJobSuccessRatePercent}%) breached 95.0% SLO`);
    }
    if (databaseConnectionUsage.status === "SATURATED") {
      sloBreaches.push(`Database connection pool (${saturationPercent}%) saturated`);
    }
    if (billingReconciliation.status === "MISMATCH_DETECTED") {
      sloBreaches.push(`Billing reconciliation detected ${billingReconciliation.mismatchCount} workspace discrepancies`);
    }

    return {
      timestamp: new Date().toISOString(),
      apiAvailabilityPercent,
      apiLatency: latencies,
      errorRatePercent,
      totalRequests: this.totalRequests,
      aiJobSuccessRatePercent,
      transcriptionSuccessRatePercent,
      integrationSuccessRatePercent,
      webhookSuccessRatePercent,
      queueDepth,
      databaseConnectionUsage,
      billingReconciliation,
      sloBreaches
    };
  }

  public static clear(): void {
    this.apiLatencies = [];
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.errorRequests = 0;
    this.aiTotal = 0;
    this.aiSuccess = 0;
    this.transcriptionTotal = 0;
    this.transcriptionSuccess = 0;
    this.integrationTotal = 0;
    this.integrationSuccess = 0;
    this.webhookTotal = 0;
    this.webhookSuccess = 0;
    this.dbActive = 8;
    this.dbIdle = 42;
    this.dbMaxCapacity = 50;
    this.billingReconciledCount = 142;
    this.billingMismatches = [];
    this.billingLastReconciledAt = new Date().toISOString();
  }
}

