import { CircuitBreaker } from "./circuit-breaker.ts";
import type { CircuitState } from "./circuit-breaker.ts";
import { CircuitBreakerOpenError } from "./error-envelope.ts";
import { Logger } from "./observability.ts";

export type DownstreamService =
  | "LLM_OPENAI"
  | "LLM_ANTHROPIC"
  | "TRANSCRIPTION"
  | "STORAGE_CLOUDINARY"
  | "EMAIL_RESEND"
  | "JIRA"
  | "LINEAR"
  | "GITHUB"
  | "TRELLO"
  | "NOTION"
  | "SLACK"
  | "PAYMENT_STRIPE";

export interface ServiceCircuitMetric {
  service: DownstreamService;
  state: CircuitState;
  failureCount: number;
  failureThreshold: number;
  cooldownPeriodMs: number;
  lastFailureTime: number;
}

export interface GlobalReliabilityStatus {
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  totalServices: number;
  openServices: DownstreamService[];
  halfOpenServices: DownstreamService[];
  healthyServices: DownstreamService[];
  timestamp: string;
}

export class CircuitBreakerRegistry {
  private static breakers: Map<DownstreamService, CircuitBreaker> = new Map();

  private static readonly SERVICE_CONFIGS: Record<
    DownstreamService,
    { failureThreshold: number; cooldownPeriodMs: number; timeoutMs: number }
  > = {
    LLM_OPENAI: { failureThreshold: 3, cooldownPeriodMs: 20000, timeoutMs: 30000 },
    LLM_ANTHROPIC: { failureThreshold: 3, cooldownPeriodMs: 20000, timeoutMs: 30000 },
    TRANSCRIPTION: { failureThreshold: 3, cooldownPeriodMs: 30000, timeoutMs: 45000 },
    STORAGE_CLOUDINARY: { failureThreshold: 4, cooldownPeriodMs: 15000, timeoutMs: 15000 },
    EMAIL_RESEND: { failureThreshold: 4, cooldownPeriodMs: 15000, timeoutMs: 10000 },
    JIRA: { failureThreshold: 3, cooldownPeriodMs: 25000, timeoutMs: 12000 },
    LINEAR: { failureThreshold: 3, cooldownPeriodMs: 25000, timeoutMs: 10000 },
    GITHUB: { failureThreshold: 3, cooldownPeriodMs: 25000, timeoutMs: 10000 },
    TRELLO: { failureThreshold: 3, cooldownPeriodMs: 25000, timeoutMs: 10000 },
    NOTION: { failureThreshold: 3, cooldownPeriodMs: 25000, timeoutMs: 12000 },
    SLACK: { failureThreshold: 4, cooldownPeriodMs: 15000, timeoutMs: 8000 },
    PAYMENT_STRIPE: { failureThreshold: 2, cooldownPeriodMs: 30000, timeoutMs: 10000 }
  };

  /**
   * Retrieves or initializes a typed CircuitBreaker for an external service.
   */
  public static getBreaker(service: DownstreamService | string): CircuitBreaker {
    let breaker = this.breakers.get(service as DownstreamService);
    if (!breaker) {
      const config = (this.SERVICE_CONFIGS as any)[service] || {
        failureThreshold: 3,
        cooldownPeriodMs: 20000,
        timeoutMs: 15000
      };

      breaker = new CircuitBreaker(service, {
        failureThreshold: config.failureThreshold,
        cooldownPeriodMs: config.cooldownPeriodMs,
        timeoutMs: config.timeoutMs
      });

      this.breakers.set(service as DownstreamService, breaker);
    }
    return breaker;
  }

  /**
   * Alias for getBreaker
   */
  public static get(service: DownstreamService | string): CircuitBreaker {
    return this.getBreaker(service);
  }

  /**
   * Executes an external operation through the service's circuit breaker with graceful degradation fallback.
   */
  public static async executeWithDegradation<T>(
    service: DownstreamService,
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    const breaker = this.getBreaker(service);
    const state = breaker.getState();

    if (state === "OPEN") {
      Logger.warn(`[RELIABILITY] Circuit breaker for '${service}' is OPEN. Triggering fallback.`, {
        context: { service, state }
      });

      if (fallback) {
        return await fallback();
      }
      throw new CircuitBreakerOpenError(service, Math.round(breaker["cooldownPeriodMs"] / 1000));
    }

    try {
      return await breaker.execute(operation, fallback);
    } catch (error) {
      if (breaker.getState() === "OPEN") {
        Logger.error(
          `[RELIABILITY] Downstream service '${service}' tripped circuit breaker to OPEN state.`,
          error instanceof Error ? error : undefined,
          { context: { service, state: "OPEN" } }
        );
      }
      throw error;
    }
  }

  /**
   * Returns current health overview across all downstream integrations.
   */
  public static getGlobalStatus(): GlobalReliabilityStatus {
    const openServices: DownstreamService[] = [];
    const halfOpenServices: DownstreamService[] = [];
    const healthyServices: DownstreamService[] = [];

    const allServices = Object.keys(this.SERVICE_CONFIGS) as DownstreamService[];

    for (const s of allServices) {
      const breaker = this.breakers.get(s);
      if (!breaker) {
        healthyServices.push(s);
        continue;
      }
      const st = breaker.getState();
      if (st === "OPEN") openServices.push(s);
      else if (st === "HALF_OPEN") halfOpenServices.push(s);
      else healthyServices.push(s);
    }

    let overall: GlobalReliabilityStatus["status"] = "HEALTHY";
    if (openServices.includes("PAYMENT_STRIPE") || (openServices.includes("LLM_OPENAI") && openServices.includes("LLM_ANTHROPIC"))) {
      overall = "CRITICAL";
    } else if (openServices.length > 0 || halfOpenServices.length > 0) {
      overall = "DEGRADED";
    }

    return {
      status: overall,
      totalServices: allServices.length,
      openServices,
      halfOpenServices,
      healthyServices,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Resets all circuit breakers to CLOSED state (for unit testing or manual administrative override).
   */
  public static resetAll(): void {
    this.breakers.clear();
  }

  /**
   * Diagnostic metrics for health checks and Prometheus exporter.
   */
  public static getAllMetrics(): Array<{ name: string; state: string; failureCount: number }> {
    const allServices = Object.keys(this.SERVICE_CONFIGS) as DownstreamService[];
    return allServices.map((name) => {
      const breaker = this.getBreaker(name);
      return {
        name,
        state: breaker.getState(),
        failureCount: (breaker as any).failureCount || 0
      };
    });
  }
}
