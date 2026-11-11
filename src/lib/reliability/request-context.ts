import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";

export interface RequestContext {
  traceId: string;
  spanId: string;
  organizationId?: string | null;
  userId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  routePath?: string;
  startTime: number;
  metadata?: Record<string, any>;
}

const storage = new AsyncLocalStorage<RequestContext>();

export class RequestContextHolder {
  /**
   * Runs an asynchronous callback with a bound RequestContext.
   */
  public static run<T>(context: RequestContext, callback: () => T | Promise<T>): T | Promise<T> {
    return storage.run(context, callback);
  }

  /**
   * Retrieves current request context if available.
   */
  public static get(): RequestContext | undefined {
    return storage.getStore();
  }

  /**
   * Helper to retrieve current traceId, generating an ad-hoc fallback if called outside HTTP context.
   */
  public static getTraceId(): string {
    const current = storage.getStore();
    return current?.traceId || `trace_${crypto.randomUUID()}`;
  }

  /**
   * Helper to retrieve current organizationId / tenantId.
   */
  public static getTenantId(): string | null {
    const current = storage.getStore();
    return current?.organizationId || null;
  }

  /**
   * Helper to retrieve current userId.
   */
  public static getUserId(): string | null {
    const current = storage.getStore();
    return current?.userId || null;
  }

  /**
   * Creates a fresh context object from incoming request headers.
   */
  public static createFromHeaders(headers: Headers, routePath: string = "/"): RequestContext {
    const traceId =
      headers.get("x-trace-id") ||
      headers.get("x-request-id") ||
      headers.get("traceparent") ||
      `trace_${crypto.randomUUID()}`;

    const spanId = `span_${crypto.randomBytes(8).toString("hex")}`;
    const organizationId = headers.get("x-organization-id") || headers.get("x-tenant-id") || null;
    const userId = headers.get("x-user-id") || null;
    const clientIp = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
    const userAgent = headers.get("user-agent") || null;

    return {
      traceId,
      spanId,
      organizationId,
      userId,
      clientIp,
      userAgent,
      routePath,
      startTime: Date.now(),
      metadata: {}
    };
  }
}

