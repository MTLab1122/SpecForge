import { RequestContextHolder } from "./request-context.ts";

export interface ProblemDetailsParam {
  name: string;
  reason: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  traceId: string;
  timestamp: string;
  invalidParams?: ProblemDetailsParam[];
  retryAfterSec?: number;
  degradedMode?: boolean;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly typeUrl: string;
  public readonly isOperational: boolean;
  public readonly invalidParams?: ProblemDetailsParam[];
  public readonly retryAfterSec?: number;
  public readonly degradedMode?: boolean;

  constructor(params: {
    message: string;
    status?: number;
    code?: string;
    typeUrl?: string;
    isOperational?: boolean;
    invalidParams?: ProblemDetailsParam[];
    retryAfterSec?: number;
    degradedMode?: boolean;
  }) {
    super(params.message);
    this.name = this.constructor.name;
    this.status = params.status || 500;
    this.code = params.code || "INTERNAL_SERVER_ERROR";
    this.typeUrl = params.typeUrl || `https://specforge.io/errors/${this.code.toLowerCase().replace(/_/g, "-")}`;
    this.isOperational = params.isOperational !== undefined ? params.isOperational : true;
    this.invalidParams = params.invalidParams;
    this.retryAfterSec = params.retryAfterSec;
    this.degradedMode = params.degradedMode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ----------------------------------------------------------------------------
// DOMAIN ERROR SUB-CLASSES
// ----------------------------------------------------------------------------

export class TenantIsolationError extends AppError {
  constructor(message: string = "Cross-tenant data access strictly prohibited.") {
    super({
      message,
      status: 403,
      code: "TENANT_ACCESS_FORBIDDEN",
      typeUrl: "https://specforge.io/errors/tenant-access-forbidden"
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required. Valid session or API key must be supplied.") {
    super({
      message,
      status: 401,
      code: "UNAUTHORIZED",
      typeUrl: "https://specforge.io/errors/unauthorized"
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action.") {
    super({
      message,
      status: 403,
      code: "FORBIDDEN",
      typeUrl: "https://specforge.io/errors/forbidden"
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", id?: string) {
    const detail = id ? `${resource} with id '${id}' not found.` : `${resource} not found.`;
    super({
      message: detail,
      status: 404,
      code: "NOT_FOUND",
      typeUrl: "https://specforge.io/errors/not-found"
    });
  }
}

export class ValidationFailedError extends AppError {
  constructor(invalidParams: ProblemDetailsParam[], message: string = "The request payload failed schema validation.") {
    super({
      message,
      status: 422,
      code: "VALIDATION_FAILED",
      typeUrl: "https://specforge.io/errors/validation-failed",
      invalidParams
    });
  }
}

export class RateLimitExceededError extends AppError {
  constructor(retryAfterSec: number = 60, message: string = "Rate limit exceeded. Please throttle requests.") {
    super({
      message,
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      typeUrl: "https://specforge.io/errors/rate-limit-exceeded",
      retryAfterSec
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict detected. State has changed since last read.") {
    super({
      message,
      status: 409,
      code: "CONCURRENCY_CONFLICT",
      typeUrl: "https://specforge.io/errors/concurrency-conflict"
    });
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(idempotencyKey: string) {
    super({
      message: `An identical operation with idempotency key '${idempotencyKey}' is currently in-flight.`,
      status: 409,
      code: "IDEMPOTENCY_CONFLICT",
      typeUrl: "https://specforge.io/errors/idempotency-conflict"
    });
  }
}

export class CircuitBreakerOpenError extends AppError {
  constructor(serviceName: string, retryAfterSec: number = 30) {
    super({
      message: `Downstream service '${serviceName}' is currently degraded. Circuit breaker is OPEN.`,
      status: 503,
      code: "CIRCUIT_BREAKER_OPEN",
      typeUrl: "https://specforge.io/errors/circuit-breaker-open",
      retryAfterSec,
      degradedMode: true
    });
  }
}

export class UpstreamServiceUnavailableError extends AppError {
  constructor(serviceName: string, detail?: string) {
    super({
      message: detail || `Upstream service '${serviceName}' returned an error or timed out.`,
      status: 503,
      code: "UPSTREAM_UNAVAILABLE",
      typeUrl: "https://specforge.io/errors/upstream-unavailable",
      degradedMode: true
    });
  }
}

// ----------------------------------------------------------------------------
// RFC 7807 PROBLEM DETAILS SERIALIZER
// ----------------------------------------------------------------------------

export class ErrorEnvelope {
  public static toProblemDetails(error: unknown, routePath: string = "/"): ProblemDetails {
    const traceId = RequestContextHolder.getTraceId();
    const timestamp = new Date().toISOString();

    if (error instanceof AppError) {
      return {
        type: error.typeUrl,
        title: error.code.replace(/_/g, " "),
        status: error.status,
        detail: error.message,
        instance: routePath,
        code: error.code,
        traceId,
        timestamp,
        invalidParams: error.invalidParams,
        retryAfterSec: error.retryAfterSec,
        degradedMode: error.degradedMode
      };
    }

    // Uncaught exceptions (redact message in production to prevent DB / credential leak)
    const rawMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
    const isProduction = process.env.NODE_ENV === "production";
    const safeDetail = isProduction
      ? "An internal error occurred. Reference the traceId when contacting support."
      : rawMessage;

    return {
      type: "https://specforge.io/errors/internal-server-error",
      title: "INTERNAL SERVER ERROR",
      status: 500,
      detail: safeDetail,
      instance: routePath,
      code: "INTERNAL_SERVER_ERROR",
      traceId,
      timestamp
    };
  }

  public static toResponse(error: unknown, routePath: string = "/"): Response {
    const problem = this.toProblemDetails(error, routePath);
    const headers: Record<string, string> = {
      "Content-Type": "application/problem+json; charset=utf-8",
      "x-trace-id": problem.traceId
    };

    if (problem.retryAfterSec) {
      headers["Retry-After"] = String(problem.retryAfterSec);
    }

    return new Response(JSON.stringify(problem), {
      status: problem.status,
      headers
    });
  }
}

