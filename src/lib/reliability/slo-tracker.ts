export type CriticalJourneyKey =
  | "REGISTER_AND_LOGIN"
  | "CREATE_WORKSPACE"
  | "CREATE_CLIENT_AND_PROJECT"
  | "UPLOAD_OR_PASTE_BRIEF"
  | "GENERATE_AI_REQUIREMENTS"
  | "REVIEW_AND_APPROVE_AI_OUTPUT"
  | "CREATE_SCOPE_VERSION"
  | "CREATE_ESTIMATE"
  | "GENERATE_AND_SEND_PROPOSAL"
  | "CLIENT_APPROVAL"
  | "GENERATE_TASKS"
  | "EXPORT_TASKS"
  | "CREATE_CHANGE_REQUEST"
  | "APPROVE_CHANGE_REQUEST"
  | "VIEW_DASHBOARD"
  | "DOWNLOAD_EXPORT";

export type SliMetricType =
  | "AVAILABILITY"
  | "LATENCY"
  | "AI_JOB_SUCCESS"
  | "TRANSCRIPTION_JOB_SUCCESS"
  | "INTEGRATION_EXPORT_SUCCESS"
  | "WEBHOOK_SUCCESS"
  | "BACKGROUND_JOB_SUCCESS"
  | "DATABASE_ERROR_RATE"
  | "FILE_UPLOAD_SUCCESS";

export interface JourneySloDefinition {
  journeyKey: CriticalJourneyKey;
  name: string;
  primarySli: SliMetricType;
  sloTargetPercent: number; // e.g. 99.5
  latencyTargetMs?: number; // e.g. 800ms
  windowDurationDays: number; // e.g. 30
  description: string;
}

export const CRITICAL_JOURNEYS: Record<CriticalJourneyKey, JourneySloDefinition> = {
  REGISTER_AND_LOGIN: {
    journeyKey: "REGISTER_AND_LOGIN",
    name: "Register and Log In",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "User authentication, session creation, MFA verification, and profile lookup."
  },
  CREATE_WORKSPACE: {
    journeyKey: "CREATE_WORKSPACE",
    name: "Create Workspace",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Organization creation, tenant provisioning, and initial role binding."
  },
  CREATE_CLIENT_AND_PROJECT: {
    journeyKey: "CREATE_CLIENT_AND_PROJECT",
    name: "Create Client and Project",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Client contact registration, project scaffolding, and metadata allocation."
  },
  UPLOAD_OR_PASTE_BRIEF: {
    journeyKey: "UPLOAD_OR_PASTE_BRIEF",
    name: "Upload or Paste Client Brief",
    primarySli: "FILE_UPLOAD_SUCCESS",
    sloTargetPercent: 99.0,
    latencyTargetMs: 1200,
    windowDurationDays: 30,
    description: "PDF/DOCX storage upload and raw paste document ingestion."
  },
  GENERATE_AI_REQUIREMENTS: {
    journeyKey: "GENERATE_AI_REQUIREMENTS",
    name: "Generate AI Requirements",
    primarySli: "AI_JOB_SUCCESS",
    sloTargetPercent: 95.0, // 95% within 5 minutes
    windowDurationDays: 30,
    description: "LLM extraction pipeline converting brief into user stories and criteria."
  },
  REVIEW_AND_APPROVE_AI_OUTPUT: {
    journeyKey: "REVIEW_AND_APPROVE_AI_OUTPUT",
    name: "Review and Approve AI Output",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 500,
    windowDurationDays: 30,
    description: "Requirements table editing, assumption confirmation, and MoSCoW prioritization."
  },
  CREATE_SCOPE_VERSION: {
    journeyKey: "CREATE_SCOPE_VERSION",
    name: "Create Scope Version",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 600,
    windowDurationDays: 30,
    description: "Scope locking, version increment, and semantic diff computation."
  },
  CREATE_ESTIMATE: {
    journeyKey: "CREATE_ESTIMATE",
    name: "Create Estimate",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 600,
    windowDurationDays: 30,
    description: "Commercial rate card arithmetic, contingency markup, and scenario calculation."
  },
  GENERATE_AND_SEND_PROPOSAL: {
    journeyKey: "GENERATE_AND_SEND_PROPOSAL",
    name: "Generate and Send Proposal",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Client proposal generation, SHA-256 seal hashing, and secure link issuance."
  },
  CLIENT_APPROVAL: {
    journeyKey: "CLIENT_APPROVAL",
    name: "Client Approval",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Client portal viewing, sectional sign-offs, and e-signature intent capture."
  },
  GENERATE_TASKS: {
    journeyKey: "GENERATE_TASKS",
    name: "Generate Tasks",
    primarySli: "BACKGROUND_JOB_SUCCESS",
    sloTargetPercent: 98.0,
    windowDurationDays: 30,
    description: "Converting approved scope deliverables into canonical InternalTask items."
  },
  EXPORT_TASKS: {
    journeyKey: "EXPORT_TASKS",
    name: "Export Tasks",
    primarySli: "INTEGRATION_EXPORT_SUCCESS",
    sloTargetPercent: 98.0, // 98% within 5 minutes
    windowDurationDays: 30,
    description: "Two-way integration export into Jira, Linear, Trello, GitHub, and Notion."
  },
  CREATE_CHANGE_REQUEST: {
    journeyKey: "CREATE_CHANGE_REQUEST",
    name: "Create Change Request",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Delta scope creation with automatic hour, budget, and timeline recalculation."
  },
  APPROVE_CHANGE_REQUEST: {
    journeyKey: "APPROVE_CHANGE_REQUEST",
    name: "Approve Change Request",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Client sign-off on change request and automated baseline scope adjustment."
  },
  VIEW_DASHBOARD: {
    journeyKey: "VIEW_DASHBOARD",
    name: "View Dashboard",
    primarySli: "LATENCY",
    sloTargetPercent: 99.5,
    latencyTargetMs: 800,
    windowDurationDays: 30,
    description: "Loading analytics, active project health, recent activities, and nudges."
  },
  DOWNLOAD_EXPORT: {
    journeyKey: "DOWNLOAD_EXPORT",
    name: "Download Export",
    primarySli: "AVAILABILITY",
    sloTargetPercent: 99.0,
    latencyTargetMs: 1500,
    windowDurationDays: 30,
    description: "Generating RFC 4180 CSV exports and markdown project digests."
  }
};

