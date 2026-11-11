import { TelemetryDashboardService, type TelemetryDashboardSnapshot } from "./telemetry-dashboard.ts";
import { Logger } from "./observability.ts";

export type AlertCategory =
  | "SLO_BREACH"
  | "ERROR_RATE_SPIKE"
  | "QUEUE_BACKLOG"
  | "DEAD_LETTER_GROWTH"
  | "INTEGRATION_FAILURE_SPIKE"
  | "WEBHOOK_FAILURE_SPIKE"
  | "BILLING_MISMATCH"
  | "DATABASE_CONNECTION_SATURATION"
  | "SECURITY_ANOMALY";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL" | "PAGE";
export type AlertStatus = "FIRING" | "ACKNOWLEDGED" | "RESOLVED";

export interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  severity: AlertSeverity;
  evaluate: (snapshot: TelemetryDashboardSnapshot) => { shouldFire: boolean; message: string; value?: any };
}

export interface Alert {
  id: string;
  ruleId: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  value?: any;
  firedAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  incidentId?: string;
}

export class AlertManager {
  private static alerts: Map<string, Alert> = new Map();
  private static alertHistory: Alert[] = [];
  private static customRules: AlertRule[] = [];

  private static defaultRules: AlertRule[] = [
    {
      id: "rule_slo_availability",
      name: "Core API Availability SLO Breach",
      category: "SLO_BREACH",
      severity: "CRITICAL",
      evaluate: (s) => ({
        shouldFire: s.totalRequests >= 10 && s.apiAvailabilityPercent < 99.5,
        message: `API availability dropped to ${s.apiAvailabilityPercent}% (Target: 99.5%)`,
        value: s.apiAvailabilityPercent
      })
    },
    {
      id: "rule_slo_latency",
      name: "Core API p95 Latency SLO Breach",
      category: "SLO_BREACH",
      severity: "CRITICAL",
      evaluate: (s) => ({
        shouldFire: s.totalRequests >= 10 && s.apiLatency.p95Ms > 800,
        message: `API p95 latency reached ${s.apiLatency.p95Ms}ms (Target: < 800ms)`,
        value: s.apiLatency.p95Ms
      })
    },
    {
      id: "rule_error_rate_spike",
      name: "API 5xx Error Rate Spike",
      category: "ERROR_RATE_SPIKE",
      severity: "PAGE",
      evaluate: (s) => ({
        shouldFire: s.totalRequests >= 10 && s.errorRatePercent > 1.0,
        message: `API 5xx error rate spiked to ${s.errorRatePercent}% (Threshold: > 1.0%)`,
        value: s.errorRatePercent
      })
    },
    {
      id: "rule_queue_backlog",
      name: "Background Job Queue Backlog",
      category: "QUEUE_BACKLOG",
      severity: "WARNING",
      evaluate: (s) => ({
        shouldFire: s.queueDepth.totalBacklog > 100,
        message: `Queue depth exceeded capacity: ${s.queueDepth.totalBacklog} pending/retrying jobs`,
        value: s.queueDepth.totalBacklog
      })
    },
    {
      id: "rule_dead_letter_growth",
      name: "Dead-Letter Queue Growth Detected",
      category: "DEAD_LETTER_GROWTH",
      severity: "CRITICAL",
      evaluate: (s) => ({
        shouldFire: s.queueDepth.deadLetter > 0,
        message: `${s.queueDepth.deadLetter} job(s) entered the dead letter queue (DLQ) requiring operator intervention`,
        value: s.queueDepth.deadLetter
      })
    },
    {
      id: "rule_integration_failure_spike",
      name: "Delivery Integration Failure Spike",
      category: "INTEGRATION_FAILURE_SPIKE",
      severity: "CRITICAL",
      evaluate: (s) => ({
        shouldFire: s.integrationSuccessRatePercent < 95.0,
        message: `Integration export success rate dropped to ${s.integrationSuccessRatePercent}% across Linear/Jira/Slack`,
        value: s.integrationSuccessRatePercent
      })
    },
    {
      id: "rule_webhook_failure_spike",
      name: "Inbound Webhook Ingestion Failure Spike",
      category: "WEBHOOK_FAILURE_SPIKE",
      severity: "PAGE",
      evaluate: (s) => ({
        shouldFire: s.webhookSuccessRatePercent < 98.0,
        message: `Webhook ingestion success rate dropped to ${s.webhookSuccessRatePercent}%`,
        value: s.webhookSuccessRatePercent
      })
    },
    {
      id: "rule_billing_mismatch",
      name: "Stripe Billing Reconciliation Discrepancy",
      category: "BILLING_MISMATCH",
      severity: "PAGE",
      evaluate: (s) => ({
        shouldFire: s.billingReconciliation.status === "MISMATCH_DETECTED",
        message: `Stripe billing reconciliation detected ${s.billingReconciliation.mismatchCount} workspace discrepancies: ${s.billingReconciliation.unreconciledWorkspaces.join(", ")}`,
        value: s.billingReconciliation.mismatchCount
      })
    },
    {
      id: "rule_db_saturation",
      name: "PostgreSQL Connection Pool Saturation",
      category: "DATABASE_CONNECTION_SATURATION",
      severity: "PAGE",
      evaluate: (s) => ({
        shouldFire: s.databaseConnectionUsage.status === "SATURATED",
        message: `Database connection pool utilization reached ${s.databaseConnectionUsage.saturationPercent}% (${s.databaseConnectionUsage.active}/${s.databaseConnectionUsage.maxCapacity} connections)`,
        value: s.databaseConnectionUsage.saturationPercent
      })
    }
  ];

