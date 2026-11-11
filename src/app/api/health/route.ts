import { NextRequest, NextResponse } from "next/server";
import { HealthCheckService } from "@/lib/reliability/observability";
import { CircuitBreakerRegistry } from "@/lib/reliability/circuit-breaker-registry";

export async function GET(req: NextRequest) {
  try {
    const health = await HealthCheckService.performHealthCheck();
    const downstreamStatus = CircuitBreakerRegistry.getGlobalStatus();

    const overallStatus =
      health.status === "UNHEALTHY" || downstreamStatus.status === "CRITICAL"
        ? "UNHEALTHY"
        : health.status === "DEGRADED" || downstreamStatus.status === "DEGRADED"
        ? "DEGRADED"
        : "HEALTHY";

    const statusCode = overallStatus === "UNHEALTHY" ? 503 : 200;

    return NextResponse.json(
      {
        ...health,
        status: overallStatus,
        downstreamIntegrations: downstreamStatus
      },
      { status: statusCode }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "UNHEALTHY",
        error: error.message || "Health probe failed"
      },
      { status: 503 }
    );
  }
}
