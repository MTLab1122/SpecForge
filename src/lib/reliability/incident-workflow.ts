import { Logger } from "./observability.ts";
import { SloTracker } from "./slo-tracker.ts";

export type IncidentSeverity = "SEV1_CRITICAL" | "SEV2_HIGH" | "SEV3_MEDIUM" | "SEV4_LOW";

export type IncidentStage =
  | "DETECTED"
  | "ALERTED"
  | "OWNER_ASSIGNED"
  | "INVESTIGATING"
  | "MITIGATED"
  | "COMMUNICATED"
  | "RESOLVED"
  | "POSTMORTEM_COMPLETED"
  | "PREVENTIVE_ACTIONS_VERIFIED";

export interface IncidentActionItem {
  id: string;
  description: string;
  owner: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface IncidentCommunication {
  timestamp: string;
  channel: "PUBLIC_STATUS" | "INTERNAL_SLACK" | "EMAIL";
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  stage: IncidentStage;
  affectedComponents: string[];
  triggerSource: string;

  // Timestamps & ownership
  detectedAt: string;
  alertedAt?: string;
  ownerAssignedAt?: string;
  incidentCommander?: string;
  leadEngineer?: string;

  // Investigation & Mitigation
  investigationNotes: string[];
  correlatedTraceIds: string[];
  mitigationAction?: string;
  mitigatedAt?: string;
  degradedModeActive?: boolean;

  // Communications & Resolution
  communications: IncidentCommunication[];
  resolvedAt?: string;
  resolutionSummary?: string;
  outageDurationMinutes: number;

  // Postmortem & Prevention
  postMortemMarkdown?: string;
  errorBudgetImpactPercent?: number;
  actionItems: IncidentActionItem[];
}

export class IncidentWorkflowManager {
  private static incidents: Map<string, Incident> = new Map();

  /**
   * 1. DETECT: Registers a newly detected incident from telemetry or human alert.
   */
  public static detectIncident(params: {
    title: string;
    severity: IncidentSeverity;
    affectedComponents: string[];
    triggerSource?: string;
  }): Incident {
    const id = `INC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const incident: Incident = {
      id,
      title: params.title,
      severity: params.severity,
      stage: "DETECTED",
      affectedComponents: params.affectedComponents,
      triggerSource: params.triggerSource || "AUTOMATED_SLO_MONITOR",
      detectedAt: new Date().toISOString(),
      investigationNotes: [],
      correlatedTraceIds: [],
      communications: [],
      outageDurationMinutes: 0,
      actionItems: []
    };

    this.incidents.set(id, incident);
    Logger.error(`[INCIDENT DETECTED] [${params.severity}] ${id}: ${params.title}`, undefined, {
      context: { incidentId: id, components: params.affectedComponents }
    });

    return incident;
  }

  /**
   * 2. ALERT: Dispatches on-call alerts via PagerDuty / Slack.
   */
  public static dispatchAlert(incidentId: string, alertChannels: string[] = ["pagerduty", "slack-sre"]): Incident {
    const inc = this.getRequiredIncident(incidentId);
    inc.stage = "ALERTED";
    inc.alertedAt = new Date().toISOString();

    Logger.warn(`[INCIDENT ALERTED] ${inc.id} paged via ${alertChannels.join(", ")}`, {
      context: { incidentId: inc.id, severity: inc.severity }
    });

    return inc;
  }

  /**
   * 3. ASSIGN OWNER: Designates the Incident Commander and Lead Technical Responder.
   */
  public static assignOwners(
    incidentId: string,
    params: { incidentCommander: string; leadEngineer: string }
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);
    inc.stage = "OWNER_ASSIGNED";
    inc.incidentCommander = params.incidentCommander;
    inc.leadEngineer = params.leadEngineer;
    inc.ownerAssignedAt = new Date().toISOString();

    Logger.info(`[INCIDENT OWNED] ${inc.id} assigned to IC: @${params.incidentCommander}, Lead: @${params.leadEngineer}`, {
      context: { incidentId: inc.id }
    });

    return inc;
  }

  /**
   * 4. INVESTIGATE: Logs diagnostic hypotheses, runbook executions, and correlated trace IDs.
   */
  public static recordInvestigation(
    incidentId: string,
    notes: string,
    traceIds: string[] = []
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);
    inc.stage = "INVESTIGATING";
    inc.investigationNotes.push(`[${new Date().toISOString()}] ${notes}`);
    if (traceIds.length > 0) {
      inc.correlatedTraceIds.push(...traceIds);
    }

    Logger.info(`[INCIDENT INVESTIGATION] ${inc.id}: ${notes}`, {
      context: { incidentId: inc.id, traceIds }
    });

    return inc;
  }

  /**
   * 5. MITIGATE: Implements immediate relief (circuit breakers, rolling restart, degraded mode).
   */
  public static applyMitigation(
    incidentId: string,
    mitigationAction: string,
    enableDegradedMode: boolean = false
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);
    inc.stage = "MITIGATED";
    inc.mitigationAction = mitigationAction;
    inc.mitigatedAt = new Date().toISOString();
    inc.degradedModeActive = enableDegradedMode;

    Logger.warn(`[INCIDENT MITIGATED] ${inc.id}: ${mitigationAction} (Degraded Mode: ${enableDegradedMode})`, {
      context: { incidentId: inc.id, mitigationAction }
    });

    return inc;
  }

  /**
   * 6. COMMUNICATE: Publishes customer-facing status bulletins or internal stakeholder briefs.
   */
  public static publishCommunication(
    incidentId: string,
    channel: "PUBLIC_STATUS" | "INTERNAL_SLACK" | "EMAIL",
    message: string
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);
    inc.stage = "COMMUNICATED";
    inc.communications.push({
      timestamp: new Date().toISOString(),
      channel,
      message
    });

    Logger.info(`[INCIDENT COMMUNICATED] [${channel}] ${inc.id}: ${message}`, {
      context: { incidentId: inc.id, channel }
    });

    return inc;
  }

  /**
   * 7. RESOLVE: Confirms telemetry recovery to baseline parameters.
   */
  public static resolveIncident(incidentId: string, resolutionSummary: string): Incident {
    const inc = this.getRequiredIncident(incidentId);
    const resolvedAt = new Date().toISOString();
    const startMs = new Date(inc.detectedAt).getTime();
    const endMs = new Date(resolvedAt).getTime();
    const durationMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    inc.stage = "RESOLVED";
    inc.resolvedAt = resolvedAt;
    inc.resolutionSummary = resolutionSummary;
    inc.outageDurationMinutes = durationMinutes;
    inc.degradedModeActive = false;

    // Record error budget impact via SloTracker
    const sloImpact = SloTracker.registerIncident({
      incidentId: inc.id,
      title: inc.title,
      outageMinutes: durationMinutes,
      impactSeverityPercent: inc.severity === "SEV1_CRITICAL" ? 100 : inc.severity === "SEV2_HIGH" ? 75 : 40
    });
    inc.errorBudgetImpactPercent = sloImpact.budgetConsumedPercent;

    Logger.info(`[INCIDENT RESOLVED] ${inc.id} resolved in ${durationMinutes}m. Summary: ${resolutionSummary}`, {
      context: { incidentId: inc.id, durationMinutes, errorBudgetBurned: sloImpact.budgetConsumedPercent }
    });

    return inc;
  }

  /**
   * 8. POSTMORTEM: Generates formal blameless postmortem documentation.
   */
  public static generatePostMortem(
    incidentId: string,
    params: {
      author: string;
      rootCause: string;
      fiveWhys: string[];
      actionItems: Array<{ description: string; owner: string }>;
    }
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);

    const actionItems: IncidentActionItem[] = params.actionItems.map((item, idx) => ({
      id: `act_${inc.id}_${idx + 1}`,
      description: item.description,
      owner: item.owner,
      verified: false
    }));

    const markdownDoc = [
      `# BLAMELESS POST-MORTEM: ${inc.title.toUpperCase()}`,
      `**Incident ID**: ${inc.id}`,
      `**Severity**: ${inc.severity}`,
      `**Duration**: ${inc.outageDurationMinutes} minutes`,
      `**Lead SRE / Author**: ${params.author}`,
      `**Incident Commander**: @${inc.incidentCommander || "unassigned"}`,
      `**Error Budget Consumed**: ${inc.errorBudgetImpactPercent ?? 0}%`,
      "",
      "## 1. Executive Summary",
      `On ${inc.detectedAt}, ${inc.title} caused service disruption. Total downtime: ${inc.outageDurationMinutes} minutes.`,
      `Resolution: ${inc.resolutionSummary || "Mitigation applied."}`,
      "",
      "## 2. Root Cause & Five Whys",
      `**Root Cause**: ${params.rootCause}`,
      "",
      ...params.fiveWhys.map((why, i) => `${i + 1}. ${why}`),
      "",
      "## 3. Preventive Action Items",
      ...actionItems.map((a) => `- [ ] **${a.id}**: ${a.description} (Owner: @${a.owner})`),
      "",
      "## 4. Blameless Culture Declaration",
      "We treat unexpected system behaviors as systemic feedback to improve tooling, invariant checks, and automated fallbacks."
    ].join("\n");

