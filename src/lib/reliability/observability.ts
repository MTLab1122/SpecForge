import { DataProtectionService } from "./data-protection.ts";
import { ReliableJobQueue } from "./job-queue.ts";
import { CircuitBreakerRegistry } from "./circuit-breaker-registry.ts";
import { RequestContextHolder } from "./request-context.ts";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  workspaceId?: string;
  organizationId?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  durationMs?: number;
  latencyMs?: number;
  errorType?: string;
  errorMessage?: string;
  correlationId?: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private static readonly MAX_LOG_HISTORY = 1000;
  private static inMemoryLogs: StructuredLogEntry[] = [];

  public static log(level: LogLevel, message: string, meta: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    const currentContext = RequestContextHolder.get();

    const traceId = meta.traceId || currentContext?.traceId;
    const correlationId = meta.correlationId || traceId || meta.requestId;
    const workspaceId = meta.workspaceId || meta.organizationId || currentContext?.organizationId || undefined;
    const userId = meta.userId || currentContext?.userId || undefined;
    const route = meta.route || currentContext?.routePath || undefined;
    const duration = meta.duration ?? meta.durationMs ?? meta.latencyMs;

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: meta.requestId,
      traceId,
      userId,
      workspaceId,
      organizationId: workspaceId,
      route,
      method: meta.method,
      statusCode: meta.statusCode,
      duration,
      durationMs: duration,
      latencyMs: duration,
      errorType: meta.errorType || (meta.error ? meta.error.name : undefined),
      errorMessage: meta.errorMessage || (meta.error ? meta.error.message : undefined),
      correlationId,
      context: meta.context ? DataProtectionService.redactSensitiveData(meta.context) : undefined,
      error: meta.error
    };

    this.inMemoryLogs.push(entry);
    if (this.inMemoryLogs.length > this.MAX_LOG_HISTORY) {
      this.inMemoryLogs.shift();
    }

    const formatted = JSON.stringify(entry);

    if (level === "ERROR") {
      console.error(formatted);
    } else if (level === "WARN") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    return entry;
  }

  public static info(message: string, meta: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log("INFO", message, meta);
  }

  public static warn(message: string, meta: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log("WARN", message, meta);
  }

  public static error(message: string, error?: Error, meta: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log("ERROR", message, {
      ...meta,
      errorType: meta.errorType || error?.name,
      errorMessage: meta.errorMessage || error?.message,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : undefined
    });
  }

  /**
   * Dedicated structured HTTP request/response logging.
   */
  public static logHttpAccess(params: {
    requestId?: string;
    traceId?: string;
    correlationId?: string;
    userId?: string;
    workspaceId?: string;
    organizationId?: string;
    route: string;
    method: string;
    statusCode: number;
    durationMs: number;
    errorType?: string;
    errorMessage?: string;
    context?: Record<string, any>;
  }): StructuredLogEntry {
    const level: LogLevel = params.statusCode >= 500 ? "ERROR" : params.statusCode >= 400 ? "WARN" : "INFO";
    const msg = `${params.method} ${params.route} ${params.statusCode} (${params.durationMs.toFixed(2)}ms)`;
    return this.log(level, msg, params);
  }

  public static getRecentLogs(limit: number = 100): StructuredLogEntry[] {
    return this.inMemoryLogs.slice(-limit).reverse();
  }

  public static clear(): void {
    this.inMemoryLogs = [];
  }
}

// ----------------------------------------------------------------------------
// AUDIT LOG RECORDER
// ----------------------------------------------------------------------------

export interface AuditEventInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityName: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export class AuditLogger {
  private static inMemoryAuditTrail: AuditEventInput[] = [];

  public static async record(event: AuditEventInput): Promise<void> {
    const sanitizedMetadata = event.metadata
      ? DataProtectionService.redactSensitiveData(event.metadata)
      : undefined;

    const auditEntry = {
      ...event,
      metadata: sanitizedMetadata,
      timestamp: new Date().toISOString()
    };

    this.inMemoryAuditTrail.push(auditEntry);

    Logger.info(`[AUDIT] ${event.action} on ${event.entityName}:${event.entityId}`, {
      organizationId: event.organizationId,
      userId: event.userId || undefined,
      context: sanitizedMetadata
    });
  }

  public static getRecentEvents(organizationId?: string, limit: number = 50): AuditEventInput[] {
    return this.inMemoryAuditTrail
      .filter((e) => !organizationId || e.organizationId === organizationId)
      .slice(-limit)
      .reverse();
  }

  public static clear(): void {
    this.inMemoryAuditTrail = [];
  }
}

// ----------------------------------------------------------------------------
// HEALTH CHECK & READINESS SERVICE
// ----------------------------------------------------------------------------

export interface HealthCheckResult {
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY";
  uptimeSeconds: number;
  timestamp: string;
  checks: {
    database: { status: "UP" | "DOWN"; latencyMs: number };
    memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
    jobQueue: { pendingJobs: number; deadLetterJobs: number };
    circuitBreakers: Array<{ name: string; state: string }>;
  };
}

export class HealthCheckService {
  private static startTime: number = Date.now();

  public static async performHealthCheck(): Promise<HealthCheckResult> {
    // 1. Simulate DB ping with timing
    const dbStart = Date.now();
    let dbStatus: "UP" | "DOWN" = "UP";
    let dbLatencyMs = 4; // simulated quick ping
    try {
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbStatus = "DOWN";
    }

    // 2. Memory metrics
    const mem = process.memoryUsage();
    const memoryMetrics = {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024)
    };

    // 3. Queue metrics
    const deadLetters = ReliableJobQueue.listDeadLetters();
    const deadLetterCount = deadLetters.length;

    // 4. Circuit Breakers
    const breakers = CircuitBreakerRegistry.getAllMetrics();
    const openBreakers = breakers.filter((b) => b.state === "OPEN");

    let overallStatus: "HEALTHY" | "DEGRADED" | "UNHEALTHY" = "HEALTHY";
    if (dbStatus === "DOWN" || memoryMetrics.heapUsedMb > 1500) {
      overallStatus = "UNHEALTHY";
    } else if (deadLetterCount > 5 || openBreakers.length > 0) {
      overallStatus = "DEGRADED";
    }

    return {
      status: overallStatus,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbStatus, latencyMs: dbLatencyMs },
        memory: memoryMetrics,
        jobQueue: {
          pendingJobs: 0,
          deadLetterJobs: deadLetterCount
        },
        circuitBreakers: breakers.map((b) => ({ name: b.name, state: b.state }))
      }
    };
  }
}
