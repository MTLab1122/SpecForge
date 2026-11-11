import { withReliability } from "@/lib/reliability/api-guard";
import { SloTracker, CriticalJourneyKey } from "@/lib/reliability/slo-tracker";
import { AuditLogger } from "@/lib/reliability/observability";

export const GET = withReliability(async (req) => {
  const journeys = SloTracker.getJourneyReports();
  const errorBudget = SloTracker.calculateErrorBudget();
  const incidents = SloTracker.getRecentIncidents();

  return Response.json({
    success: true,
    data: {
      overview: {
        totalJourneysTracked: journeys.length,
        passingJourneys: journeys.filter((j) => j.status === "PASSING").length,
        warningJourneys: journeys.filter((j) => j.status === "WARNING").length,
        breachedJourneys: journeys.filter((j) => j.status === "BREACHED").length,
        releaseGateStatus: errorBudget.releaseGateStatus,
        remainingErrorBudgetPercent: errorBudget.remainingBudgetPercent
      },
      errorBudget,
      journeys,
      incidents,
      evaluatedAt: new Date().toISOString()
    }
  });
});

export const POST = withReliability(
  async (req, ctx) => {
    const body = await req.json();
    const { action, journeyKey, isGood, latencyMs, freezeOverride, incident } = body;

    if (action === "RECORD_SAMPLE") {
      if (!journeyKey) {
        return Response.json(
          { success: false, error: "journeyKey is required" },
          { status: 400 }
        );
      }

      SloTracker.recordSample(journeyKey as CriticalJourneyKey, Boolean(isGood), latencyMs);

      return Response.json({
        success: true,
        message: `Recorded sample for ${journeyKey}`
      });
    }

    if (action === "SET_RELEASE_FREEZE_OVERRIDE") {
      const overrideVal = freezeOverride === null ? null : Boolean(freezeOverride);
      SloTracker.setReleaseFreezeOverride(overrideVal);

      await AuditLogger.record({
        organizationId: ctx.organizationId || "system",
        userId: ctx.userId || "admin",
        action: "SLO_RELEASE_FREEZE_OVERRIDE_CHANGED",
        entityName: "RELEASE_GATE",
        entityId: "global_gate",
        metadata: { freezeOverride: overrideVal }
      });

      return Response.json({
        success: true,
        message: `Release freeze override set to ${overrideVal}`,
        releaseGateStatus: SloTracker.calculateErrorBudget().releaseGateStatus
      });
    }

    if (action === "REGISTER_INCIDENT") {
      if (!incident || !incident.incidentId || !incident.outageMinutes) {
        return Response.json(
          { success: false, error: "incident with incidentId and outageMinutes is required" },
          { status: 400 }
        );
      }

      const impact = SloTracker.registerIncident({
        incidentId: incident.incidentId,
        title: incident.title || "Production Incident",
        outageMinutes: Number(incident.outageMinutes),
        impactSeverityPercent: Number(incident.impactSeverityPercent || 100)
      });

      await AuditLogger.record({
        organizationId: ctx.organizationId || "system",
        userId: ctx.userId || "admin",
        action: "SLO_INCIDENT_REGISTERED",
        entityName: "INCIDENT",
        entityId: impact.incidentId,
        metadata: {
          budgetConsumedPercent: impact.budgetConsumedPercent,
          requiresPostMortem: impact.requiresPostMortem
        }
      });

      return Response.json({
        success: true,
        impact,
        errorBudget: SloTracker.calculateErrorBudget()
      });
    }

    return Response.json(
      { success: false, error: "Unknown action. Supported: RECORD_SAMPLE, SET_RELEASE_FREEZE_OVERRIDE, REGISTER_INCIDENT" },
      { status: 400 }
    );
  },
  { requireTenant: false }
);
