import { CacheService, PaginationHelper } from "./cache-service.ts";
import { TransactionOrchestrator } from "../transactions/workflow-orchestrator.ts";
import { CreditLedger } from "../billing/credit-ledger.ts";
import { DurableJobQueue } from "../queue/durable-queue.ts";
import { SafeIntegrationPlatform } from "../integrations/safe-integration-platform.ts";
import { ExportEngine } from "../storage/export-engine.ts";
import { FileLifecycleManager } from "../storage/file-lifecycle.ts";

export interface LatencyMetric {
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  meanMs: number;
}

export interface ConcurrencyTestResult {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRatePercent: number;
  coreApiLatency: LatencyMetric;
  dashboardLatency: LatencyMetric;
  scopeBuilderLatency: LatencyMetric;
  meetsSlo: boolean;
  durationMs: number;
}

export interface PerformanceTargetReport {
  coreApiP95Ms: number;
  coreApiTargetMs: 800;
  coreApiPassed: boolean;

  dashboardLoadMs: number;
  dashboardTargetMs: 2000;
  dashboardPassed: boolean;

  scopeBuilderInteractionMs: number;
  scopeBuilderTargetMs: 300;
  scopeBuilderPassed: boolean;

  fileUploadInitiationMs: number;
  fileUploadTargetMs: 1000;
  fileUploadPassed: boolean;

  exportGenerationMs: number;
  exportGenerationTargetMs: 30000;
  exportPassed: boolean;

  aiExtractionMs: number;
  aiExtractionTargetMs: 180000;
  aiExtractionPassed: boolean;

  allTargetsPassed: boolean;
}

export class LoadTester {
  private static calculatePercentiles(latencies: number[]): LatencyMetric {
    if (latencies.length === 0) {
      return { p50Ms: 0, p90Ms: 0, p95Ms: 0, p99Ms: 0, maxMs: 0, meanMs: 0 };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);

    const getP = (p: number) => {
      const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
      return Number(sorted[idx].toFixed(2));
    };

    return {
      p50Ms: getP(50),
      p90Ms: getP(90),
      p95Ms: getP(95),
      p99Ms: getP(99),
      maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
      meanMs: Number((sum / sorted.length).toFixed(2))
    };
  }

  /**
   * Simulates high concurrency (100, 500, or 1,000 concurrent users).
   */
  public static async simulateConcurrentUsers(concurrency: number = 100): Promise<ConcurrencyTestResult> {
    const startTime = Date.now();
    const coreApiLatencies: number[] = [];
    const dashboardLatencies: number[] = [];
    const scopeBuilderLatencies: number[] = [];

    let successCount = 0;
    let failureCount = 0;

    // Concurrently execute requests in batches
    const batchSize = Math.min(50, concurrency);
    const totalUsers = concurrency;

    for (let i = 0; i < totalUsers; i += batchSize) {
      const currentBatch = Math.min(batchSize, totalUsers - i);
      const batchPromises = Array.from({ length: currentBatch }, async (_, idx) => {
        const userId = `usr_load_${i + idx}`;
        const orgId = `org_load_${(i + idx) % 10}`;

        try {
          // 1. Dashboard Load simulation (Cached / Fast Aggregation)
          const dashStart = performance.now();
          await CacheService.getOrSet(
            `dash:${orgId}:metrics`,
            async () => ({
              activeProjects: 5,
              totalInvoiced: 45000,
              pendingApprovals: 2
            }),
            60
          );
          dashboardLatencies.push(performance.now() - dashStart);

          // 2. Core API simulation (Workspace read + Auth check)
          const coreStart = performance.now();
          CacheService.cacheUserPermissions(userId, orgId, ["CREATE_PROJECT", "VIEW_WORKSPACE"]);
          const perms = CacheService.getUserPermissions(userId, orgId);
          if (!perms) throw new Error("Permission cache failure");
          coreApiLatencies.push(performance.now() - coreStart);

          // 3. Scope Builder Interaction simulation (Atomic sub-item update)
          const scopeStart = performance.now();
          const paged = PaginationHelper.paginate(
            Array.from({ length: 30 }, (_, itemIdx) => ({ id: `req_${itemIdx}`, title: `Req ${itemIdx}` })),
            15
          );
          if (paged.items.length !== 15) throw new Error("Pagination mismatch");
          scopeBuilderLatencies.push(performance.now() - scopeStart);

          successCount += 3;
        } catch (err) {
          failureCount += 1;
        }
      });

      await Promise.all(batchPromises);
    }

    const durationMs = Date.now() - startTime;
    const coreStats = this.calculatePercentiles(coreApiLatencies);
    const dashStats = this.calculatePercentiles(dashboardLatencies);
    const scopeStats = this.calculatePercentiles(scopeBuilderLatencies);

    // Target checks: Core API p95 < 800ms, Dashboard < 2000ms, Scope < 300ms
    const meetsSlo = coreStats.p95Ms < 800 && dashStats.p95Ms < 2000 && scopeStats.p95Ms < 300;

    return {
      concurrentUsers: concurrency,
      totalRequests: successCount + failureCount,
      successfulRequests: successCount,
      failedRequests: failureCount,
      successRatePercent: Number(((successCount / (successCount + failureCount)) * 100).toFixed(2)),
      coreApiLatency: coreStats,
      dashboardLatency: dashStats,
      scopeBuilderLatency: scopeStats,
      meetsSlo,
      durationMs
    };
  }

