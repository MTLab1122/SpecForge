import { NextRequest, NextResponse } from "next/server";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    const cohortData = AnalyticsEngine.calculateCohortRetention();

    return NextResponse.json({
      success: true,
      organizationId,
      ...cohortData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate cohort analysis" },
      { status: 500 }
    );
  }
}
