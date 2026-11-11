import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import { DataProtectionService } from "./data-protection.ts";
import { Logger } from "./observability.ts";
import { RequestContextHolder } from "./request-context.ts";

export type SpanKind = "SERVER" | "CLIENT" | "INTERNAL" | "PRODUCER" | "CONSUMER";
export type SpanStatus = "OK" | "ERROR";

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  kind: SpanKind;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: Record<string, any>;
  events: SpanEvent[];
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface TraceSummary {
  traceId: string;
  rootSpan?: Span;
  spans: Span[];
  totalDurationMs: number;
  hasErrors: boolean;
  servicesInvolved: string[];
}

const activeSpanStorage = new AsyncLocalStorage<Span>();

export class DistributedTracer {
  private static readonly MAX_SPANS_BUFFER = 5000;
  private static completedSpans: Span[] = [];
  private static spansByTrace: Map<string, Span[]> = new Map();

  /**
   * Generates a 32-hex character W3C compliant trace ID.
   */
  public static generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Generates a 16-hex character W3C compliant span ID.
   */
  public static generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * Returns active span in the current async execution context.
   */
  public static getActiveSpan(): Span | undefined {
    return activeSpanStorage.getStore();
  }

  /**
   * Starts a new span, linking it to the active parent span or explicit parentSpanId.
   */
  public static startSpan(
    name: string,
    options: {
      service?: string;
      kind?: SpanKind;
      parentSpanId?: string;
      traceId?: string;
      attributes?: Record<string, any>;
    } = {}
  ): Span {
    const parent = activeSpanStorage.getStore();
    const reqContext = RequestContextHolder.get();

    const traceId =
      options.traceId ||
      parent?.traceId ||
      reqContext?.traceId ||
      this.generateTraceId();

    const parentSpanId =
      options.parentSpanId ||
      parent?.spanId ||
      reqContext?.spanId;

    const spanId = this.generateSpanId();
    const service = options.service || "core-service";
    const kind = options.kind || "INTERNAL";

    const sanitizedAttributes = options.attributes
      ? DataProtectionService.redactSensitiveData(options.attributes)
      : {};

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      service,
      kind,
      startTime: Date.now(),
      status: "OK",
      attributes: sanitizedAttributes,
      events: []
    };

