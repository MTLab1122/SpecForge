import { RequestContextHolder } from "./request-context.ts";
import type { RequestContext } from "./request-context.ts";
import { ErrorEnvelope, TenantIsolationError } from "./error-envelope.ts";
import { Logger } from "./observability.ts";
import { DataProtectionService } from "./data-protection.ts";

export interface ApiGuardOptions {
  requireTenant?: boolean;
  timeoutMs?: number;
  rateLimitKey?: string;
}

export function withReliability(
  handler: (req: Request, context: RequestContext) => Promise<Response>,
  options: ApiGuardOptions = {}
) {
  const requireTenant = options.requireTenant ?? false;
  const timeoutMs = options.timeoutMs ?? 15000;

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const context = RequestContextHolder.createFromHeaders(req.headers, url.pathname);

    return RequestContextHolder.run(context, async () => {
      const startTime = Date.now();

      try {
        // 1. Tenant boundary enforcement if required
        if (requireTenant && !context.organizationId) {
          throw new TenantIsolationError("Authentication required: Missing x-organization-id session header.");
        }

        // 2. Request execution with timeout race
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<Response>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error(`API request timed out after ${timeoutMs}ms budget.`));
          }, timeoutMs);
        });

        const executionPromise = handler(req, context);

        const response = await Promise.race([executionPromise, timeoutPromise]);
        if (timer) clearTimeout(timer);

        const latencyMs = Date.now() - startTime;

        // 3. Inject standard security headers
        const securityHeaders = DataProtectionService.getSecurityHeaders();
        const mutatedHeaders = new Headers(response.headers);

        for (const [header, val] of Object.entries(securityHeaders)) {
          mutatedHeaders.set(header, val);
        }
        mutatedHeaders.set("x-trace-id", context.traceId);
        mutatedHeaders.set("x-request-id", context.traceId);
        mutatedHeaders.set("x-latency-ms", String(latencyMs));

        // 4. Structured access log
        Logger.info(`[HTTP] ${req.method} ${url.pathname} ${response.status} (${latencyMs}ms)`, {
          requestId: context.traceId,
          organizationId: context.organizationId || undefined,
          userId: context.userId || undefined,
          latencyMs
        });

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: mutatedHeaders
        });
      } catch (error: any) {
        const latencyMs = Date.now() - startTime;

        Logger.error(`[HTTP] ${req.method} ${url.pathname} FAILED (${latencyMs}ms)`, error, {
          requestId: context.traceId,
          organizationId: context.organizationId || undefined,
          userId: context.userId || undefined,
          latencyMs
        });

        const errResponse = ErrorEnvelope.toResponse(error, url.pathname);
        const errHeaders = new Headers(errResponse.headers);
        errHeaders.set("x-trace-id", context.traceId);
        errHeaders.set("x-latency-ms", String(latencyMs));

        return new Response(errResponse.body, {
          status: errResponse.status,
          statusText: errResponse.statusText,
          headers: errHeaders
        });
      }
    });
  };
}