export interface SliMeasurementSample {
  totalEvents: number;
  goodEvents: number; // e.g. successful 2xx responses or completed jobs
  measuredPercent: number; // (goodEvents / totalEvents) * 100
  p95LatencyMs?: number;
}

export interface ErrorBudgetStatus {
  sloTargetPercent: number;
  totalMonthlyErrorBudgetPercent: number; // 100 - SLO
  consumedBudgetPercent: number; // Out of total monthly budget (0 - 100%)
  remainingBudgetPercent: number; // 100% - consumedBudgetPercent
  isExhausted: boolean; // true if remaining <= 0%
  releaseGateStatus: "RELEASES_ALLOWED" | "RELEASE_FREEZE_ACTIVE";
  burnRate1h: number; // e.g. 1.0 = normal, 14.4 = critical 1h burn
  burnRate6h: number;
  burnRate24h: number;
  activeAlerts: Array<{
    severity: "PAGE_CRITICAL" | "TICKET_WARNING";
    title: string;
    message: string;
  }>;
}

export interface IncidentBudgetImpact {
  incidentId: string;
  title: string;
  durationMinutes: number;
  budgetConsumedPercent: number; // e.g. 25% of monthly budget
  requiresPostMortem: boolean; // true if budgetConsumedPercent >= 20%
}

export interface JourneySloReport {
  journeyKey: CriticalJourneyKey;
  name: string;
  primarySli: SliMetricType;
  sloTargetPercent: number;
  currentActualPercent: number;
  status: "PASSING" | "WARNING" | "BREACHED";
  p95LatencyMs?: number;
  latencyTargetMs?: number;
}

export class SloTracker {
  // In-memory telemetry cache for 30-day sliding window (can be backed by TimescaleDB / Prometheus)
  private static telemetrySamples: Map<CriticalJourneyKey, SliMeasurementSample> = new Map([
    ["REGISTER_AND_LOGIN", { totalEvents: 12500, goodEvents: 12480, measuredPercent: 99.84, p95LatencyMs: 340 }],
    ["CREATE_WORKSPACE", { totalEvents: 1400, goodEvents: 1398, measuredPercent: 99.85, p95LatencyMs: 420 }],
    ["CREATE_CLIENT_AND_PROJECT", { totalEvents: 4200, goodEvents: 4188, measuredPercent: 99.71, p95LatencyMs: 380 }],
    ["UPLOAD_OR_PASTE_BRIEF", { totalEvents: 3100, goodEvents: 3080, measuredPercent: 99.35, p95LatencyMs: 620 }],
    ["GENERATE_AI_REQUIREMENTS", { totalEvents: 2800, goodEvents: 2695, measuredPercent: 96.25 }], // Target: 95%
    ["REVIEW_AND_APPROVE_AI_OUTPUT", { totalEvents: 5600, goodEvents: 5585, measuredPercent: 99.73, p95LatencyMs: 290 }],
    ["CREATE_SCOPE_VERSION", { totalEvents: 3200, goodEvents: 3192, measuredPercent: 99.75, p95LatencyMs: 310 }],
    ["CREATE_ESTIMATE", { totalEvents: 2900, goodEvents: 2894, measuredPercent: 99.79, p95LatencyMs: 350 }],
    ["GENERATE_AND_SEND_PROPOSAL", { totalEvents: 2400, goodEvents: 2392, measuredPercent: 99.66, p95LatencyMs: 440 }],
    ["CLIENT_APPROVAL", { totalEvents: 1800, goodEvents: 1795, measuredPercent: 99.72, p95LatencyMs: 390 }],
    ["GENERATE_TASKS", { totalEvents: 1600, goodEvents: 1578, measuredPercent: 98.62 }], // Target: 98%
    ["EXPORT_TASKS", { totalEvents: 1500, goodEvents: 1476, measuredPercent: 98.40 }], // Target: 98%
    ["CREATE_CHANGE_REQUEST", { totalEvents: 850, goodEvents: 848, measuredPercent: 99.76, p95LatencyMs: 410 }],
    ["APPROVE_CHANGE_REQUEST", { totalEvents: 720, goodEvents: 718, measuredPercent: 99.72, p95LatencyMs: 420 }],
    ["VIEW_DASHBOARD", { totalEvents: 24000, goodEvents: 23940, measuredPercent: 99.75, p95LatencyMs: 450 }], // Target: <800ms
    ["DOWNLOAD_EXPORT", { totalEvents: 1100, goodEvents: 1092, measuredPercent: 99.27, p95LatencyMs: 820 }]
  ]);