    inc.stage = "POSTMORTEM_COMPLETED";
    inc.postMortemMarkdown = markdownDoc;
    inc.actionItems = actionItems;

    Logger.info(`[INCIDENT POST-MORTEM COMPLETE] Post-mortem published for ${inc.id}`, {
      context: { incidentId: inc.id, actionItemsCount: actionItems.length }
    });

    return inc;
  }

  /**
   * 9. PREVENT RECURRENCE: Verifies completion and testing of an action item.
   */
  public static verifyPreventiveAction(
    incidentId: string,
    actionId: string,
    verifiedBy: string
  ): Incident {
    const inc = this.getRequiredIncident(incidentId);
    const item = inc.actionItems.find((a) => a.id === actionId);
    if (!item) {
      throw new Error(`Action item '${actionId}' not found in incident '${incidentId}'.`);
    }

    item.verified = true;
    item.verifiedAt = new Date().toISOString();
    item.verifiedBy = verifiedBy;

    // Check if all action items are verified
    if (inc.actionItems.every((a) => a.verified)) {
      inc.stage = "PREVENTIVE_ACTIONS_VERIFIED";
      Logger.info(`[INCIDENT CLOSED] All preventive actions verified for ${inc.id}`, {
        context: { incidentId: inc.id }
      });
    }

    return inc;
  }

  public static getIncident(id: string): Incident | null {
    return this.incidents.get(id) || null;
  }

  public static listActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (inc) => inc.stage !== "RESOLVED" && inc.stage !== "POSTMORTEM_COMPLETED" && inc.stage !== "PREVENTIVE_ACTIONS_VERIFIED"
    );
  }

  public static listAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  public static clear(): void {
    this.incidents.clear();
  }

  private static getRequiredIncident(id: string): Incident {
    const inc = this.incidents.get(id);
    if (!inc) {
      throw new Error(`Incident '${id}' does not exist.`);
    }
    return inc;
  }
}

