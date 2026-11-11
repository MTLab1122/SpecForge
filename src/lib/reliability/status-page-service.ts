import { Logger } from "./observability.ts";
import { type Incident } from "./incident-workflow.ts";

export type StatusComponentId =
  | "CORE_API"
  | "AI_SERVICES"
  | "FILE_PROCESSING"
  | "INTEGRATIONS_PLATFORM"
  | "BILLING_AND_CHECKOUT"
  | "WEBHOOK_INGESTION"
  | "DATABASE_PERSISTENCE";

export type ComponentHealth =
  | "OPERATIONAL"
  | "DEGRADED_PERFORMANCE"
  | "PARTIAL_OUTAGE"
  | "MAJOR_OUTAGE"
  | "UNDER_MAINTENANCE";

export type OverallSystemStatus =
  | "ALL_SYSTEMS_OPERATIONAL"
  | "SOME_SYSTEMS_DEGRADED"
  | "PARTIAL_SYSTEM_OUTAGE"
  | "MAJOR_SYSTEM_OUTAGE";

export interface StatusComponent {
  id: StatusComponentId;
  name: string;
  description: string;
  status: ComponentHealth;
  uptime90DaysPercent: number;
}

export interface PublicIncidentUpdate {
  id: string;
  incidentId: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  message: string;
  timestamp: string;
}

export interface PublicIncident {
  id: string;
  title: string;
  severity: string;
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  affectedComponents: StatusComponentId[];
  startedAt: string;
  resolvedAt?: string;
  updates: PublicIncidentUpdate[];
}

export interface MaintenanceNotice {
  id: string;
  title: string;
  affectedComponents: StatusComponentId[];
  scheduledStart: string;
  scheduledEnd: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  description: string;
}

export interface HistoricalIncident {
  id: string;
  title: string;
  resolvedAt: string;
  durationMinutes: number;
  summary: string;
}

export interface PublicStatusSnapshot {
  overallStatus: OverallSystemStatus;
  updatedAt: string;
  components: StatusComponent[];
  activeIncidents: PublicIncident[];
  maintenanceNotices: MaintenanceNotice[];
  pastIncidents: HistoricalIncident[];
}

export class StatusPageService {
  private static components: Map<StatusComponentId, StatusComponent> = new Map([
    [
      "CORE_API",
      {
        id: "CORE_API",
        name: "Core API & Workspaces",
        description: "REST & tRPC API endpoints, user authentication, and workspace state",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.98
      }
    ],
    [
      "AI_SERVICES",
      {
        id: "AI_SERVICES",
        name: "AI Requirements & Story Generation",
        description: "Brief analysis, user story extraction, and proposal estimation models",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.82
      }
    ],
    [
      "FILE_PROCESSING",
      {
        id: "FILE_PROCESSING",
        name: "Document Ingestion & Media Processing",
        description: "PDF extraction, RFP brief parsing, and media storage pipelines",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.95
      }
    ],
    [
      "INTEGRATIONS_PLATFORM",
      {
        id: "INTEGRATIONS_PLATFORM",
        name: "Delivery Integrations",
        description: "Two-way task sync with Linear, Jira, Slack, Trello, and GitHub",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.91
      }
    ],
    [
      "BILLING_AND_CHECKOUT",
      {
        id: "BILLING_AND_CHECKOUT",
        name: "Stripe Billing & Subscriptions",
        description: "Credit ledger, subscription provisioning, and customer portal",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.99
      }
    ],
    [
      "WEBHOOK_INGESTION",
      {
        id: "WEBHOOK_INGESTION",
        name: "Webhook Ingestion Gateway",
        description: "Asynchronous webhook processing, signature verification, and idempotency",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.97
      }
    ],
    [
      "DATABASE_PERSISTENCE",
      {
        id: "DATABASE_PERSISTENCE",
        name: "Database & Persistence Cluster",
        description: "PostgreSQL transactional datastore, replicas, and connection pools",
        status: "OPERATIONAL",
        uptime90DaysPercent: 99.99
      }
    ]
  ]);

  private static activeIncidents: Map<string, PublicIncident> = new Map();
  private static pastIncidents: HistoricalIncident[] = [];
  private static maintenanceNotices: Map<string, MaintenanceNotice> = new Map();

  /**
   * Updates component status and logs change.
   */
  public static updateComponentStatus(
    componentId: StatusComponentId,
    status: ComponentHealth,
    note?: string
  ): StatusComponent {
    const comp = this.components.get(componentId);
    if (!comp) {
      throw new Error(`Component '${componentId}' does not exist.`);
    }

    comp.status = status;
    Logger.info(`[STATUS PAGE] Component '${componentId}' transitioned to ${status}`, {
      context: { componentId, status, note }
    });

    return comp;
  }