    return span;
  }

  /**
   * Completes a span, calculates duration, records status and saves to buffer.
   */
  public static endSpan(
    span: Span,
    status: SpanStatus = "OK",
    error?: Error
  ): Span {
    span.endTime = Date.now();
    span.durationMs = Number((span.endTime - span.startTime).toFixed(2));
    span.status = status;

    if (error) {
      span.status = "ERROR";
      span.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    this.recordSpan(span);
    return span;
  }

  /**
   * Executes an async operation wrapped in a span with automatic error capture and context binding.
   */
  public static async withSpan<T>(
    name: string,
    options: {
      service?: string;
      kind?: SpanKind;
      parentSpanId?: string;
      traceId?: string;
      attributes?: Record<string, any>;
    },
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(name, options);

    return activeSpanStorage.run(span, async () => {
      try {
        const result = await fn(span);
        this.endSpan(span, "OK");
        return result;
      } catch (err: any) {
        this.endSpan(span, "ERROR", err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    });
  }

  // --------------------------------------------------------------------------
  // 1. SPECIFIC TRACING HELPERS (API, JOBS, AI, DB, INTEGRATIONS, WEBHOOKS)
  // --------------------------------------------------------------------------

  /**
   * Traces an incoming HTTP API request across router and handlers.
   */
  public static async traceApiRequest<T>(
    name: string,
    route: string,
    method: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      name,
      {
        service: "api-gateway",
        kind: "SERVER",
        attributes: {
          "http.route": route,
          "http.method": method.toUpperCase(),
          ...attributes
        }
      },
      fn
    );
  }

  /**
   * Traces an asynchronous background worker job.
   */
  public static async traceBackgroundJob<T>(
    jobType: string,
    jobId: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      `Job:${jobType}`,
      {
        service: "job-worker",
        kind: "CONSUMER",
        attributes: {
          "job.id": jobId,
          "job.type": jobType,
          ...attributes
        }
      },
      fn
    );
  }

  /**
   * Traces an LLM or AI extraction call.
   */
  public static async traceAiCall<T>(
    model: string,
    promptSummary: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      `AI:${model}`,
      {
        service: "ai-orchestrator",
        kind: "CLIENT",
        attributes: {
          "ai.model": model,
          "ai.prompt_summary": promptSummary.slice(0, 100),
          ...attributes
        }
      },
      fn
    );
  }

  /**
   * Traces a database query or transaction.
   */
  public static async traceDatabaseQuery<T>(
    operation: string,
    table: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      `DB:${table}.${operation}`,
      {
        service: "postgres-db",
        kind: "CLIENT",
        attributes: {
          "db.system": "postgresql",
          "db.operation": operation,
          "db.table": table,
          ...attributes
        }
      },
      fn
    );
  }

  /**
   * Traces an external third-party integration export (Linear, Jira, Slack, etc.).
   */
  public static async traceExternalIntegration<T>(
    provider: string,
    action: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      `Integration:${provider.toUpperCase()}.${action}`,
      {
        service: "integration-adapter",
        kind: "CLIENT",
        attributes: {
          "integration.provider": provider.toUpperCase(),
          "integration.action": action,
          ...attributes
        }
      },
      fn
    );
  }

  /**
   * Traces incoming third-party webhook processing (Stripe, GitHub, etc.).
   */
  public static async traceWebhookProcessing<T>(
    provider: string,
    eventId: string,
    eventType: string,
    fn: (span: Span) => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    return this.withSpan(
      `Webhook:${provider.toUpperCase()}.${eventType}`,
      {
        service: "webhook-ingress",
        kind: "SERVER",
        attributes: {
          "webhook.provider": provider.toUpperCase(),
          "webhook.event_id": eventId,
          "webhook.event_type": eventType,
          ...attributes
        }
      },
      fn
    );
  }

  // --------------------------------------------------------------------------
  // 2. CONTEXT PROPAGATION & HEADERS (W3C TRACEPARENT COMPLIANT)
  // --------------------------------------------------------------------------

  /**
   * Injects W3C traceparent and X-Trace-Id headers into an outgoing request.
   */
  public static injectTraceHeaders(
    targetHeaders: Record<string, string>,
    span?: Span
  ): Record<string, string> {
    const active = span || activeSpanStorage.getStore();
    const traceId = active?.traceId || RequestContextHolder.getTraceId();
    const spanId = active?.spanId || this.generateSpanId();

    targetHeaders["traceparent"] = `00-${traceId}-${spanId}-01`;
    targetHeaders["x-trace-id"] = traceId;
    targetHeaders["x-span-id"] = spanId;

    return targetHeaders;
  }

  /**
   * Extracts trace context from incoming HTTP headers.
   */
  public static extractTraceHeaders(
    headers: Record<string, string | string[] | undefined>
  ): { traceId?: string; parentSpanId?: string } {
    const rawTraceParent = headers["traceparent"] || headers["Traceparent"];
    const traceParentStr = Array.isArray(rawTraceParent) ? rawTraceParent[0] : rawTraceParent;

    if (traceParentStr && typeof traceParentStr === "string") {
      const parts = traceParentStr.split("-");
      if (parts.length >= 4) {
        return {
          traceId: parts[1],
          parentSpanId: parts[2]
        };
      }
    }

    const rawTraceId = headers["x-trace-id"] || headers["X-Trace-Id"];
    const traceId = Array.isArray(rawTraceId) ? rawTraceId[0] : rawTraceId;

    const rawSpanId = headers["x-span-id"] || headers["X-Span-Id"];
    const parentSpanId = Array.isArray(rawSpanId) ? rawSpanId[0] : rawSpanId;

    return {
      traceId: traceId || undefined,
      parentSpanId: parentSpanId || undefined
    };
  }

  // --------------------------------------------------------------------------
  // 3. STORAGE, QUERYING & TRACE VISUALIZATION
  // --------------------------------------------------------------------------

  private static recordSpan(span: Span): void {
    this.completedSpans.push(span);
    if (this.completedSpans.length > this.MAX_SPANS_BUFFER) {
      const removed = this.completedSpans.shift();
      if (removed) {
        const traceSpans = this.spansByTrace.get(removed.traceId);
        if (traceSpans) {
          const filtered = traceSpans.filter((s) => s.spanId !== removed.spanId);
          if (filtered.length === 0) {
            this.spansByTrace.delete(removed.traceId);
          } else {
            this.spansByTrace.set(removed.traceId, filtered);
          }
        }
      }
    }

    if (!this.spansByTrace.has(span.traceId)) {
      this.spansByTrace.set(span.traceId, []);
    }
    this.spansByTrace.get(span.traceId)!.push(span);
  }

  /**
   * Retrieves all spans for a trace and constructs a call tree summary.
   */
  public static getTrace(traceId: string): TraceSummary | null {
    const spans = this.spansByTrace.get(traceId);
    if (!spans || spans.length === 0) {
      return null;
    }

    const sortedSpans = [...spans].sort((a, b) => a.startTime - b.startTime);
    const rootSpan = sortedSpans.find((s) => !s.parentSpanId) || sortedSpans[0];

    const minStart = Math.min(...sortedSpans.map((s) => s.startTime));
    const maxEnd = Math.max(...sortedSpans.map((s) => s.endTime || s.startTime));
    const totalDurationMs = maxEnd - minStart;

    const hasErrors = sortedSpans.some((s) => s.status === "ERROR");
    const servicesInvolved = Array.from(new Set(sortedSpans.map((s) => s.service)));

    return {
      traceId,
      rootSpan,
      spans: sortedSpans,
      totalDurationMs,
      hasErrors,
      servicesInvolved
    };
  }

  /**
   * Finds traces that experienced errors.
   */
  public static findFailingTraces(limit: number = 20): TraceSummary[] {
    const failingTraceIds = new Set<string>();
    for (const span of this.completedSpans) {
      if (span.status === "ERROR") {
        failingTraceIds.add(span.traceId);
      }
    }

    const summaries: TraceSummary[] = [];
    for (const id of failingTraceIds) {
      const summary = this.getTrace(id);
      if (summary) summaries.push(summary);
      if (summaries.length >= limit) break;
    }
    return summaries;
  }

  /**
   * Finds traces exceeding latency threshold.
   */
  public static findSlowTraces(minDurationMs: number = 500, limit: number = 20): TraceSummary[] {
    const slowSummaries: TraceSummary[] = [];
    for (const [traceId] of this.spansByTrace.entries()) {
      const summary = this.getTrace(traceId);
      if (summary && summary.totalDurationMs >= minDurationMs) {
        slowSummaries.push(summary);
        if (slowSummaries.length >= limit) break;
      }
    }
    return slowSummaries;
  }

  public static clear(): void {
    this.completedSpans = [];
    this.spansByTrace.clear();
  }
}