  /**
   * Evaluates all alert rules against live or provided telemetry.
   */
  public static evaluateTelemetry(snapshot?: TelemetryDashboardSnapshot): Alert[] {
    const data = snapshot || TelemetryDashboardService.getSnapshot();
    const rules = [...this.defaultRules, ...this.customRules];
    const newlyFired: Alert[] = [];

    for (const rule of rules) {
      const result = rule.evaluate(data);
      const activeAlert = Array.from(this.alerts.values()).find(
        (a) => a.ruleId === rule.id && a.status === "FIRING"
      );

      if (result.shouldFire) {
        if (!activeAlert) {
          const alertId = `alert_${Date.now()}_${rule.id}`;
          const newAlert: Alert = {
            id: alertId,
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            status: "FIRING",
            title: rule.name,
            message: result.message,
            value: result.value,
            firedAt: new Date().toISOString()
          };

          this.alerts.set(alertId, newAlert);
          this.alertHistory.push({ ...newAlert });
          newlyFired.push(newAlert);

          Logger.warn(`[ALERT FIRING] [${rule.severity}] ${rule.name}: ${result.message}`, {
            context: { alertId, category: rule.category, value: result.value }
          });
        }
      } else {
        // Condition cleared: auto-resolve firing alert
        if (activeAlert) {
          activeAlert.status = "RESOLVED";
          activeAlert.resolvedAt = new Date().toISOString();
          activeAlert.resolvedBy = "SYSTEM_AUTO_RESOLVE";

          Logger.info(`[ALERT RESOLVED] ${rule.name} recovered to normal parameters.`, {
            context: { alertId: activeAlert.id }
          });
        }
      }
    }

    return newlyFired;
  }

  /**
   * Fires a Security Anomaly alert immediately.
   */
  public static triggerSecurityAnomaly(params: {
    title: string;
    message: string;
    organizationId?: string;
    userId?: string;
    anomalyType: string;
    metadata?: Record<string, any>;
  }): Alert {
    const alertId = `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const alert: Alert = {
      id: alertId,
      ruleId: "sec_anomaly_rule",
      category: "SECURITY_ANOMALY",
      severity: "PAGE",
      status: "FIRING",
      title: `SECURITY ANOMALY: ${params.title}`,
      message: params.message,
      value: params.anomalyType,
      firedAt: new Date().toISOString()
    };

    this.alerts.set(alertId, alert);
    this.alertHistory.push({ ...alert });

    Logger.error(`[SECURITY ALERT] ${params.title}: ${params.message}`, undefined, {
      organizationId: params.organizationId,
      userId: params.userId,
      context: { alertId, anomalyType: params.anomalyType, ...params.metadata }
    });

    return alert;
  }

  /**
   * Acknowledges an active alert.
   */
  public static acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert '${alertId}' not found.`);
    }

    alert.status = "ACKNOWLEDGED";
    alert.acknowledgedAt = new Date().toISOString();
    alert.acknowledgedBy = acknowledgedBy;

    Logger.info(`[ALERT ACKNOWLEDGED] Alert '${alert.title}' acknowledged by ${acknowledgedBy}.`, {
      context: { alertId }
    });

    return alert;
  }

  /**
   * Resolves an alert manually.
   */
  public static resolveAlert(alertId: string, resolvedBy: string): Alert {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert '${alertId}' not found.`);
    }

    alert.status = "RESOLVED";
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedBy = resolvedBy;

    Logger.info(`[ALERT RESOLVED] Alert '${alert.title}' resolved by ${resolvedBy}.`, {
      context: { alertId }
    });

    return alert;
  }

  /**
   * Returns all currently firing alerts.
   */
  public static listFiringAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter((a) => a.status === "FIRING");
  }

  /**
   * Returns alert audit history.
   */
  public static getAlertHistory(limit: number = 50): Alert[] {
    return this.alertHistory.slice(-limit).reverse();
  }

  public static clear(): void {
    this.alerts.clear();
    this.alertHistory = [];
    this.customRules = [];
  }
}