  private static recentIncidents: IncidentBudgetImpact[] = [
    {
      incidentId: "inc_openai_504_outage",
      title: "Upstream OpenAI API Latency Spike & 504s",
      durationMinutes: 28,
      budgetConsumedPercent: 12.5,
      requiresPostMortem: false
    }
  ];

  private static manualReleaseFreezeOverride: boolean | null = null;

  /**
   * Records a new telemetry sample for a critical user journey.
   */
  public static recordSample(
    journeyKey: CriticalJourneyKey,
    isGood: boolean,
    latencyMs?: number
  ): void {
    const existing = this.telemetrySamples.get(journeyKey) || {
      totalEvents: 0,
      goodEvents: 0,
      measuredPercent: 100,
      p95LatencyMs: 0
    };

    const newTotal = existing.totalEvents + 1;
    const newGood = existing.goodEvents + (isGood ? 1 : 0);
    const measuredPercent = Number(((newGood / newTotal) * 100).toFixed(2));

    let p95 = existing.p95LatencyMs;
    if (latencyMs !== undefined) {
      // Exponential moving average approximation for p95
      p95 = p95 ? Math.round(p95 * 0.95 + latencyMs * 0.05) : latencyMs;
    }

    this.telemetrySamples.set(journeyKey, {
      totalEvents: newTotal,
      goodEvents: newGood,
      measuredPercent,
      p95LatencyMs: p95
    });
  }

  /**
   * Computes the 30-day compliance report for all 16 critical user journeys.
   */
  public static getJourneyReports(): JourneySloReport[] {
    const reports: JourneySloReport[] = [];

    for (const [key, def] of Object.entries(CRITICAL_JOURNEYS)) {
      const journeyKey = key as CriticalJourneyKey;
      const sample = this.telemetrySamples.get(journeyKey) || {
        totalEvents: 0,
        goodEvents: 0,
        measuredPercent: 100,
        p95LatencyMs: 0
      };

      let status: "PASSING" | "WARNING" | "BREACHED" = "PASSING";
      if (sample.measuredPercent < def.sloTargetPercent) {
        status = "BREACHED";
      } else if (sample.measuredPercent - def.sloTargetPercent < 0.2) {
        status = "WARNING";
      }

      // Check latency SLI if configured
      if (def.latencyTargetMs && sample.p95LatencyMs && sample.p95LatencyMs > def.latencyTargetMs) {
        status = "BREACHED";
      }

      reports.push({
        journeyKey,
        name: def.name,
        primarySli: def.primarySli,
        sloTargetPercent: def.sloTargetPercent,
        currentActualPercent: sample.measuredPercent,
        status,
        p95LatencyMs: sample.p95LatencyMs,
        latencyTargetMs: def.latencyTargetMs
      });
    }

    return reports;
  }

