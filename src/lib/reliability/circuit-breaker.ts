export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number;    // consecutive failures before tripping (default: 5)
  cooldownPeriodMs?: number;    // time to wait in OPEN state before trying HALF_OPEN (default: 30,000ms)
  timeoutMs?: number;           // max duration for single call before timing out (default: 5,000ms)
}

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly timeoutMs: number;
  public readonly name: string;

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 30000;
    this.timeoutMs = options.timeoutMs ?? 5000;
  }

  public getState(): CircuitState {
    const now = Date.now();
    if (this.state === "OPEN" && now >= this.nextAttemptTime) {
      this.state = "HALF_OPEN";
    }
    return this.state;
  }

  /**
   * Executes an asynchronous external API call through the circuit breaker.
   * If the circuit is OPEN, immediately executes the fallback or throws.
   */
  public async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      if (fallback) {
        return await fallback();
      }
      throw new Error(
        `CircuitBreaker [${this.name}] is OPEN. External service unavailable. Fast-fail triggered.`
      );
    }

    try {
      // Execute operation with timeout promise race
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
        )
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        return await fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.onFailure();
  }

  public trip(): void {
    this.state = "OPEN";
    this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
  }

  private onFailure(): void {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
    }
  }

  /**
   * Diagnostic metrics for health checks and observability dashboard.
   */
  public getMetrics() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      nextAttemptTime: this.nextAttemptTime ? new Date(this.nextAttemptTime).toISOString() : null
    };
  }

  /**
   * Reset circuit to CLOSED (for testing or manual admin intervention).
   */
  public reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
  }
}

/**
 * Global Registry of Circuit Breakers for external integrations
 */
export class CircuitBreakerRegistry {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  public static getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  public static getAllMetrics() {
    return Array.from(this.breakers.values()).map((b) => b.getMetrics());
  }

  public static resetAll(): void {
    this.breakers.forEach((b) => b.reset());
    this.breakers.clear();
  }
}