  /**
   * Publishes or updates a customer-facing public incident bulletin.
   */
  public static publishIncidentUpdate(params: {
    incidentId: string;
    title: string;
    severity?: string;
    status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
    message: string;
    affectedComponents?: StatusComponentId[];
  }): PublicIncident {
    let incident = this.activeIncidents.get(params.incidentId);

    if (!incident) {
      incident = {
        id: params.incidentId,
        title: params.title,
        severity: params.severity || "HIGH",
        status: params.status,
        affectedComponents: params.affectedComponents || ["CORE_API"],
        startedAt: new Date().toISOString(),
        updates: []
      };
      this.activeIncidents.set(params.incidentId, incident);
    } else {
      incident.status = params.status;
      if (params.affectedComponents) {
        incident.affectedComponents = params.affectedComponents;
      }
    }

    const update: PublicIncidentUpdate = {
      id: `upd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      incidentId: params.incidentId,
      status: params.status,
      message: params.message,
      timestamp: new Date().toISOString()
    };
    incident.updates.push(update);

    // Update affected components if applicable
    if (params.status === "RESOLVED") {
      incident.resolvedAt = new Date().toISOString();
      for (const compId of incident.affectedComponents) {
        this.updateComponentStatus(compId, "OPERATIONAL", "Incident resolved.");
      }

      // Move to past incidents
      this.pastIncidents.unshift({
        id: incident.id,
        title: incident.title,
        resolvedAt: incident.resolvedAt,
        durationMinutes: 15,
        summary: params.message
      });
      this.activeIncidents.delete(params.incidentId);
    } else {
      // Mark components as degraded or outage
      const targetState: ComponentHealth =
        params.status === "INVESTIGATING" ? "DEGRADED_PERFORMANCE" : "PARTIAL_OUTAGE";
      for (const compId of incident.affectedComponents) {
        this.updateComponentStatus(compId, targetState, params.message);
      }
    }

    Logger.info(`[STATUS PAGE UPDATE] Incident '${params.incidentId}' [${params.status}]: ${params.message}`);
    return incident;
  }

  /**
   * Schedules planned maintenance window.
   */
  public static scheduleMaintenance(params: {
    title: string;
    affectedComponents: StatusComponentId[];
    scheduledStart: string;
    scheduledEnd: string;
    description: string;
  }): MaintenanceNotice {
    const id = `maint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const notice: MaintenanceNotice = {
      id,
      title: params.title,
      affectedComponents: params.affectedComponents,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      status: "SCHEDULED",
      description: params.description
    };

    this.maintenanceNotices.set(id, notice);
    Logger.info(`[STATUS PAGE MAINTENANCE] Maintenance '${params.title}' scheduled: ${params.scheduledStart} to ${params.scheduledEnd}`);
    return notice;
  }

  /**
   * Updates maintenance notice status.
   */
  public static updateMaintenanceStatus(
    maintenanceId: string,
    status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"
  ): MaintenanceNotice {
    const notice = this.maintenanceNotices.get(maintenanceId);
    if (!notice) {
      throw new Error(`Maintenance '${maintenanceId}' not found.`);
    }

    notice.status = status;
    if (status === "IN_PROGRESS") {
      for (const compId of notice.affectedComponents) {
        this.updateComponentStatus(compId, "UNDER_MAINTENANCE", "Scheduled maintenance window active.");
      }
    } else if (status === "COMPLETED") {
      for (const compId of notice.affectedComponents) {
        this.updateComponentStatus(compId, "OPERATIONAL", "Scheduled maintenance completed successfully.");
      }
    }

    return notice;
  }

  /**
   * Returns a complete, sanitized public status snapshot suitable for client consumption.
   */
  public static getPublicStatus(): PublicStatusSnapshot {
    const components = Array.from(this.components.values());
    const hasMajor = components.some((c) => c.status === "MAJOR_OUTAGE");
    const hasPartial = components.some((c) => c.status === "PARTIAL_OUTAGE");
    const hasDegraded = components.some((c) => c.status === "DEGRADED_PERFORMANCE" || c.status === "UNDER_MAINTENANCE");

    let overallStatus: OverallSystemStatus = "ALL_SYSTEMS_OPERATIONAL";
    if (hasMajor) overallStatus = "MAJOR_SYSTEM_OUTAGE";
    else if (hasPartial) overallStatus = "PARTIAL_SYSTEM_OUTAGE";
    else if (hasDegraded) overallStatus = "SOME_SYSTEMS_DEGRADED";

    return {
      overallStatus,
      updatedAt: new Date().toISOString(),
      components,
      activeIncidents: Array.from(this.activeIncidents.values()),
      maintenanceNotices: Array.from(this.maintenanceNotices.values()).filter((m) => m.status !== "COMPLETED"),
      pastIncidents: this.pastIncidents.slice(0, 10)
    };
  }

  public static clear(): void {
    for (const comp of this.components.values()) {
      comp.status = "OPERATIONAL";
    }
    this.activeIncidents.clear();
    this.pastIncidents = [];
    this.maintenanceNotices.clear();
  }
}