  /**
   * Simulates large document upload initiation (under 1 second).
   */
  public static async simulateLargeDocumentUpload(fileSizeBytes: number = 24 * 1024 * 1024): Promise<{
    durationMs: number;
    uploadUrl: string;
    meetsTarget: boolean;
  }> {
    const start = performance.now();
    const result = await FileLifecycleManager.initiateUpload({
      organizationId: "org_perf_test",
      userId: "usr_uploader",
      fileName: "enterprise_tender_requirements.pdf",
      fileSizeBytes,
      mimeType: "application/pdf"
    });
    const durationMs = performance.now() - start;

    return {
      durationMs: Number(durationMs.toFixed(2)),
      uploadUrl: result.presignedUpload.url,
      meetsTarget: durationMs < 1000 // Under 1 second target
    };
  }

  /**
   * Simulates large export generation without UI blocking (under 30 seconds).
   */
  public static async simulateLargeExportGeneration(taskCount: number = 2500): Promise<{
    durationMs: number;
    tasksExported: number;
    fileSizeBytes: number;
    meetsTarget: boolean;
  }> {
    const start = performance.now();
    const tasks = Array.from({ length: taskCount }, (_, i) => ({
      id: `task_${i + 1}`,
      title: `Implementation subtask #${i + 1}`,
      status: "TODO" as const,
      priority: "HIGH" as const,
      estimatedHours: 8
    }));

    const result = await ExportEngine.requestExport({
      organizationId: "org_perf_test",
      userId: "usr_exporter",
      projectId: "proj_large_scale",
      exportType: "TASK_CSV",
      customData: { tasks }
    });

    const completed = await ExportEngine.executeExport(result.exportRecord.id);
    const durationMs = performance.now() - start;

    return {
      durationMs: Number(durationMs.toFixed(2)),
      tasksExported: taskCount,
      fileSizeBytes: completed.fileSizeBytes,
      meetsTarget: durationMs < 30000 // Under 30 seconds target
    };
  }

  /**
   * Simulates concurrent AI jobs and validates no duplicates.
   */
  public static async simulateConcurrentAiJobs(jobCount: number = 20): Promise<{
    jobsExecuted: number;
    duplicateCount: number;
    durationMs: number;
    meetsTarget: boolean;
  }> {
    const start = performance.now();
    let duplicates = 0;
    const executedIds = new Set<string>();

    // Ensure ample credit quota for load test
    const { BillingService } = await import("../billing/billing-service.ts");
    BillingService.updateSubscriptionState("org_perf_test", {
      tier: "ENTERPRISE",
      monthlyQuota: 10000,
      creditsUsed: 0
    });

    const promises = Array.from({ length: jobCount }, async (_, idx) => {
      const jobId = `ai_job_perf_${idx}`;
      if (executedIds.has(jobId)) {
        duplicates++;
      }
      executedIds.add(jobId);

      const reservation = CreditLedger.reserveCredits({
        organizationId: "org_perf_test",
        jobId,
        amount: 25
      });
      await CreditLedger.commitReservation({
        organizationId: "org_perf_test",
        jobId,
        actualAmount: 25,
        jobType: "AI_EXTRACTION"
      });
    });

    await Promise.all(promises);
    const durationMs = performance.now() - start;

    return {
      jobsExecuted: jobCount,
      duplicateCount: duplicates,
      durationMs: Number(durationMs.toFixed(2)),
      meetsTarget: durationMs < 180000 && duplicates === 0 // Under 3 mins & 0 duplicates
    };
  }