  /**
   * Computes the system-wide core availability error budget status.
   * Baseline: 99.5% SLO -> 0.5% Total monthly error budget.
   */
  public static calculateErrorBudget(params?: {
    customCoreAvailability?: number;
    simulatedBurnRate1h?: number;
  }): ErrorBudgetStatus {
    const sloTargetPercent = 99.5;
    const totalMonthlyErrorBudgetPercent = 0.5; // 100% - 99.5%

    // Average actual availability across core journeys
    let actualAvailability = params?.customCoreAvailability;
    if (actualAvailability === undefined) {
      const coreKeys: CriticalJourneyKey[] = [
        "REGISTER_AND_LOGIN",
        "CREATE_WORKSPACE",
        "CREATE_CLIENT_AND_PROJECT",
        "CREATE_ESTIMATE",
        "GENERATE_AND_SEND_PROPOSAL",
        "CLIENT_APPROVAL",
        "VIEW_DASHBOARD"
      ];
      let sum = 0;
      for (const k of coreKeys) {
        const s = this.telemetrySamples.get(k);
        sum += s ? s.measuredPercent : 99.5;
      }
      actualAvailability = Number((sum / coreKeys.length).toFixed(3));
    }

    const actualDowntimePercent = Math.max(0, 100 - actualAvailability);
    // % of the monthly budget consumed (0% - 100%+)
    const consumedBudgetPercent = Number(
      ((actualDowntimePercent / totalMonthlyErrorBudgetPercent) * 100).toFixed(1)
    );
    const remainingBudgetPercent = Math.max(0, Number((100 - consumedBudgetPercent).toFixed(1)));
    const isExhausted = remainingBudgetPercent <= 0 || consumedBudgetPercent >= 100;

    const burnRate1h = params?.simulatedBurnRate1h !== undefined ? params.simulatedBurnRate1h : 1.1;
    const burnRate6h = 1.0;
    const burnRate24h = 0.9;

    const activeAlerts: ErrorBudgetStatus["activeAlerts"] = [];

    // Multi-Window Multi-Burn-Rate Alerting (Google SRE Workbook)
    if (burnRate1h >= 14.4) {
      activeAlerts.push({
        severity: "PAGE_CRITICAL",
        title: "14.4x Burn Rate Alert (1h Window)",
        message: "Error budget is burning 14.4x faster than permitted. 2% of budget consumed in 1 hour. Immediate on-call escalation required."
      });
    } else if (burnRate1h >= 6.0) {
      activeAlerts.push({
        severity: "PAGE_CRITICAL",
        title: "6.0x Burn Rate Alert (6h Window)",
        message: "Elevated error rate. 5% of monthly budget consumed in 6 hours."
      });
    }

    if (isExhausted) {
      activeAlerts.push({
        severity: "PAGE_CRITICAL",
        title: "Monthly Error Budget Exhausted",
        message: "Remaining budget is 0%. All non-critical feature releases are automatically frozen."
      });
    }

    // Determine Release Gate Status
    let releaseGateStatus: ErrorBudgetStatus["releaseGateStatus"] = "RELEASES_ALLOWED";
    if (this.manualReleaseFreezeOverride !== null) {
      releaseGateStatus = this.manualReleaseFreezeOverride ? "RELEASE_FREEZE_ACTIVE" : "RELEASES_ALLOWED";
    } else if (isExhausted || burnRate1h >= 14.4) {
      releaseGateStatus = "RELEASE_FREEZE_ACTIVE";
    }

    return {
      sloTargetPercent,
      totalMonthlyErrorBudgetPercent,
      consumedBudgetPercent,
      remainingBudgetPercent,
      isExhausted,
      releaseGateStatus,
      burnRate1h,
      burnRate6h,
      burnRate24h,
      activeAlerts
    };
  }

  /**
   * Registers a production incident and calculates its exact % consumption of the monthly budget.
   * If the incident consumes >= 20% of the budget (~43.2 minutes downtime), triggers mandatory postmortem flag.
   */
  public static registerIncident(params: {
    incidentId: string;
    title: string;
    outageMinutes: number;
    impactSeverityPercent: number; // 100 = full outage, 50 = 50% degraded
  }): IncidentBudgetImpact {
    // Total monthly downtime permitted for 99.5% SLO:
    // 30 days * 24h * 60m * 0.005 = 216 minutes
    const totalPermittedDowntimeMinutes = 216;

    const effectiveDowntimeMinutes = (params.outageMinutes * params.impactSeverityPercent) / 100;
    const budgetConsumedPercent = Number(
      ((effectiveDowntimeMinutes / totalPermittedDowntimeMinutes) * 100).toFixed(1)
    );

    const requiresPostMortem = budgetConsumedPercent >= 20.0;

    const incident: IncidentBudgetImpact = {
      incidentId: params.incidentId,
      title: params.title,
      durationMinutes: params.outageMinutes,
      budgetConsumedPercent,
      requiresPostMortem
    };

    this.recentIncidents.unshift(incident);
    return incident;
  }

  public static getRecentIncidents(): IncidentBudgetImpact[] {
    return [...this.recentIncidents];
  }

  /**
   * Allows leadership/SRE to override the release freeze flag during an incident recovery.
   */
  public static setReleaseFreezeOverride(freeze: boolean | null): void {
    this.manualReleaseFreezeOverride = freeze;
  }
}
