import { NextRequest, NextResponse } from "next/server";
import { AnalyticsEngine } from "@/lib/analytics/analytics-engine";

export async function GET(req: NextRequest) {
  try {
    const organizationId = req.headers.get("x-organization-id") || "org_apex_digital";

    // Computes the 8-stage activation and commercial funnel
    const stages = AnalyticsEngine.calculateFunnelAnalysis();

    return NextResponse.json({
      success: true,
      organizationId,
      stages
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to calculate funnel analysis" },
      { status: 500 }
    );
  }
}
