import { NextResponse } from "next/server";
import { HealthCheckService } from "@/lib/reliability/observability";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";

export async function GET() {
  try {
    const baseHealth = await HealthCheckService.performHealthCheck();
    const breakerHealth = CircuitBreakerRegistry.getGlobalStatus();

    const isReady =
      baseHealth.status !== "UNHEALTHY" && breakerHealth.status !== "CRITICAL";

    const responsePayload = {
      ready: isReady,
      status: isReady ? (breakerHealth.status === "DEGRADED" ? "DEGRADED" : "HEALTHY") : "UNREADY",
      timestamp: new Date().toISOString(),
      checks: {
        database: baseHealth.checks.database,
        memory: baseHealth.checks.memory,
        jobQueue: baseHealth.checks.jobQueue,
        downstreamIntegrations: breakerHealth
      }
    };

    return NextResponse.json(responsePayload, { status: isReady ? 200 : 503 });
  } catch (error: any) {
    return NextResponse.json(
      {
        ready: false,
        status: "UNREADY",
        error: error.message || "Readiness probe failed"
      },
      { status: 503 }
    );
  }
}