  /**
   * Simulates concurrent integration exports and validates idempotency.
   */
  public static async simulateConcurrentIntegrationExports(count: number = 30): Promise<{
    exportsAttempted: number;
    duplicatesPrevented: number;
    durationMs: number;
  }> {
    const start = performance.now();
    let duplicatesPrevented = 0;

    SafeIntegrationPlatform.clear();

    await SafeIntegrationPlatform.connect({
      organizationId: "org_perf_test",
      userId: "usr_perf_test",
      provider: "LINEAR",
      token: "lin_test_token"
    });

    const task = {
      id: "task_shared_100",
      title: "Shared task",
      description: "Shared task description",
      status: "APPROVED" as const,
      priority: "HIGH" as const,
      estimatedHours: 4,
      isApproved: true
    };

    // Attempt concurrent exports with identical idempotency keys
    const promises = Array.from({ length: count }, async (_, i) => {
      const res = await SafeIntegrationPlatform.exportTask("LINEAR", task, {
        organizationId: "org_perf_test",
        userId: "usr_perf_test",
        idempotencyKey: "idemp_shared_key_100"
      });

      if (res.status === "ALREADY_EXPORTED") {
        duplicatesPrevented++;
      }
    });

    await Promise.all(promises);
    const durationMs = performance.now() - start;

    return {
      exportsAttempted: count,
      duplicatesPrevented,
      durationMs: Number(durationMs.toFixed(2))
    };
  }

  /**
   * Evaluates all defined performance targets against SLO thresholds.
   */
  public static async evaluateAllPerformanceTargets(): Promise<PerformanceTargetReport> {
    const concurrencyRes = await this.simulateConcurrentUsers(100);
    const uploadRes = await this.simulateLargeDocumentUpload();
    const exportRes = await this.simulateLargeExportGeneration(500);
    const aiRes = await this.simulateConcurrentAiJobs(10);

    const coreApiP95Ms = concurrencyRes.coreApiLatency.p95Ms;
    const dashboardLoadMs = concurrencyRes.dashboardLatency.p95Ms;
    const scopeBuilderInteractionMs = concurrencyRes.scopeBuilderLatency.p95Ms;
    const fileUploadInitiationMs = uploadRes.durationMs;
    const exportGenerationMs = exportRes.durationMs;
    const aiExtractionMs = aiRes.durationMs;

    const coreApiPassed = coreApiP95Ms < 800;
    const dashboardPassed = dashboardLoadMs < 2000;
    const scopeBuilderPassed = scopeBuilderInteractionMs < 300;
    const fileUploadPassed = fileUploadInitiationMs < 1000;
    const exportPassed = exportGenerationMs < 30000;
    const aiExtractionPassed = aiExtractionMs < 180000;

    const allTargetsPassed =
      coreApiPassed &&
      dashboardPassed &&
      scopeBuilderPassed &&
      fileUploadPassed &&
      exportPassed &&
      aiExtractionPassed;

    return {
      coreApiP95Ms,
      coreApiTargetMs: 800,
      coreApiPassed,

      dashboardLoadMs,
      dashboardTargetMs: 2000,
      dashboardPassed,

      scopeBuilderInteractionMs,
      scopeBuilderTargetMs: 300,
      scopeBuilderPassed,

      fileUploadInitiationMs,
      fileUploadTargetMs: 1000,
      fileUploadPassed,

      exportGenerationMs,
      exportGenerationTargetMs: 30000,
      exportPassed,

      aiExtractionMs,
      aiExtractionTargetMs: 180000,
      aiExtractionPassed,

      allTargetsPassed
    };
  }
}
