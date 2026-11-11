import { SloTracker } from "./slo-tracker.ts";
import { CircuitBreakerRegistry } from "./circuit-breaker-registry.ts";
import { ReliableJobQueue } from "./job-queue.ts";
import { HealthCheckService, type HealthCheckResult } from "./observability.ts";

export interface PostMortemDocument {
  incidentId: string;
  title: string;
  outageMinutes: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorBudgetConsumedPercent: number;
  author: string;
  createdAt: string;
  markdownDoc: string;
  actionItems: Array<{ id: string; description: string; owner: string; status: "TODO" | "IN_PROGRESS" | "DONE" }>;
}

export class MetricsExporter {
  private static postMortems: Map<string, PostMortemDocument> = new Map();

  /**
   * Generates Prometheus / OpenTelemetry text formatted metrics.
   */
  public static async exportPrometheusMetrics(): Promise<string> {
    const budget = SloTracker.calculateErrorBudget();
    const breakers = CircuitBreakerRegistry.getAllMetrics();
    const deadLetters = ReliableJobQueue.listDeadLetters();
    const lines: string[] = [];

    lines.push("# HELP specforge_error_budget_remaining_percent Percentage of monthly error budget remaining");
    lines.push("# TYPE specforge_error_budget_remaining_percent gauge");
    lines.push(`specforge_error_budget_remaining_percent ${budget.remainingBudgetPercent}`);

    lines.push("# HELP specforge_error_budget_burn_rate_1h Current 1-hour error budget burn rate");
    lines.push("# TYPE specforge_error_budget_burn_rate_1h gauge");
    lines.push(`specforge_error_budget_burn_rate_1h ${budget.burnRate1h}`);

    lines.push("# HELP specforge_release_freeze_active Binary indicator of automated release freeze");
    lines.push("# TYPE specforge_release_freeze_active gauge");
    lines.push(`specforge_release_freeze_active ${budget.releaseGateStatus === "RELEASE_FREEZE_ACTIVE" ? 1 : 0}`);

    lines.push("# HELP specforge_dead_letter_jobs_total Total count of jobs currently in dead letter queue");
    lines.push("# TYPE specforge_dead_letter_jobs_total gauge");
    lines.push(`specforge_dead_letter_jobs_total ${deadLetters.length}`);

    lines.push("# HELP specforge_circuit_breaker_state Current state of integration circuit breakers (0=CLOSED, 1=HALF_OPEN, 2=OPEN)");
    lines.push("# TYPE specforge_circuit_breaker_state gauge");
    for (const b of breakers) {
      const stateVal = b.state === "OPEN" ? 2 : b.state === "HALF_OPEN" ? 1 : 0;
      lines.push(`specforge_circuit_breaker_state{service="${b.name}"} ${stateVal}`);
    }

    return lines.join("\n") + "\n";
  }

  /**
   * Generates a formal SRE Blameless Post-Mortem report.
   */
  public static generatePostMortem(params: {
    incidentId: string;
    title: string;
    outageMinutes: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    rootCause: string;
    triggerAction: string;
    author: string;
    actionItems?: string[];
  }): PostMortemDocument {
    const impact = SloTracker.registerIncident({
      incidentId: params.incidentId,
      title: params.title,
      outageMinutes: params.outageMinutes,
      impactSeverityPercent: params.severity === "CRITICAL" ? 100 : params.severity === "HIGH" ? 75 : 50
    });

    const items = (params.actionItems || [
      "Add automated circuit breaker alert threshold",
      "Introduce idempotency cache key on affected endpoint",
      "Update runbook with recovery drill"
    ]).map((desc, i) => ({
      id: `act_${i + 1}`,
      description: desc,
      owner: params.author,
      status: "TODO" as const
    }));

    const markdownDoc = [
      `# INCIDENT POST-MORTEM: ${params.title.toUpperCase()}`,
      `**Incident ID**: ${params.incidentId}`,
      `**Date**: ${new Date().toISOString()}`,
      `**Author / Lead SRE**: ${params.author}`,
      `**Severity**: ${params.severity}`,
      `**Total Outage Duration**: ${params.outageMinutes} minutes`,
      `**Monthly Error Budget Consumed**: ${impact.budgetConsumedPercent}% (Mandatory Post-Mortem: ${impact.requiresPostMortem ? "YES" : "NO"})`,
      "",
      "## 1. Executive Summary",
      `Between ${new Date(Date.now() - params.outageMinutes * 60000).toISOString()} and ${new Date().toISOString()}, SpecForge experienced an outage affecting ${params.title}. The system automatically triggered fail-safe protections and degraded mode.`,
      "",
      "## 2. Root Cause Analysis (Five Whys)",
      `**Direct Cause**: ${params.rootCause}`,
      `**Trigger**: ${params.triggerAction}`,
      "",
      "## 3. Preventive Action Items",
      ...items.map((it) => `- [ ] **${it.id}**: ${it.description} (Owner: @${it.owner})`),
      "",
      "## 4. Blameless Culture Declaration",
      "This post-mortem focuses on systemic vulnerabilities, software invariants, and automated safety nets. Human errors are treated as opportunities to harden automated guards."
    ].join("\n");

    const record: PostMortemDocument = {
      incidentId: params.incidentId,
      title: params.title,
      outageMinutes: params.outageMinutes,
      severity: params.severity,
      errorBudgetConsumedPercent: impact.budgetConsumedPercent,
      author: params.author,
      createdAt: new Date().toISOString(),
      markdownDoc,
      actionItems: items
    };

    this.postMortems.set(params.incidentId, record);
    return record;
  }

  /**
   * Retrieves post mortem by incident ID.
   */
  public static getPostMortem(incidentId: string): PostMortemDocument | null {
    return this.postMortems.get(incidentId) || null;
  }

  /**
   * Container readiness evaluation.
   */
  public static async getReadiness(): Promise<HealthCheckResult> {
    return await HealthCheckService.performHealthCheck();
  }
}
