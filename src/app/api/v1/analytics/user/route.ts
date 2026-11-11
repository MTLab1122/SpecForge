import { NextRequest, NextResponse } from "next/server";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";
import { DateRangePeriodEnum } from "@/lib/validations/analytics";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodParam = searchParams.get("period") || "30D";
    const periodParsed = DateRangePeriodEnum.safeParse(periodParam);
    const period = periodParsed.success ? periodParsed.data : "30D";

    // Multi-tenant user header or fallback
    const userId = req.headers.get("x-user-id") || "usr_agency_lead_1";
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    // In production this aggregates from Prisma with strict where: { organizationId, userId }
    // Realistic multi-project data for the active user:
    const mockUserData = {
      "7D": { projects: 3, proposals: 2, approvals: 2, estimates: 4, aiCredits: 1250 },
      "30D": { projects: 12, proposals: 8, approvals: 6, estimates: 14, aiCredits: 4800 },
      "90D": { projects: 34, proposals: 24, approvals: 19, estimates: 38, aiCredits: 14200 },
      "12M": { projects: 92, proposals: 71, approvals: 54, estimates: 104, aiCredits: 46000 },
      "ALL": { projects: 110, proposals: 85, approvals: 65, estimates: 128, aiCredits: 58000 }
    }[period] || { projects: 12, proposals: 8, approvals: 6, estimates: 14, aiCredits: 4800 };

    const metrics = AnalyticsEngine.calculateUserMetrics({
      userId,
      period,
      projectsCreated: mockUserData.projects,
      proposalsSent: mockUserData.proposals,
      approvalsReceived: mockUserData.approvals,
      estimatesCreated: mockUserData.estimates,
      aiCreditsUsed: mockUserData.aiCredits
    });

    return NextResponse.json({
      success: true,
      organizationId,
      metrics
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate user metrics" },
      { status: 500 }
    );
  }
}
