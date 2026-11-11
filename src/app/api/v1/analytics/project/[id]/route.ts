import { NextRequest, NextResponse } from "next/server";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    // Strict multi-tenant verification would ensure project belongs to organizationId
    const projectMetrics = AnalyticsEngine.calculateProjectMetrics({
      projectId,
      projectTitle: "SaaS Client Portal & Enterprise Workflow Suite",
      scopeCompletenessScore: 94,
      estimatedHours: 140,
      actualHours: 146,
      sentAt: "2026-10-15T09:00:00Z",
      approvedAt: "2026-10-16T18:30:00Z", // ~33.5h turnaround
      changeRequests: [
        { costImpact: 2400 },
        { costImpact: 1200 }
      ],
      completedTasksCount: 38,
      totalTasksCount: 45,
      invoicedAmount: 28500,
      paidAmount: 20000,
      currency: "USD"
    });

    return NextResponse.json({
      success: true,
      organizationId,
      metrics: projectMetrics
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate project metrics" },
      { status: 500 }
    );
  }
}
